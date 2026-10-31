#!/usr/bin/env python3
"""BetterNCM 桌面歌词覆盖层（Wayland / wlr-layer-shell）。

Windows 版网易云的 desktop_lyric_window 用分层窗口 + 置顶 + 锁定穿透实现；
这里是 Linux 的等价物：layer-shell 的 OVERLAY 层，niri 与 KWin Plasma 6 都支持。

要点：
- 每块显示器一个全屏透明层，但字幕始终只有一份（当前行 + 副行），只画在它所在的那块屏幕上
- 同一时刻只有这一份字幕接收输入，其余屏幕完全穿透
- 锁定后全部图层点击穿透，只能从主程序解锁
- 拖动把手势挂在「不动的全屏窗口」上，用 gesture 偏移计算位移
  （Wayland 不给全局指针坐标，窗口一动局部坐标就被抵消）
- 位移按全局坐标计算：按住拖动时字幕跟着指针连续跨屏，不需要松手重按
- 位置（含所在屏幕）/ 锁定 / 字号持久化到 ~/.config/BetterNCM/desktop-lyrics.json

协议：stdin 每行一个 JSON
  {"cmd":"state","current":"...","secondary":"...","playing":true}
  {"cmd":"theme","font":28,"color":"#ffffff"}
  {"cmd":"lock","value":true}
  {"cmd":"show"} / {"cmd":"hide"}
  {"cmd":"quit"}
"""

import json
import os
import signal
import sys
import threading

import gi

gi.require_version("Gdk", "3.0")
gi.require_version("Gtk", "3.0")
gi.require_version("GtkLayerShell", "0.1")
import cairo  # noqa: E402
from gi.repository import Gdk, GLib, Gtk, GtkLayerShell  # noqa: E402

CONFIG_DIR = os.path.join(
    os.environ.get("XDG_CONFIG_HOME", os.path.expanduser("~/.config")), "BetterNCM"
)
CONFIG_PATH = os.path.join(CONFIG_DIR, "desktop-lyrics.json")

DEFAULT_CONFIG = {"x": 160, "y": 640, "monitor": 0, "locked": False, "font": 30}

# 字幕最多可以拖到距离屏幕边缘这么近，保证还剩一部分可见、能继续抓住
MIN_VISIBLE_WIDTH = 120
MIN_VISIBLE_HEIGHT = 48
# 点击区域比文字稍大一点，免得没点准就拖不动
HIT_PADDING = 6

BASE_CSS = """
window { background: transparent; }
#lyric {
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.45);
}
#secondary {
  color: rgba(255,255,255,0.8);
  text-shadow: 0 1px 5px rgba(0,0,0,0.5);
}
"""


def build_css(size):
    size = int(size)
    secondary = max(12, int(size * 0.62))
    return (
        BASE_CSS
        + f"#lyric {{ font-size: {size}px; font-weight: 600; }}\n"
        + f"#secondary {{ font-size: {secondary}px; }}\n"
    )


def load_config():
    config = dict(DEFAULT_CONFIG)
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as handle:
            stored = json.load(handle)
        for key in config:
            if key in stored:
                config[key] = stored[key]
    except Exception:
        pass
    return config


def save_config(config):
    try:
        os.makedirs(CONFIG_DIR, exist_ok=True)
        with open(CONFIG_PATH, "w", encoding="utf-8") as handle:
            json.dump(config, handle)
    except Exception:
        pass


def font_family_css():
    return (
        "window, #lyric, #secondary {"
        " font-family: 'Noto Sans CJK SC','Noto Sans SC','MiSans',sans-serif; }"
    )


class ScreenLayer:
    """一块显示器上的全屏透明层。窗口本身永远不动，字幕在里面用 Fixed 移动。"""

    def __init__(self, overlay, monitor, index):
        self.overlay = overlay
        self.monitor = monitor
        self.index = index

        self.window = Gtk.Window(type=Gtk.WindowType.TOPLEVEL)
        self.window.set_decorated(False)
        self.window.set_app_paintable(True)
        self.window.set_skip_taskbar_hint(True)
        visual = self.window.get_screen().get_rgba_visual()
        if visual is not None:
            self.window.set_visual(visual)

        GtkLayerShell.init_for_window(self.window)
        try:
            GtkLayerShell.set_namespace(self.window, "betterncm-lyrics")
        except Exception:
            pass
        GtkLayerShell.set_layer(self.window, GtkLayerShell.Layer.OVERLAY)
        for edge in (
            GtkLayerShell.Edge.TOP,
            GtkLayerShell.Edge.BOTTOM,
            GtkLayerShell.Edge.LEFT,
            GtkLayerShell.Edge.RIGHT,
        ):
            GtkLayerShell.set_anchor(self.window, edge, True)
        GtkLayerShell.set_exclusive_zone(self.window, -1)
        GtkLayerShell.set_keyboard_mode(self.window, GtkLayerShell.KeyboardMode.NONE)
        # 钉死在这块显示器上：不指定的话合成器只把它放到一块屏幕
        GtkLayerShell.set_monitor(self.window, monitor)

        self.fixed = Gtk.Fixed()
        self.window.add(self.fixed)

        self.box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        self.event_box = Gtk.EventBox()
        self.event_box.set_visible_window(False)
        self.event_box.add(self.box)
        self.fixed.put(self.event_box, 0, 0)

        self.current_label = Gtk.Label(label="")
        self.current_label.set_name("lyric")
        self.current_label.set_xalign(0.0)
        self.secondary_label = Gtk.Label(label="")
        self.secondary_label.set_name("secondary")
        self.secondary_label.set_xalign(0.0)
        self.box.pack_start(self.current_label, False, False, 0)
        self.box.pack_start(self.secondary_label, False, False, 0)

        # 手势挂在 window 上：window 永远不动，偏移量就是真实位移
        self.gesture = Gtk.GestureDrag.new(self.window)
        self.gesture.connect("drag-begin", self.on_drag_begin)
        self.gesture.connect("drag-update", self.on_drag_update)
        self.gesture.connect("drag-end", self.on_drag_end)
        # 手势被合成器取消时也要复位，否则 dragging 卡住会让输入区域一直不更新
        self.gesture.connect("cancel", self.on_drag_cancel)

        self.window.connect("size-allocate", lambda *_: self.overlay.update_input_regions())
        self.window.connect("destroy", Gtk.main_quit)
        self.window.show_all()
        self.secondary_label.set_visible(False)

    def geometry(self):
        geo = self.monitor.get_geometry()
        return geo.x, geo.y, geo.width, geo.height

    def set_text(self, current, secondary):
        self.current_label.set_text(current)
        self.secondary_label.set_text(secondary)
        self.secondary_label.set_visible(bool(secondary))

    def hit_size(self):
        """字幕当前的绘制尺寸。

        用首选尺寸而不是 allocation：文字刚换过时 allocation 还没重新布局，
        据此设置输入区域会出现「刚拖完一会儿抓不住」的情况。"""
        width = self.event_box.get_preferred_width()[1]
        height = self.event_box.get_preferred_height()[1]
        return max(width, 1), max(height, 1)

    def place(self, x, y):
        self.fixed.move(self.event_box, int(x), int(y))

    # ---------- 拖动 ----------

    def on_drag_begin(self, _gesture, _start_x, _start_y):
        if self.overlay.locked:
            return
        if self.overlay.dragging:
            # 上一次手势没收到结束信号时先复位，否则 dragging 会一直卡住
            self.overlay.end_drag()
        self.overlay.begin_drag(self)

    def on_drag_update(self, _gesture, offset_x, offset_y):
        if self.overlay.drag_layer is not self:
            return
        self.overlay.drag_by(offset_x, offset_y)

    def on_drag_end(self, _gesture, _offset_x, _offset_y):
        if self.overlay.drag_layer is not self:
            return
        self.overlay.end_drag()

    def on_drag_cancel(self, _gesture, _sequence):
        if self.overlay.drag_layer is not self:
            return
        self.overlay.end_drag()


class Overlay:
    def __init__(self):
        self.config = load_config()
        self.locked = bool(self.config["locked"])
        self.playing = True
        self.text_current = ""
        self.text_secondary = ""
        self.pos_x = int(self.config["x"])
        self.pos_y = int(self.config["y"])
        self.drag_origin = None
        self.dragging = False
        self.drag_layer = None

        self.provider = Gtk.CssProvider()
        Gtk.StyleContext.add_provider_for_screen(
            Gdk.Screen.get_default(), self.provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        )
        self.apply_font()

        display = Gdk.Display.get_default()
        count = display.get_n_monitors() if display is not None else 0
        self.layers = [ScreenLayer(self, display.get_monitor(i), i) for i in range(count)]
        if not self.layers:
            raise RuntimeError("没有可用的显示器")

        saved = int(self.config.get("monitor", 0))
        self.layer = self.layers[saved] if 0 <= saved < len(self.layers) else self.layers[0]
        # 显示器数量或排列变了时，旧坐标可能落在屏幕外
        self.pos_x, self.pos_y = self.clamp_to_layer(self.layer, self.pos_x, self.pos_y)
        self.layer.place(self.pos_x, self.pos_y)
        self.apply_visibility()

        GLib.idle_add(self.update_input_regions)
        GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, signal.SIGTERM, self.quit)
        GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, signal.SIGINT, self.quit)

    # ---------- 输入区域 ----------

    def update_input_regions(self):
        # 拖动中改输入区域会让合成器结束隐式抓取，跨屏后手势就断了
        # （清空旧屏文字触发的 size-allocate 也会走到这里）；松手后 end_drag 再统一更新
        if self.dragging:
            return False
        # 建层期间 size-allocate 就会触发，此时层列表还没就绪
        if not getattr(self, "layers", None) or not getattr(self, "layer", None):
            return False
        for layer in self.layers:
            gdk_window = layer.window.get_window()
            if gdk_window is None:
                continue
            if self.locked or layer is not self.layer:
                region = cairo.Region()
            else:
                width, height = layer.hit_size()
                region = cairo.Region(
                    cairo.RectangleInt(
                        self.pos_x - HIT_PADDING,
                        self.pos_y - HIT_PADDING,
                        width + HIT_PADDING * 2,
                        height + HIT_PADDING * 2,
                    )
                )
            gdk_window.input_shape_combine_region(region, 0, 0)
        return False

    def apply_visibility(self):
        """字幕只有一份：当前屏幕显示文字，其余屏幕清空。

        控件本身始终可见（空标签不占空间）；拖动中切换可见性会打断手势。"""
        if not getattr(self, "layers", None) or not getattr(self, "layer", None):
            return
        for layer in self.layers:
            active = layer is self.layer
            layer.set_text(self.text_current if active else "", self.text_secondary if active else "")
            if active:
                layer.place(self.pos_x, self.pos_y)

    # ---------- 拖动 ----------

    def begin_drag(self, layer):
        origin_x, origin_y, _w, _h = self.layer.geometry()
        self.drag_origin = (origin_x + self.pos_x, origin_y + self.pos_y)
        self.dragging = True
        self.drag_layer = layer

    def drag_by(self, offset_x, offset_y):
        if not self.dragging or self.drag_origin is None:
            return
        # 手势偏移量是相对按下点的全局位移；按住拖动时即使指针跨到别的显示器，
        # 合成器仍会把越界的坐标发给发起手势的那块窗口，所以可以直接连续跨屏
        global_x = self.drag_origin[0] + int(offset_x)
        global_y = self.drag_origin[1] + int(offset_y)
        self.move_global(global_x, global_y)

    def end_drag(self):
        if not self.dragging:
            return
        self.dragging = False
        self.drag_layer = None
        self.drag_origin = None
        self.config["x"] = self.pos_x
        self.config["y"] = self.pos_y
        self.config["monitor"] = self.layer.index
        save_config(self.config)
        self.update_input_regions()
        # 松手后 GTK 可能还会重排一次，补一次刷新，保证新屏上的文字立刻能抓住
        GLib.idle_add(self.update_input_regions)

    def clamp_to_layer(self, layer, x, y):
        _ox, _oy, width, height = layer.geometry()
        max_x = max(0, width - MIN_VISIBLE_WIDTH)
        max_y = max(0, height - MIN_VISIBLE_HEIGHT)
        return max(0, min(int(x), max_x)), max(0, min(int(y), max_y))

    def layer_at(self, global_x, global_y):
        """返回全局坐标所在的显示器；落在屏幕之间的空隙时取最近的一块。"""
        best = None
        best_distance = None
        for layer in self.layers:
            x, y, width, height = layer.geometry()
            dx = 0 if x <= global_x <= x + width else min(
                abs(global_x - x), abs(global_x - (x + width))
            )
            dy = 0 if y <= global_y <= y + height else min(
                abs(global_y - y), abs(global_y - (y + height))
            )
            distance = dx * dx + dy * dy
            if distance == 0:
                return layer
            if best_distance is None or distance < best_distance:
                best = layer
                best_distance = distance
        return best or self.layer

    def layout_bounds(self):
        left = min(layer.geometry()[0] for layer in self.layers)
        top = min(layer.geometry()[1] for layer in self.layers)
        right = max(layer.geometry()[0] + layer.geometry()[2] for layer in self.layers)
        bottom = max(layer.geometry()[1] + layer.geometry()[3] for layer in self.layers)
        return left, top, right, bottom

    def move_global(self, global_x, global_y):
        target = self.layer_at(global_x, global_y)
        target_x, target_y, target_w, target_h = target.geometry()
        local_x = global_x - target_x
        local_y = global_y - target_y
        if 0 <= local_x < target_w and 0 <= local_y < target_h:
            # 字幕落在某块屏幕内就严格跟随指针；只有整体布局的外边缘才限制最小可见，
            # 屏与屏之间不钳制，跨屏时才不会在边界处跳一下
            _left, _top, right, bottom = self.layout_bounds()
            global_x = min(global_x, right - MIN_VISIBLE_WIDTH)
            global_y = min(global_y, bottom - MIN_VISIBLE_HEIGHT)
            local_x = max(0, global_x - target_x)
            local_y = max(0, global_y - target_y)
        else:
            local_x, local_y = self.clamp_to_layer(target, local_x, local_y)
        if target is not self.layer:
            previous = self.layer
            self.layer = target
            # 只换文字，不动控件可见性：拖动中隐藏发起手势那块窗口的子控件会让
            # GTK 结束这次手势，跨屏后指针位移就收不到了。先画新屏再清旧屏，减少闪烁。
            target.set_text(self.text_current, self.text_secondary)
            previous.set_text("", "")
        self.pos_x, self.pos_y = local_x, local_y
        target.place(local_x, local_y)
        # 拖动中不要改输入区域：清空发起手势那块窗口的 input region 会让合成器
        # 结束隐式抓取，跨屏后手势就收不到后续位移了。松手时 end_drag 再统一更新。
        if not self.dragging:
            self.update_input_regions()

    # ---------- 样式 ----------

    def apply_font(self):
        size = int(self.config.get("font", 30))
        css = build_css(size) + font_family_css()
        self.provider.load_from_data(css.encode("utf-8"))

    # ---------- 命令 ----------

    def handle(self, payload):
        cmd = payload.get("cmd")
        if cmd == "state":
            self.text_current = payload.get("current") or ""
            self.text_secondary = payload.get("secondary") or ""
            self.playing = bool(payload.get("playing", True))
            for layer in self.layers:
                layer.window.set_opacity(1.0 if self.playing else 0.55)
            self.apply_visibility()
            GLib.idle_add(self.update_input_regions)
        elif cmd == "theme":
            if "font" in payload:
                self.config["font"] = int(payload["font"])
                self.apply_font()
                save_config(self.config)
                GLib.idle_add(self.update_input_regions)
        elif cmd == "lock":
            self.locked = bool(payload.get("value"))
            self.config["locked"] = self.locked
            save_config(self.config)
            self.update_input_regions()
        elif cmd == "show":
            for layer in self.layers:
                layer.window.show_all()
            # show_all 会把隐藏的那一份也重新显示出来，这里再收成一份
            self.apply_visibility()
            GLib.idle_add(self.update_input_regions)
        elif cmd == "hide":
            for layer in self.layers:
                layer.window.hide()
        elif cmd == "quit":
            self.quit()
        return False

    def quit(self):
        save_config(self.config)
        Gtk.main_quit()
        return False


def read_stdin(overlay):
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
        except Exception as error:  # noqa: BLE001
            print(f"lyrics-overlay: bad json {line!r}: {error}", file=sys.stderr, flush=True)
            continue
        GLib.idle_add(overlay.handle, payload)
    GLib.idle_add(overlay.quit)


def main():
    overlay = Overlay()
    threading.Thread(target=read_stdin, args=(overlay,), daemon=True).start()
    Gtk.main()


if __name__ == "__main__":
    main()
