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
- 拖出屏幕边缘时切到相邻屏幕，从它靠近来向的一侧进入；切屏后需重新按住再拖
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

# 拖出屏幕时，字幕进入相邻屏幕后离边缘保留的距离
HANDOFF_MARGIN = 24

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

        self.window.connect("size-allocate", lambda *_: self.overlay.update_input_regions())
        self.window.connect("destroy", Gtk.main_quit)
        self.window.show_all()
        self.secondary_label.set_visible(False)

    def geometry(self):
        geo = self.monitor.get_geometry()
        return geo.x, geo.y, geo.width, geo.height

    def size(self):
        allocation = self.window.get_allocation()
        _x, _y, width, height = self.geometry()
        return allocation.width or width or 1920, allocation.height or height or 1080

    def set_text(self, current, secondary):
        self.current_label.set_text(current)
        self.secondary_label.set_text(secondary)
        self.secondary_label.set_visible(bool(secondary))

    def place(self, x, y):
        self.fixed.move(self.event_box, int(x), int(y))

    # ---------- 拖动 ----------

    def on_drag_begin(self, _gesture, _start_x, _start_y):
        if self.overlay.locked or self.overlay.dragging:
            return
        self.overlay.begin_drag(self)

    def on_drag_update(self, _gesture, offset_x, offset_y):
        if self.overlay.drag_layer is not self:
            return
        self.overlay.drag_by(offset_x, offset_y)

    def on_drag_end(self, _gesture, _offset_x, _offset_y):
        # 切屏时手势被主动取消，drag_layer 已清空，这里不再处理
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
        self.drag_start = None
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
        self.layer.place(self.pos_x, self.pos_y)
        self.apply_visibility()

        GLib.idle_add(self.update_input_regions)
        GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, signal.SIGTERM, self.quit)
        GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, signal.SIGINT, self.quit)

    # ---------- 输入区域 ----------

    def update_input_regions(self):
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
                allocation = layer.event_box.get_allocation()
                region = cairo.Region(
                    cairo.RectangleInt(
                        self.pos_x, self.pos_y, max(allocation.width, 1), max(allocation.height, 1)
                    )
                )
            gdk_window.input_shape_combine_region(region, 0, 0)
        return False

    def apply_visibility(self):
        """字幕只有一份：当前屏幕显示文字，其余屏幕清空并隐藏。"""
        if not getattr(self, "layers", None) or not getattr(self, "layer", None):
            return
        for layer in self.layers:
            active = layer is self.layer
            layer.event_box.set_visible(active)
            layer.set_text(self.text_current if active else "", self.text_secondary if active else "")
            if active:
                layer.place(self.pos_x, self.pos_y)

    # ---------- 拖动 ----------

    def begin_drag(self, layer):
        self.drag_start = (self.pos_x, self.pos_y)
        self.dragging = True
        self.drag_layer = layer

    def drag_by(self, offset_x, offset_y):
        if not self.dragging or self.drag_start is None:
            return
        start_x, start_y = self.drag_start
        self.move_to(start_x + int(offset_x), start_y + int(offset_y))

    def end_drag(self):
        if not self.dragging:
            return
        self.dragging = False
        self.drag_layer = None
        self.drag_start = None
        self.config["x"] = self.pos_x
        self.config["y"] = self.pos_y
        self.config["monitor"] = self.layer.index
        save_config(self.config)
        self.update_input_regions()

    def move_to(self, x, y):
        while True:
            width, height = self.layer.size()
            max_x = max(0, width - 120)
            max_y = max(0, height - 48)
            target = self.neighbor_towards(x, y, width, height)
            if target is None:
                self.pos_x = max(0, min(int(x), max_x))
                self.pos_y = max(0, min(int(y), max_y))
                break
            x, y = self.handoff(target, x, y, width, height)
        self.layer.place(self.pos_x, self.pos_y)
        if not self.dragging:
            self.update_input_regions()

    def handoff(self, target, x, y, width, height):
        """切到相邻屏幕，字幕贴着被拖出去的那条边进入。

        手势的偏移量跟发起它的那块屏幕绑定，换屏幕后继续用会把字幕拽回去，
        所以这里结束本次拖动：松开后在新屏幕上重新按住即可继续。"""
        origin_x, origin_y, _w, _h = self.layer.geometry()
        target_x, target_y, target_w, target_h = target.geometry()
        # 沿被拖出的轴贴边进入，另一轴按全局坐标对齐，这样上下/左右排列的屏幕都自然
        if x < 0:
            new_x = target_w - HANDOFF_MARGIN
        elif x > width:
            new_x = HANDOFF_MARGIN
        else:
            new_x = (origin_x + x) - target_x
        if y < 0:
            new_y = target_h - HANDOFF_MARGIN
        elif y > height:
            new_y = HANDOFF_MARGIN
        else:
            new_y = (origin_y + y) - target_y
        previous = self.layer
        self.layer = target
        previous.event_box.set_visible(False)
        previous.set_text("", "")
        # 字幕只有一份，切屏后立刻放到新屏幕上，旧屏幕那份已经清空
        target.event_box.set_visible(True)
        target.set_text(self.text_current, self.text_secondary)
        self.dragging = False
        self.drag_start = None
        # 取消旧手势，否则松手时它还会再报一次 drag-end
        if self.drag_layer is not None:
            self.drag_layer.gesture.set_state(Gtk.EventSequenceState.DENIED)
            self.drag_layer = None
        self.update_input_regions()
        return new_x, new_y

    def neighbor_towards(self, x, y, width, height):
        """拖动目标越出本屏幕哪条边，就返回该方向上最近的一块屏幕。"""
        dx = -1 if x < 0 else (1 if x > width else 0)
        dy = -1 if y < 0 else (1 if y > height else 0)
        if dx == 0 and dy == 0:
            return None
        origin_x, origin_y, _w, _h = self.layer.geometry()
        best = None
        best_distance = None
        for layer in self.layers:
            if layer is self.layer:
                continue
            other_x, other_y, _ow, _oh = layer.geometry()
            if dx and (other_x - origin_x) * dx <= 0:
                continue
            if dy and (other_y - origin_y) * dy <= 0:
                continue
            distance = abs(other_x - origin_x) + abs(other_y - origin_y)
            if best_distance is None or distance < best_distance:
                best = layer
                best_distance = distance
        return best

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
