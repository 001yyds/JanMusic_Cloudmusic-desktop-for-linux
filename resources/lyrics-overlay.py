#!/usr/bin/env python3
"""JanMusic 桌面歌词覆盖层（Wayland / wlr-layer-shell）。

Windows 版网易云的 desktop_lyric_window 用分层窗口 + 置顶 + 锁定穿透实现；
这里是 Linux 的等价物：layer-shell 的 OVERLAY 层，niri 与 KWin Plasma 6 都支持。

要点：
- 全屏透明层，输入区域只覆盖文字，其余位置点击穿透
- 锁定后整个图层点击穿透，只能从主程序解锁
- 拖动把手势挂在「不动的全屏窗口」上，用 gesture 偏移计算位移
  （Wayland 不给全局指针坐标，窗口一动局部坐标就被抵消）
- 位置 / 锁定 / 字号持久化到 ~/.config/JanMusic/desktop-lyrics.json

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
gi.require_version("Pango", "1.0")
gi.require_version("GtkLayerShell", "0.1")
import cairo  # noqa: E402
from gi.repository import Gdk, GLib, Gtk, GtkLayerShell, Pango  # noqa: E402

CONFIG_DIR = os.path.join(
    os.environ.get("XDG_CONFIG_HOME", os.path.expanduser("~/.config")), "JanMusic"
)
CONFIG_PATH = os.path.join(CONFIG_DIR, "desktop-lyrics.json")

DEFAULT_CONFIG = {"x": 160, "y": 640, "locked": False, "font": 30}

CSS = """
window { background: transparent; }
#lyric {
  color: #ffffff;
  text-shadow: -2px -2px 0 rgba(0,0,0,0.92), 2px -2px 0 rgba(0,0,0,0.92),
               -2px 2px 0 rgba(0,0,0,0.92), 2px 2px 0 rgba(0,0,0,0.92),
               0 3px 10px rgba(0,0,0,0.65);
}
#secondary {
  color: rgba(255,255,255,0.78);
  text-shadow: -1px -1px 0 rgba(0,0,0,0.85), 1px -1px 0 rgba(0,0,0,0.85),
               -1px 1px 0 rgba(0,0,0,0.85), 1px 1px 0 rgba(0,0,0,0.85),
               0 2px 8px rgba(0,0,0,0.55);
}
"""


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


def font_description(size, bold):
    family = "'Noto Sans CJK SC','Noto Sans SC','MiSans',sans-serif"
    return Pango.FontDescription.from_string(f"{'Bold ' if bold else ''}{int(size)}px {family}")


class Overlay:
    def __init__(self):
        self.config = load_config()
        self.locked = bool(self.config["locked"])
        self.playing = True
        self.pos_x = int(self.config["x"])
        self.pos_y = int(self.config["y"])
        self.drag_start = None
        self.dragging = False

        self.window = Gtk.Window(type=Gtk.WindowType.TOPLEVEL)
        self.window.set_decorated(False)
        self.window.set_app_paintable(True)
        self.window.set_skip_taskbar_hint(True)
        visual = self.window.get_screen().get_rgba_visual()
        if visual is not None:
            self.window.set_visual(visual)

        GtkLayerShell.init_for_window(self.window)
        try:
            GtkLayerShell.set_namespace(self.window, "janmusic-lyrics")
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

        self.fixed = Gtk.Fixed()
        self.window.add(self.fixed)

        self.box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        self.event_box = Gtk.EventBox()
        self.event_box.set_visible_window(False)
        self.event_box.add(self.box)
        self.fixed.put(self.event_box, self.pos_x, self.pos_y)

        self.current_label = Gtk.Label(label="")
        self.current_label.set_name("lyric")
        self.current_label.set_xalign(0.0)
        self.secondary_label = Gtk.Label(label="")
        self.secondary_label.set_name("secondary")
        self.secondary_label.set_xalign(0.0)
        self.box.pack_start(self.current_label, False, False, 0)
        self.box.pack_start(self.secondary_label, False, False, 0)

        provider = Gtk.CssProvider()
        provider.load_from_data(CSS.encode("utf-8"))
        Gtk.StyleContext.add_provider_for_screen(
            Gdk.Screen.get_default(), provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        )
        self.apply_font()

        # 手势挂在 window 上：window 永远不动，偏移量就是真实位移
        self.gesture = Gtk.GestureDrag.new(self.window)
        self.gesture.connect("drag-begin", self.on_drag_begin)
        self.gesture.connect("drag-update", self.on_drag_update)
        self.gesture.connect("drag-end", self.on_drag_end)

        self.window.connect("size-allocate", lambda *_: self.update_input_region())
        self.window.connect("destroy", Gtk.main_quit)
        self.window.show_all()
        self.secondary_label.set_visible(False)
        GLib.idle_add(self.update_input_region)

        GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, signal.SIGTERM, self.quit)
        GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, signal.SIGINT, self.quit)

    # ---------- 输入区域 ----------

    def update_input_region(self):
        gdk_window = self.window.get_window()
        if gdk_window is None:
            return False
        if self.locked:
            region = cairo.Region()
        else:
            allocation = self.event_box.get_allocation()
            rect = cairo.RectangleInt(
                self.pos_x, self.pos_y, max(allocation.width, 1), max(allocation.height, 1)
            )
            region = cairo.Region(rect)
        gdk_window.input_shape_combine_region(region, 0, 0)
        return False

    # ---------- 拖动 ----------

    def on_drag_begin(self, _gesture, _start_x, _start_y):
        if self.locked:
            return
        self.drag_start = (self.pos_x, self.pos_y)
        self.dragging = True

    def on_drag_update(self, gesture, offset_x, offset_y):
        if not self.dragging or self.drag_start is None:
            return
        start_x, start_y = self.drag_start
        self.move_to(start_x + int(offset_x), start_y + int(offset_y))

    def on_drag_end(self, _gesture, _offset_x, _offset_y):
        if not self.dragging:
            return
        self.dragging = False
        self.drag_start = None
        self.config["x"] = self.pos_x
        self.config["y"] = self.pos_y
        save_config(self.config)
        self.update_input_region()

    def move_to(self, x, y):
        allocation = self.window.get_allocation()
        max_x = max(0, (allocation.width or 1920) - 120)
        max_y = max(0, (allocation.height or 1080) - 48)
        self.pos_x = max(0, min(int(x), max_x))
        self.pos_y = max(0, min(int(y), max_y))
        self.fixed.move(self.event_box, self.pos_x, self.pos_y)
        if not self.dragging:
            self.update_input_region()

    # ---------- 样式 ----------

    def apply_font(self):
        size = int(self.config.get("font", 30))
        self.current_label.override_font(font_description(size, True))
        self.secondary_label.override_font(font_description(max(12, int(size * 0.62)), False))

    # ---------- 命令 ----------

    def handle(self, payload):
        cmd = payload.get("cmd")
        if cmd == "state":
            self.current_label.set_text(payload.get("current") or "")
            secondary = payload.get("secondary") or ""
            self.secondary_label.set_text(secondary)
            self.secondary_label.set_visible(bool(secondary))
            self.playing = bool(payload.get("playing", True))
            self.window.set_opacity(1.0 if self.playing else 0.55)
            GLib.idle_add(self.update_input_region)
        elif cmd == "theme":
            if "font" in payload:
                self.config["font"] = int(payload["font"])
                self.apply_font()
                save_config(self.config)
                GLib.idle_add(self.update_input_region)
        elif cmd == "lock":
            self.locked = bool(payload.get("value"))
            self.config["locked"] = self.locked
            save_config(self.config)
            self.update_input_region()
        elif cmd == "show":
            self.window.show_all()
            self.secondary_label.set_visible(bool(self.secondary_label.get_text()))
            GLib.idle_add(self.update_input_region)
        elif cmd == "hide":
            self.window.hide()
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
