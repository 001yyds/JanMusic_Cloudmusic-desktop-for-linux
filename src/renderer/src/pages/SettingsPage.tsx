import { useEffect, useState } from 'react'
import {
  Check,
  Download,
  FolderOpen,
  HardDrive,
  Headphones,
  Info,
  LogIn,
  LogOut,
  Monitor,
  ShieldCheck,
  Trash2,
  Type,
  UserRound,
  Volume2
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AppInfo, Quality } from '../../../shared/types'
import { cn } from '../lib/cn'
import { coverUrl } from '../lib/api'
import { formatBytes } from '../lib/format'
import { isMobile } from '../lib/platform'
import { clearPlaylistCache } from '../lib/playlistCache'
import { useAuthStore } from '../store/auth'
import { useLikesStore } from '../store/likes'
import { usePlayerStore } from '../store/player'
import { useSettingsStore } from '../store/settings'
import { useUiStore } from '../store/ui'
import { Slider } from '../components/Slider'

const QUALITIES: { value: Quality; label: string }[] = [
  { value: 'standard', label: '标准' },
  { value: 'higher', label: '较高' },
  { value: 'exhigh', label: '极高' },
  { value: 'lossless', label: '无损' },
  { value: 'hires', label: 'Hi-Res' }
]

function Section({
  title,
  caption,
  children
}: {
  title: string
  caption: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="glass-panel rounded-[22px] border border-white/45 p-4 sm:rounded-[24px] sm:p-5">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-[13px] font-medium text-black/80">{title}</h2>
        <span className="text-[9.5px] uppercase tracking-[0.24em] text-black/35">{caption}</span>
      </div>
      <div className="mt-2 divide-y divide-white/30">{children}</div>
    </section>
  )
}

function Row({
  icon: Icon,
  title,
  hint,
  children
}: {
  icon: LucideIcon
  title: string
  hint?: string
  children?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 px-1 py-3.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-white/40 bg-white/20 text-black/45">
        <Icon size={15} strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] text-black/80">{title}</div>
        {hint && <div className="mt-0.5 truncate text-[10.5px] text-black/40">{hint}</div>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-1.5">{children}</div>}
    </div>
  )
}

function ActionButton({
  onClick,
  disabled,
  children
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-full border border-white/45 bg-white/20 px-3 py-1 text-[11px] text-black/55 transition-all duration-200 hover:bg-white/35 hover:text-black active:scale-95 disabled:opacity-30"
    >
      {children}
    </button>
  )
}

export function SettingsPage(): React.JSX.Element {
  const settings = useSettingsStore((state) => state.settings)
  const loggedIn = useAuthStore((state) => state.loggedIn)
  const profile = useAuthStore((state) => state.profile)
  const quality = usePlayerStore((state) => state.quality)
  const volume = usePlayerStore((state) => state.volume)
  const setQuality = usePlayerStore((state) => state.setQuality)
  const setVolume = usePlayerStore((state) => state.setVolume)
  const setLoginOpen = useUiStore((state) => state.setLoginOpen)
  const toast = useUiStore((state) => state.toast)

  const desktopLyrics = settings?.desktopLyrics ?? false
  const desktopLyricsLocked = settings?.desktopLyricsLocked ?? false

  const [lyricSize, setLyricSize] = useState(22)
  const [desktopLyricsFont, setDesktopLyricsFont] = useState(30)
  const [cache, setCache] = useState({ audio: 0, images: 0 })
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    void useSettingsStore.getState().load()
    void window.ncm.cache.info().then(setCache)
    void window.ncm.app
      .info()
      .then(setAppInfo)
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    setLyricSize(settings?.lyricFontSize ?? 22)
  }, [settings?.lyricFontSize])

  useEffect(() => {
    setDesktopLyricsFont(settings?.desktopLyricsFontSize ?? 30)
  }, [settings?.desktopLyricsFontSize])

  const downloads = settings?.downloads ?? []
  const downloadSize = downloads.reduce((sum, item) => sum + item.size, 0)
  const cacheSize = cache.audio + cache.images

  const chooseDir = async (): Promise<void> => {
    try {
      await window.ncm.settings.chooseDownloadDir()
      await useSettingsStore.getState().load()
      toast('下载目录已更新', 'success')
    } catch {
      toast('选择下载目录失败', 'error')
    }
  }

  const clearCache = async (): Promise<void> => {
    setClearing(true)
    try {
      await window.ncm.cache.clear()
      setCache({ audio: 0, images: 0 })
      toast('本地缓存已清理', 'success')
    } catch {
      toast('清理缓存失败', 'error')
    } finally {
      setClearing(false)
    }
  }

  const logout = async (): Promise<void> => {
    await useAuthStore.getState().logout()
    useLikesStore.setState({ liked: new Set(), loaded: false })
    clearPlaylistCache()
    toast('已退出登录', 'success')
  }

  return (
    <div className="relative min-h-full px-4 pb-8 pt-5 sm:px-8 sm:pb-12 sm:pt-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[320px] bg-[radial-gradient(60%_100%_at_30%_0%,rgba(255,25,73,0.07),transparent_70%)]" />

      <header className="relative mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-black/35 sm:text-[10.5px]">Preferences</p>
          <h1 className="mt-2 text-[28px] font-semibold leading-none tracking-[-0.02em] text-black/90 sm:mt-2.5 sm:text-[32px]">设置</h1>
          <p className="mt-2 text-[12px] text-black/40 sm:mt-2.5 sm:text-[12.5px]">调整播放、歌词、下载与本地存储。</p>
        </div>
        <div className="glass-soft hidden items-center gap-2 rounded-full border border-white/40 px-3.5 py-1.5 text-[11px] text-black/50 sm:flex">
          <ShieldCheck size={13} className="text-brand" />
          数据仅保存在本机
        </div>
      </header>

      <div className="relative mx-auto max-w-[820px] space-y-4">
        <Section title="账号" caption="Account">
          <div className="flex items-center gap-3 px-1 py-3.5">
            {profile?.avatarUrl ? (
              <img
                src={coverUrl(profile.avatarUrl, 120)}
                alt=""
                className="h-11 w-11 rounded-full object-cover ring-1 ring-white/60"
                draggable={false}
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/45 bg-white/25 text-[15px] font-semibold text-brand">
                {profile?.nickname?.slice(0, 1) ?? <UserRound size={17} />}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] text-black/85">{profile?.nickname ?? '未登录'}</div>
              <div className="mt-0.5 truncate text-[10.5px] text-black/40">
                {loggedIn
                  ? '网易云音乐账号 · 歌单与喜欢已同步'
                  : isMobile()
                    ? '手机号登录后可同步歌单、每日推荐与喜欢'
                    : '扫码登录后可同步歌单、每日推荐与喜欢'}
              </div>
            </div>
            {loggedIn ? (
              <ActionButton onClick={() => void logout()}>
                <LogOut size={12} />
                退出登录
              </ActionButton>
            ) : (
              <ActionButton onClick={() => setLoginOpen(true)}>
                <LogIn size={12} />
                {isMobile() ? '手机号登录' : '扫码登录'}
              </ActionButton>
            )}
          </div>
        </Section>

        <Section title="播放" caption="Playback">
          <div className="px-1 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-white/40 bg-white/20 text-black/45">
                <Headphones size={15} strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] text-black/80">音质</div>
                <div className="mt-0.5 text-[10.5px] text-black/40">切换后当前歌曲会重新加载音源</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 pl-11">
              {QUALITIES.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setQuality(item.value)}
                  className={cn(
                    'flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-all duration-200 active:scale-95',
                    quality === item.value
                      ? 'glass-pill border-white/60 text-black'
                      : 'border-white/30 bg-white/10 text-black/50 hover:bg-white/25 hover:text-black'
                  )}
                >
                  {quality === item.value && <Check size={10} className="text-brand" />}
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <Row icon={Volume2} title="默认音量" hint={`${Math.round(volume * 100)}%`}>
            <Slider value={volume} max={1} onChange={setVolume} className="w-[120px] sm:w-[170px]" />
          </Row>

          <div className="px-1 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-white/40 bg-white/20 text-black/45">
                <Type size={15} strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] text-black/80">歌词字号</div>
                <div className="mt-0.5 text-[10.5px] text-black/40">{lyricSize}px</div>
              </div>
              <Slider
                value={lyricSize - 16}
                max={14}
                onChange={(value) => setLyricSize(16 + Math.round(value))}
                onCommit={(value) =>
                  void useSettingsStore.getState().patch({ lyricFontSize: 16 + Math.round(value) })
                }
                className="w-[120px] sm:w-[170px]"
              />
            </div>
            <div
              className="mt-3 rounded-[16px] border border-white/30 bg-white/10 px-4 py-3 text-center text-black/70"
              style={{ fontSize: lyricSize }}
            >
              诸事顺利！
            </div>
          </div>

          {!isMobile() && (
            <Row
              icon={Monitor}
              title="桌面歌词"
              hint={
                desktopLyrics
                  ? desktopLyricsLocked
                    ? '已显示 · 已锁定（点击穿透）'
                    : '已显示 · 拖动字幕左侧圆点'
                  : '在桌面上显示同步歌词'
              }
            >
              <ActionButton
                onClick={() =>
                  void useSettingsStore
                    .getState()
                    .patch({ desktopLyrics: !desktopLyrics })
                }
              >
                {desktopLyrics ? '关闭' : '开启'}
              </ActionButton>
              {desktopLyrics && (
                <ActionButton
                  onClick={() =>
                    void useSettingsStore
                      .getState()
                      .patch({ desktopLyricsLocked: !desktopLyricsLocked })
                  }
                >
                  {desktopLyricsLocked ? '解锁' : '锁定'}
                </ActionButton>
              )}
            </Row>
          )}

          {!isMobile() && desktopLyrics && (
            <Row icon={Type} title="桌面歌词字号" hint={`${desktopLyricsFont}px`}>
              <Slider
                value={desktopLyricsFont - 16}
                max={44}
                onChange={(value) => {
                  const size = 16 + Math.round(value)
                  setDesktopLyricsFont(size)
                  void window.ncm.lyrics?.setFont(size)
                }}
                onCommit={(value) =>
                  void useSettingsStore
                    .getState()
                    .patch({ desktopLyricsFontSize: 16 + Math.round(value) })
                }
                className="w-[120px] sm:w-[170px]"
              />
            </Row>
          )}
        </Section>

        <Section title="下载与存储" caption="Storage">
          <Row icon={FolderOpen} title="下载目录" hint={settings?.downloadDir ?? '默认音乐文件夹'}>
            {!isMobile() && <ActionButton onClick={() => void chooseDir()}>选择目录</ActionButton>}
            <button
              onClick={() => {
                void window.ncm.downloads.openFolder().then((path) => {
                  if (isMobile()) toast(`已保存到 ${path}`, 'info')
                })
              }}
              title={isMobile() ? '下载位置' : '打开下载目录'}
              className="flex h-7 w-7 items-center justify-center rounded-full text-black/40 transition-all duration-200 hover:bg-white/35 hover:text-black active:scale-90"
            >
              <FolderOpen size={13} />
            </button>
          </Row>

          {!isMobile() && (
            <Row icon={HardDrive} title="本地缓存" hint={`音频 ${formatBytes(cache.audio)} · 图片 ${formatBytes(cache.images)}`}>
              <ActionButton onClick={() => void clearCache()} disabled={clearing || cacheSize === 0}>
                <Trash2 size={11} />
                {clearing ? '清理中…' : '清理'}
              </ActionButton>
            </Row>
          )}

          <Row icon={Download} title="已下载歌曲" hint={`${downloads.length} 首 · ${formatBytes(downloadSize)}`}>
            <ActionButton
              onClick={() => {
                void window.ncm.downloads.openFolder().then((path) => {
                  if (isMobile()) toast(`已保存到 ${path}`, 'info')
                })
              }}
            >
              查看文件
            </ActionButton>
          </Row>
        </Section>

        <Section title="关于" caption="About">
          <Row icon={Info} title="BetterNCM" hint={isMobile() ? '网易云音乐 Android 客户端' : '网易云音乐桌面客户端'}>
            <span className="tabular text-[11px] text-black/40">
              {appInfo ? `v${appInfo.version}` : '—'}
            </span>
          </Row>
          <Row
            icon={Info}
            title="运行环境"
            hint={appInfo
              ? isMobile()
                ? `Android WebView ${appInfo.chrome}`
                : `Electron ${appInfo.electron} · Chromium ${appInfo.chrome}`
              : '读取中…'}
          />
          <div className="px-1 py-3.5 text-[10.5px] leading-relaxed text-black/35">
            音乐数据来自网易云音乐，仅用于个人学习与本地播放。
            {isMobile() ? '登录凭据仅保存在本机的应用存储中。' : '登录凭据使用系统密钥环加密后保存在本机。'}
          </div>
        </Section>
      </div>
    </div>
  )
}
