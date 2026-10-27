# JanMusic

一个网易云音乐客户端：Linux 桌面版（Electron）+ Android 手机版（Capacitor）。

## 功能

- 网易云音乐扫码登录，歌单与「我喜欢的音乐」自动同步
- 每日推荐、推荐歌单、新歌速递、排行榜
- 歌单详情、单曲播放、播放队列、顺序/单曲/列表循环/随机
- 全屏播放页：缓慢旋转封面、动态毛玻璃背景、单行歌词
- 逐行滚动歌词页，支持翻译、点击跳转、自动居中高亮
- 全局搜索：单曲 / 歌单 / 歌手
- 音质切换（标准 / 较高 / 极高 / 无损 / Hi-Res），会员歌曲自动降级并标记「试听」
- 播放 15 秒后自动把整首补全到本地缓存，下次直接离线播放
- 单曲下载与歌单「全部下载」，下载列表显示进度与结果
- 网易云风格歌曲评论：精彩 / 最热 / 最新、楼层回复、点赞、发布与删除
- 单曲下载到 `~/Music/JanMusic`，下载记录可查
- 播放队列、音质、音量、播放模式跨重启记忆
- 自定义无边框窗口、窗口按钮、快捷键、媒体键（桌面环境支持时）

## 运行

```bash
pnpm install
pnpm dev          # 开发模式
pnpm build        # 编译到 out/
pnpm dist         # 打包 AppImage 到 release/
```

打包后安装（用户级，无需 sudo）：

```bash
./install.sh
janmusic          # 或从应用菜单启动
```

也可以直接运行 `release/JanMusic-1.3.0-x86_64.AppImage`。Arch 上如果提示缺少 FUSE，可安装 `fuse2`，或：

```bash
./JanMusic-1.3.0-x86_64.AppImage --appimage-extract-and-run
```

## Android

APK 下载：[JanMusic-1.3.0-android.apk](https://github.com/001yyds/JanMusic_Cloudmusic-desktop-for-linux/releases/download/v1.3/JanMusic-1.3.0-android.apk)

- 手机号验证码登录、歌单、每日推荐、搜索、歌词、播放队列
- 播放 / 暂停、上一首 / 下一首、进度拖动、音质切换
- 歌曲下载到 `Documents/JanMusic`，已下载歌曲优先从本地播放
- 支持 Android 7.0（API 24）及以上；需要允许安装未知来源应用

从源码构建：

```bash
pnpm install
pnpm mobile:sync   # 构建 out/mobile 并同步到 android/
pnpm mobile:apk    # 输出 android/app/build/outputs/apk/release/app-release.apk
```

需要 JDK 21 与 Android SDK 36。release 签名从 `android/keystore.properties` 读取，该文件不提交到仓库。

## 数据与隐私

- 登录 Cookie：桌面版保存在 `~/.config/JanMusic/session.bin`（优先使用系统密钥环加密）；Android 版保存在应用私有存储
- 设置与下载记录：桌面版 `~/.config/JanMusic/settings.json`；Android 版使用应用存储
- 音频缓存：`~/.config/JanMusic/audio-cache/`（桌面版）
- 封面缓存：`~/.config/JanMusic/image-cache/`（桌面版，可在「我的下载」页清理）
- 桌面版所有请求都由主进程发出；Android 版通过 WebView 内的原生 HTTP 桥接发出，不经过第三方服务器

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
