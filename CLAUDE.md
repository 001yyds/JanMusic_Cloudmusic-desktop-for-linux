# JanMusic · AI 执行手册

本文件是给 AI 助手的强制清单，每次任务收尾前逐项自检。

**总原则：除用户明确说「跳过 / 不用做 / 我自己来」的条目外，其余全部自动完成，不要反问。**
用户不在场时，按本清单一路做到发布为止。

---

## 一、需求核对

1. 逐条回读用户原话，确认每一条都被实现，**不要凭印象判断**。
2. 模糊需求先按最合理的解释实现，在最终回复里说明假设，不要停下来等确认。
3. 用户报告的问题必须**复现 → 定位根因 → 修复 → 验证**。无法复现时，列出已尝试验证的项目，不得声称"已修复"。
4. 修 bug 时不要顺手改无关代码；新增功能时不要破坏既有交互。

## 二、编译与静态检查

5. `pnpm exec tsc --noEmit -p tsconfig.web.json` 必须无输出（通过）。
6. `pnpm build` 桌面端必须成功。
7. `pnpm mobile:apk` 手机端必须 `BUILD SUCCESSFUL`。
8. Java 侧改动后必须真的编译过（Gradle 的 `compileReleaseJavaWithJavac` 不能是缓存命中却带错误的假象；必要时 `./android/gradlew -p android --stop` 后重编）。
9. 清理临时产物：`.playwright-mcp/`、调试截图、`/tmp` 脚本不进仓库（`.gitignore` 已覆盖前者）。

## 三、版本号（三处必须一致）

10. `package.json` → `version`
11. `android/app/build.gradle` → `versionCode` 与 `versionName`（versionCode 递增，如 1.4.0 → 140）
12. `build/arch/PKGBUILD` → `pkgver`

版本策略：新功能 `1.x.0`，修 bug `1.x.y`；不要在同一版本号下发布不同内容。

## 四、Git 提交

13. 作者必须是本机身份 `JanVvoch <6383412@qq.com>`，禁止 `--author`。
14. 禁止 `Co-Authored-By:`、`Generated with ...`、`🤖` 或任何 AI 署名。
15. 提交信息用中文，格式 `feat:` / `fix:` / `chore:` + 一句话标题，正文列要点。
16. 提交前 `git status --short` 确认没有把截图、日志、构建产物带进去。
17. 推送只走 SSH（`git@github.com:`）。发版时 `git push origin main --follow-tags`。
18. 打标签前确认标签指向前面的版本号提交（不要把版本号提交落在标签之后）。

## 五、发布（四类资产全部齐全）

19. 桌面 AppImage：`pnpm exec electron-builder --linux AppImage deb`
20. Debian 包：同上产出 `release/JanMusic-x.y.z-amd64.deb`
21. Arch 包：`makepkg -D build/arch -f --noconfirm`，产出 `janmusic-x.y.z-1-x86_64.pkg.tar.zst`，复制到 `release/`
22. Android：`pnpm mobile:apk`，复制 `app-release.apk` 为 `release/JanMusic-x.y.z-android.apk`
23. 用 `gh release create/upload` 上传**全部四类资产**（`--clobber` 覆盖重传）。
24. 上传后必须核对：`gh release view <tag> --json author,assets`
    - `author.login` 必须是 `001yyds`
    - 资产数量与文件名齐全，体积与本地文件一致
25. Release 说明用中文，列出更新内容与各资产用途，**不得包含任何 AI 署名**。
26. `gh` 仅用于 Release 资产与查询，git push 仍走 SSH。

## 六、README 与文档

27. 发版必须更新 `README.md`：
    - 功能描述（新增能力）
    - 安装方式（AppImage / deb / Arch / APK 的命令与下载链接，版本号同步）
    - 构建步骤若有变化同步修正
28. 安装包文件名里的版本号、Release 链接里的 tag 必须与本次发布一致。

## 七、实证验证（不能只靠"看起来对"）

29. 桌面端至少实际启动一次（`pnpm exec electron .`），确认无白屏、无控制台异常。
30. 关键交互手测：登录弹窗、页面切换、播放控制、设置。
31. 涉及布局/材质改动时，用截图像素或 DOM 计算值验证（例如切页后玻璃是否仍采样背景、栏是否贴边）。
32. 手机端改动需在 390×844 视口或真机上确认，不能只验证桌面。
33. 最终回复必须区分「已验证」与「未验证」，并给出验证方式。

---

## 常用命令

```bash
# 类型检查
pnpm exec tsc --noEmit -p tsconfig.web.json

# 桌面构建 / 打包
pnpm build
pnpm exec electron-builder --linux AppImage deb

# 手机端
pnpm mobile:build     # 只出网页产物 out/mobile
pnpm mobile:apk       # 出 APK

# Arch 包
makepkg -D build/arch -f --noconfirm

# 调试（Electron 开 CDP）
pnpm exec electron . --remote-debugging-port=9222 --no-sandbox

# 发布
gh release create vX.Y.Z release/* --title "JanMusic X.Y.Z" --notes-file /tmp/notes.md
gh release view vX.Y.Z --json author,assets
```

## 项目结构与约定

```
src/main/          主进程：窗口、网易云 API（weapi 加密）、媒体代理与缓存、下载
src/preload/       contextBridge 桥接
src/renderer/      React + Tailwind v4 + framer-motion（桌面与手机共用）
src/mobile/        Android 入口、WebView 内网易云客户端、原生插件桥
src/shared/        共享类型与 NcmApi 接口
android/           Capacitor 工程（含 WebLoginPlugin 原生插件）
```

- 桌面与手机共用 `src/renderer`，改 UI 时两端都要看。
- 手机会走 `src/mobile/bridge.ts`，桌面走 `src/main/netease/client.ts`，涉及接口的逻辑要两边同步。
- 图标统一用 `lucide-react`；材质统一用 `.glass*` / `.lg-bar` / `.useLiquidGlass`。

## 踩过的坑

- **Lightning CSS 会丢掉标准属性**：同时写 `backdrop-filter` 和 `-webkit-backdrop-filter` 时，构建产物可能只保留前缀版本，而 Chromium 的 `-webkit-backdrop-filter` 不认 `url()`。需要折射时**只写标准属性**。
- **Gradle 会缓存 JDK 探测结果**：装完 JDK 仍报 `JAVA_COMPILER` 时，先 `./android/gradlew -p android --stop` 再构建。
- **切页动画不要动 opacity**：包裹层 `opacity < 1` 会成为 backdrop root，里面的 `backdrop-filter` 只采样容器自身，玻璃会退化成半透明白。
- **WebView Cookie 删除**：带 `Domain` 的 Cookie 用逐条 `Max-Age=0` 删不掉，要 `removeAllCookies` 后复核。
- **`.gitignore` 已忽略** `out/`、`release/`、`android/app/build/`、`.playwright-mcp/`。
