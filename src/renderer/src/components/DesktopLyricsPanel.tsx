import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Contrast,
  Droplet,
  Lock,
  Monitor,
  Palette,
  RotateCcw,
  Square,
  Type,
  X
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Settings } from '../../../shared/types'
import { cn } from '../lib/cn'
import { useSettingsStore } from '../store/settings'
import { Slider } from './Slider'

const OUTLINE_SHADOW = [
  '-1.5px 0 0 rgba(0,0,0,0.82)',
  '1.5px 0 0 rgba(0,0,0,0.82)',
  '0 -1.5px 0 rgba(0,0,0,0.82)',
  '0 1.5px 0 rgba(0,0,0,0.82)',
  '-1.5px -1.5px 0 rgba(0,0,0,0.82)',
  '1.5px -1.5px 0 rgba(0,0,0,0.82)',
  '-1.5px 1.5px 0 rgba(0,0,0,0.82)',
  '1.5px 1.5px 0 rgba(0,0,0,0.82)',
  '0 2px 8px rgba(0,0,0,0.5)'
].join(', ')

const APPEARANCE_DEFAULTS = {
  desktopLyricsFontSize: 30,
  desktopLyricsColor: '#ffffff',
  desktopLyricsOutline: true,
  desktopLyricsBackground: true,
  desktopLyricsBackgroundColor: '#18181c',
  desktopLyricsBackgroundOpacity: 42
} as const

function rgba(hex: string, alpha: number): string {
  const value = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#000000'
  const r = Number.parseInt(value.slice(1, 3), 16)
  const g = Number.parseInt(value.slice(3, 5), 16)
  const b = Number.parseInt(value.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function Toggle({
  checked,
  onChange,
  disabled,
  label
}: {
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  label: string
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-200 active:scale-95',
        checked ? 'bg-brand' : 'bg-black/15',
        disabled && 'cursor-default opacity-30'
      )}
    >
      <span
        className={cn(
          'absolute left-[2px] top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform duration-200',
          checked ? 'translate-x-[16px]' : 'translate-x-0'
        )}
      />
    </button>
  )
}

function ColorField({
  value,
  onChange,
  disabled,
  label
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  label: string
}): React.JSX.Element {
  return (
    <label
      className={cn(
        'flex items-center gap-2',
        disabled ? 'cursor-default opacity-40' : 'cursor-pointer'
      )}
    >
      <span
        className="relative h-7 w-9 overflow-hidden rounded-[8px] border border-white/60 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]"
        style={{ background: value }}
      >
        <input
          type="color"
          value={value}
          disabled={disabled}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </span>
      <span className="font-mono text-[10.5px] uppercase tracking-wide text-black/40">{value}</span>
    </label>
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
  children: React.ReactNode
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
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  )
}

export function DesktopLyricsPanel({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}): React.JSX.Element {
  const settings = useSettingsStore((state) => state.settings)
  const enabled = settings?.desktopLyrics ?? false
  const locked = settings?.desktopLyricsLocked ?? false
  const fontSize = settings?.desktopLyricsFontSize ?? 30
  const color = settings?.desktopLyricsColor ?? '#ffffff'
  const outline = settings?.desktopLyricsOutline ?? true
  const background = settings?.desktopLyricsBackground ?? true
  const backgroundColor = settings?.desktopLyricsBackgroundColor ?? '#18181c'
  const backgroundOpacity = settings?.desktopLyricsBackgroundOpacity ?? 42

  const [font, setFont] = useState(fontSize)
  const [opacity, setOpacity] = useState(backgroundOpacity)

  const patch = (value: Partial<Settings>): void => {
    void useSettingsStore.getState().patch(value)
  }

  useEffect(() => {
    if (open) setFont(fontSize)
  }, [fontSize, open])

  useEffect(() => {
    if (open) setOpacity(backgroundOpacity)
  }, [backgroundOpacity, open])

  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const previewFont = Math.max(16, Math.min(60, font))
  const textShadow = outline ? OUTLINE_SHADOW : 'none'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="desktop-lyrics-panel"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
        >
          <div
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-xl"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="桌面歌词外观"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong relative max-h-[88vh] w-full max-w-[560px] overflow-y-auto overscroll-contain rounded-[26px] border border-white/55 p-4 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.45)] sm:p-5"
          >
            <header className="flex items-start gap-3 px-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-white/45 bg-white/25 text-black/55">
                <Monitor size={16} strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-medium text-black/85">桌面歌词</div>
                <div className="mt-0.5 text-[11px] text-black/40">
                  颜色、描边与背景，修改后自动保存
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-black/35 transition-all duration-200 hover:bg-white/35 hover:text-black active:scale-90"
              >
                <X size={16} />
              </button>
            </header>

            <div className="mt-4 overflow-hidden rounded-[20px] border border-white/25 bg-[radial-gradient(120%_120%_at_20%_10%,#414a63_0%,#181b26_55%,#0a0b10_100%)] px-5 py-7">
              <div className="relative mx-auto w-fit max-w-full">
                <div
                  className="relative"
                  style={{
                    background: background
                      ? rgba(backgroundColor, Math.min(100, Math.max(0, opacity)) / 100)
                      : 'transparent',
                    borderRadius: 16,
                    border: background
                      ? '1px solid rgba(255,255,255,0.2)'
                      : '1px solid transparent',
                    padding: '10px 18px'
                  }}
                >
                  <div
                    className="whitespace-nowrap font-semibold leading-tight"
                    style={{ color, textShadow, fontSize: previewFont }}
                  >
                    晚风轻踩着云朵
                  </div>
                  <div
                    className="mt-0.5 whitespace-nowrap"
                    style={{
                      color,
                      opacity: 0.8,
                      textShadow,
                      fontSize: Math.max(12, Math.round(previewFont * 0.62))
                    }}
                  >
                    The evening breeze
                  </div>
                </div>
              </div>
              <p className="mt-3 text-center text-[10px] text-white/40">
                {enabled ? '桌面歌词已开启' : '桌面歌词未开启'}
              </p>
            </div>

            <div className="mt-3 divide-y divide-white/30">
              <Row icon={Monitor} title="显示桌面歌词" hint="在桌面上叠加同步歌词">
                <Toggle
                  label="显示桌面歌词"
                  checked={enabled}
                  onChange={(value) => patch({ desktopLyrics: value })}
                />
              </Row>
              <Row icon={Lock} title="锁定" hint="锁定后整层点击穿透">
                <Toggle
                  label="锁定桌面歌词"
                  checked={locked}
                  disabled={!enabled}
                  onChange={(value) => patch({ desktopLyricsLocked: value })}
                />
              </Row>
              <Row icon={Type} title="字号" hint={`${font}px`}>
                <Slider
                  value={font - 16}
                  max={44}
                  className="w-[150px]"
                  onChange={(value) => setFont(16 + Math.round(value))}
                  onCommit={(value) => patch({ desktopLyricsFontSize: 16 + Math.round(value) })}
                />
              </Row>
              <Row icon={Palette} title="字体颜色" hint="点击色块选择颜色">
                <ColorField
                  label="字体颜色"
                  value={color}
                  onChange={(value) => patch({ desktopLyricsColor: value })}
                />
              </Row>
              <Row icon={Contrast} title="文字描边" hint="让文字在复杂背景上更清晰">
                <Toggle
                  label="文字描边"
                  checked={outline}
                  onChange={(value) => patch({ desktopLyricsOutline: value })}
                />
              </Row>
              <Row icon={Square} title="字幕背景" hint="在歌词后面加一层底色">
                <Toggle
                  label="字幕背景"
                  checked={background}
                  onChange={(value) => patch({ desktopLyricsBackground: value })}
                />
              </Row>
              <Row icon={Palette} title="背景颜色" hint="点击色块选择颜色">
                <ColorField
                  label="背景颜色"
                  value={backgroundColor}
                  disabled={!background}
                  onChange={(value) => patch({ desktopLyricsBackgroundColor: value })}
                />
              </Row>
              <Row icon={Droplet} title="背景透明度" hint={`${opacity}%`}>
                <Slider
                  value={opacity}
                  max={100}
                  disabled={!background}
                  className="w-[150px]"
                  onChange={(value) => setOpacity(Math.round(value))}
                  onCommit={(value) =>
                    patch({ desktopLyricsBackgroundOpacity: Math.round(value) })
                  }
                />
              </Row>
            </div>

            <button
              type="button"
              onClick={() => patch(APPEARANCE_DEFAULTS)}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[12px] border border-white/45 bg-white/15 py-2 text-[11px] text-black/50 transition-all duration-200 hover:bg-white/30 hover:text-black active:scale-[0.99]"
            >
              <RotateCcw size={12} />
              恢复默认外观
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
