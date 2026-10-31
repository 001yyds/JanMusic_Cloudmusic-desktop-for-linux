# BetterNCM

一个网易云音乐客户端：Linux 桌面版（Electron）+ Android 手机版（Capacitor）。

## 功能

- 液态玻璃界面：所有面板共用一套材质，边缘折射、指针跟随高光、玻璃厚度描边，背景色可透出
- 桌面歌词（仅桌面端）：Wayland 下用 wlr-layer-shell 把歌词浮在桌面最上层，可拖动、可在多块屏幕之间拖动、可锁定穿透、支持翻译行
- 桌面端扫码登录；手机端支持扫码、手机号验证码，以及内嵌官方网页登录（风控滑块在网页内完成）
- 歌单与「我喜欢的音乐」自动同步，收藏页可直接打开歌单
- 每日推荐、推荐歌单、新歌速递、排行榜
- 歌单详情、单曲播放、播放队列、顺序/单曲/列表循环/随机
- 全屏播放页：缓慢旋转封面、动态毛玻璃背景、单行歌词
- 逐行滚动歌词页，支持翻译、点击跳转、自动居中高亮
- 全局搜索：单曲 / 歌单 / 歌手
- 音质切换（标准 / 较高 / 极高 / 无损 / Hi-Res），会员歌曲自动降级并标记「试听」
- 播放 15 秒后自动把整首补全到本地缓存，下次直接离线播放
- 单曲下载与歌单「全部下载」，下载列表显示进度与结果；已下载歌曲可删除并同时清理本地文件，同一首歌不会重复下载
- 网易云风格歌曲评论：精彩 / 最热 / 最新、楼层回复、点赞、发布与删除
- 单曲下载到 `~/Music/BetterNCM`，下载记录可查
- 播放队列、音质、音量、播放模式跨重启记忆
- 自定义无边框窗口、窗口按钮、快捷键、媒体键（桌面环境支持时）

## 运行

```bash
pnpm install
pnpm dev          # 开发模式
pnpm build        # 编译到 out/
pnpm dist         # 打包 AppImage 到 release/
pnpm exec electron-builder --linux AppImage deb   # AppImage + deb
makepkg -D build/arch -f --noconfirm              # Arch 包
```

发版流程与自检清单见 [`CLAUDE.md`](./CLAUDE.md)。

打包后安装（用户级，无需 sudo）：

```bash
./install.sh
betterncm          # 或从应用菜单启动
```

也可以直接运行 `release/BetterNCM-1.8.1-x86_64.AppImage`。Arch 上如果提示缺少 FUSE，可安装 `fuse2`，或：

```bash
./BetterNCM-1.8.1-x86_64.AppImage --appimage-extract-and-run
```

桌面歌词依赖系统的 GTK3 与 layer-shell（Arch：`sudo pacman -S gtk3 python-gobject gtk-layer-shell`）。

### 各发行版安装包

| 发行版 | 文件 | 安装 |
| --- | --- | --- |
| Arch Linux | `betterncm-1.8.1-1-x86_64.pkg.tar.zst` | `sudo pacman -U betterncm-1.8.1-1-x86_64.pkg.tar.zst` |
| Debian / Ubuntu | `BetterNCM-1.8.1-amd64.deb` | `sudo apt install ./BetterNCM-1.8.1-amd64.deb` |
| 通用便携 | `BetterNCM-1.8.1-x86_64.AppImage` | `chmod +x` 后直接运行 |

下载地址：[Releases](https://github.com/001yyds/Better_NCM_Linux/releases/latest)

## Android

APK 下载：[BetterNCM-1.8.1-android.apk](https://github.com/001yyds/Better_NCM_Linux/releases/download/v1.8.1/BetterNCM-1.8.1-android.apk)

- 三种登录方式：扫码、手机号验证码、内嵌官方网页登录（可完成滑块验证）
- 歌单、每日推荐、搜索、歌词、播放队列
- 播放 / 暂停、上一首 / 下一首、进度拖动、音质切换
- 歌曲下载到 `Documents/BetterNCM`，已下载歌曲优先从本地播放
- 支持 Android 7.0（API 24）及以上；需要允许安装未知来源应用

从源码构建：

```bash
pnpm install
pnpm mobile:sync   # 构建 out/mobile 并同步到 android/
pnpm mobile:apk    # 输出 android/app/build/outputs/apk/release/app-release.apk
```

需要 JDK 21 与 Android SDK 36。release 签名从 `android/keystore.properties` 读取，该文件不提交到仓库。

## 从 JanMusic 升级

1.7.0 起项目更名为 BetterNCM，应用标识随之改变（`com.janmusic.player` → `com.betterncm.player`），首次安装同一时间：

- 旧配置目录 `~/.config/JanMusic/` 改名为 `~/.config/BetterNCM/`，登录状态、设置、缓存与桌面歌词位置原样保留
- 旧下载目录 `~/Music/JanMusic/` 改名为 `~/Music/BetterNCM/`（下载记录里保存的绝对路径需要同步更新，否则重新下载即可）
- Android 版为不同 applicationId，需要卸载旧版后重新安装并重新登录；旧版歌曲在 `Documents/JanMusic/`，可手动移动到 `Documents/BetterNCM/`

```bash
mv ~/.config/JanMusic ~/.config/BetterNCM
mv ~/Music/JanMusic ~/Music/BetterNCM
```

## 数据与隐私

- 登录 Cookie：桌面版保存在 `~/.config/BetterNCM/session.bin`（优先使用系统密钥环加密）；Android 版保存在应用私有存储
- 设置与下载记录：桌面版 `~/.config/BetterNCM/settings.json`；Android 版使用应用存储
- 音频缓存：`~/.config/BetterNCM/audio-cache/`（桌面版）
- 封面缓存：`~/.config/BetterNCM/image-cache/`（桌面版，可在「我的下载」页清理）
- 桌面版所有请求都由主进程发出；Android 版通过 WebView 内的原生 HTTP 桥接发出，不经过第三方服务器

## 桌面歌词

设置 → 播放 → 桌面歌词 → 开启。歌词作为独立图层浮在桌面最上层：

- 未锁定时可直接拖动，位置自动保存；按住拖过屏幕边界会连续移动到相邻屏幕，多显示器之间可以来回拖
- 点「锁定」后整层点击穿透，不挡其他窗口操作；再点「解锁」恢复
- 显示当前行 + 翻译（无翻译时显示下一行），播放暂停时自动变淡
- 基于 Wayland 的 layer-shell：niri、KDE Plasma 6（Wayland）可用；X11 会话暂不支持

位置、锁定状态与字号保存在 `~/.config/BetterNCM/desktop-lyrics.json`，异常日志在 `~/.config/BetterNCM/desktop-lyrics.log`。

## 快捷键

| 按键 | 功能 |
| --- | --- |
| `Space` | 播放 / 暂停 |
| `Ctrl + K` | 打开搜索 |
| `Alt + →` / `Alt + ←` | 下一首 / 上一首 |
| `Esc` | 关闭播放页 / 登录框 |

## 说明

- 网易云音乐接口为非官方接口，会员歌曲在未开通会员时只能播放 30~45 秒试听片段，客户端会显示「试听」标记。
- 仅用于个人学习与自用，请支持正版音乐。

## 结构

```
src/main/          主进程：窗口、网易云 API（weapi 加密）、媒体代理与缓存、下载
src/preload/       contextBridge 类型安全桥接
src/renderer/      React + Tailwind v4 + framer-motion 界面
src/mobile/        Android 入口、WebView 内网易云客户端与文件下载
src/shared/        主进程 / 渲染层共享类型
android/           Capacitor Android 工程
```
