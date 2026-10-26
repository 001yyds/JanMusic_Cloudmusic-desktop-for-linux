import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, RefreshCw, ShieldCheck, X } from 'lucide-react'
import QRCode from 'qrcode'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { useContentStore } from '../store/content'
import { useLikesStore } from '../store/likes'
import { useUiStore } from '../store/ui'

type Phase = 'loading' | 'waiting' | 'scanned' | 'expired' | 'success'

const HINTS: Record<Phase, string> = {
  loading: '正在获取二维码…',
  waiting: '打开网易云音乐 App → 扫一扫',
  scanned: '已扫描，请在手机上确认',
  expired: '二维码已过期，点击刷新',
  success: '登录成功，正在同步音乐库'
}

export function LoginModal(): React.JSX.Element {
  const open = useUiStore((state) => state.loginOpen)
  const setOpen = useUiStore((state) => state.setLoginOpen)
  const toast = useUiStore((state) => state.toast)

  const [phase, setPhase] = useState<Phase>('loading')
  const [qr, setQr] = useState('')
  const keyRef = useRef('')
  const busyRef = useRef(false)
  const settledRef = useRef(false)

  const start = useCallback(async () => {
    setPhase('loading')
    setQr('')
    settledRef.current = false
    try {
      const { key } = await api.auth.qrCreate()
      keyRef.current = key
      const dataUrl = await QRCode.toDataURL(`https://music.163.com/login?codekey=${key}`, {
        margin: 1,
        width: 440,
        errorCorrectionLevel: 'M',
        color: { dark: '#0a0a0f', light: '#ffffff' }
      })
      setQr(dataUrl)
      setPhase('waiting')
    } catch {
      setPhase('expired')
      toast('无法获取登录二维码，请检查网络', 'error')
    }
  }, [toast])

  useEffect(() => {
    if (!open) {
      keyRef.current = ''
      setPhase('loading')
      setQr('')
      return
    }
    void start()
  }, [open, start])

  useEffect(() => {
    if (!open) return
    const timer = window.setInterval(async () => {
      if (!keyRef.current || busyRef.current || settledRef.current) return
      busyRef.current = true
      try {
        const result = await api.auth.qrCheck(keyRef.current)
        if (result.code === 802) {
          setPhase('scanned')
        } else if (result.code === 800) {
          settledRef.current = true
          setPhase('expired')
        } else if (result.code === 803) {
          settledRef.current = true
          setPhase('success')
          await useAuthStore.getState().refresh()
          void useLikesStore.getState().load(true)
          void useContentStore.getState().load(true)
          const profile = useAuthStore.getState().profile
          toast(profile ? `欢迎回来，${profile.nickname}` : '登录成功', 'success')
          window.setTimeout(() => setOpen(false), 700)
        }
      } catch {
        // keep polling
      } finally {
        busyRef.current = false
      }
    }, 2000)
    return () => window.clearInterval(timer)
  }, [open, setOpen, toast])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[90] flex items-center justify-center"
        >
          <div
            className="absolute inset-0 bg-slate-900/15 backdrop-blur-3xl"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="glass-strong relative w-[368px] overflow-hidden rounded-[30px] border border-white/50 p-7 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.38)]"
          >
            <div className="liquid-sheen" />
            <div className="pointer-events-none absolute -top-28 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-brand/10 blur-[80px]" />

            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full text-black/30 transition-all duration-200 hover:bg-white/40 hover:text-black active:scale-90"
            >
              <X size={15} />
            </button>

            <div className="relative text-center">
              <h3 className="text-[19px] font-semibold tracking-tight">登录网易云音乐</h3>
              <p className="mt-1.5 text-[12px] text-black/45">扫码后即可同步你的歌单与喜欢</p>
            </div>

            <div className="relative mt-6 flex justify-center">
              <div className="relative flex h-[220px] w-[220px] items-center justify-center rounded-[20px] bg-white p-2.5 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.65)]">
                {qr ? (
                  <img src={qr} alt="登录二维码" className="h-full w-full rounded-[14px]" draggable={false} />
                ) : (
                  <Loader2 size={26} className="animate-spin text-black/30" />
                )}

                {(phase === 'scanned' || phase === 'success' || phase === 'expired') && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[20px] bg-white/95 text-center backdrop-blur">
                    {phase === 'scanned' && (
                      <>
                        <span className="text-[13px] font-medium text-black/75">已扫描</span>
                        <span className="text-[11px] text-black/45">请在手机上确认登录</span>
                      </>
                    )}
                    {phase === 'success' && (
                      <>
                        <span className="text-[13px] font-medium text-emerald-600">登录成功</span>
                        <span className="text-[11px] text-black/45">正在同步歌单</span>
                      </>
                    )}
                    {phase === 'expired' && (
                      <button
                        onClick={() => void start()}
                        className="flex items-center gap-1.5 rounded-full bg-white/45 px-3 py-1.5 text-[11.5px] text-black/60 transition hover:bg-white/70"
                      >
                        <RefreshCw size={12} />
                        点击刷新
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <p className="mt-5 text-center text-[11.5px] text-black/45">{HINTS[phase]}</p>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-black/30">
              <ShieldCheck size={11} />
              登录凭据仅保存在本机，并使用系统密钥环加密
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
