# JanMusic

一个为 Linux 桌面做的网易云音乐客户端。深色玻璃拟态、动态取色、半透明窗口，交互和动效按苹果那套手感来做：克制的位移、弹簧过渡、按下即回弹。

![](build/icon.png)

## 功能

- 网易云音乐扫码登录，歌单与「我喜欢的音乐」自动同步
- 每日推荐、推荐歌单、新歌速递、排行榜
- 歌单详情、单曲播放、播放队列、顺序/单曲/列表循环/随机
- 全屏播放页：缓慢旋转封面、动态毛玻璃背景、单行歌词
- 逐行滚动歌词页，支持翻译、点击跳转、自动居中高亮
- 全局搜索：单曲 / 歌单 / 歌手
- 音质切换（标准 / 较高 / 极高 / 无损 / Hi-Res），会员歌曲自动降级并标记「试听」
- 播放 15 秒后自动把整首补全到本地缓存，下次直接离线播放
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

也可以直接运行 `release/JanMusic-1.0.0-x86_64.AppImage`。Arch 上如果提示缺少 FUSE，可安装 `fuse2`，或：

```bash
./JanMusic-1.0.0-x86_64.AppImage --appimage-extract-and-run
```

## 数据与隐私

- 登录 Cookie 保存在 `~/.config/JanMusic/session.bin`，优先使用系统密钥环加密
- 设置与下载记录：`~/.config/JanMusic/settings.json`
- 音频缓存：`~/.config/JanMusic/audio-cache/`
- 封面缓存：`~/.config/JanMusic/image-cache/`（可在「我的下载」页清理）
- 所有请求都由主进程发出，渲染层不接触账号凭据

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
src/shared/        主进程 / 渲染层共享类型
```
