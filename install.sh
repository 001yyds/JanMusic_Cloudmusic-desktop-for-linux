#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE="$ROOT/release/linux-unpacked"
APP_NAME="janmusic"
APP_DIR="$HOME/.local/opt/$APP_NAME"
BIN_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"

if [ ! -x "$SOURCE/$APP_NAME" ]; then
  echo "未找到构建产物，请先运行 pnpm dist" >&2
  exit 1
fi

mkdir -p "$APP_DIR" "$BIN_DIR" "$DESKTOP_DIR" "$ICON_DIR"
rm -rf "$APP_DIR"
cp -a "$SOURCE" "$APP_DIR"
install -Dm644 "$ROOT/build/icon.png" "$ICON_DIR/$APP_NAME.png"
ln -sf "$APP_DIR/$APP_NAME" "$BIN_DIR/$APP_NAME"

cat > "$DESKTOP_DIR/$APP_NAME.desktop" <<EOF
[Desktop Entry]
Name=JanMusic
Comment=网易云音乐客户端
Comment[zh_CN]=网易云音乐客户端
Exec=$BIN_DIR/$APP_NAME %U
Icon=$APP_NAME
Terminal=false
Type=Application
Categories=AudioVideo;Audio;Player;
Keywords=music;netease;player;
StartupWMClass=janmusic
EOF

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$DESKTOP_DIR" >/dev/null 2>&1 || true
fi

echo "已安装到 $APP_DIR"
echo "启动命令: $APP_NAME"
echo "桌面入口: $DESKTOP_DIR/$APP_NAME.desktop"
