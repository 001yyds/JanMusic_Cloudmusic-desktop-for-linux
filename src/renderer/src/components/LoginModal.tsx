import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, KeyRound, Loader2, RefreshCw, ShieldCheck, Smartphone, X } from 'lucide-react'
import QRCode from 'qrcode'
import { api } from '../lib/api'
import { isMobile } from '../lib/platform'
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

function authError(code: number, message: string | undefined, action: 'send' | 'login'): string {
  if (code === -462 || code === 8810 || (message && /风险|安全验证|安全校验/.test(message))) {
    return `${message ?? '网易安全校验未通过'}，请关闭代理/VPN 或切换 Wi-Fi/移动网络后重试`
  }
  if (action === 'send') {
    if (code === 405 || code === 501) return '发送验证码过于频繁，请稍后再试'
    return message || '验证码发送失败，请稍后重试'
  }
  if (code === 502 || code === 503) return '验证码错误或已过期'
  return message || '登录失败，请检查手机号与验证码'
}

function DesktopLoginModal(): React.JSX.Element {
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
            className="glass-strong relative w-[min(368px,calc(100vw-32px))] overflow-hidden rounded-[28px] border border-white/50 p-6 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.38)] sm:rounded-[30px] sm:p-7"
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
              <div className="relative flex h-[200px] w-[200px] items-center justify-center rounded-[20px] bg-white p-2.5 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.65)] sm:h-[220px] sm:w-[220px]">
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

function MobilePhoneLogin(): React.JSX.Element {
  const open = useUiStore((state) => state.loginOpen)
  const setOpen = useUiStore((state) => state.setLoginOpen)
  const toast = useUiStore((state) => state.toast)

  const [phone, setPhone] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [sending, setSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) return
    setPhone('')
    setCaptcha('')
    setSending(false)
    setSubmitting(false)
    setCountdown(0)
    setError('')
  }, [open])

  useEffect(() => {
    if (countdown <= 0) return
    const timer = window.setTimeout(() => setCountdown((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [countdown])

  const phoneValid = /^1\d{10}$/.test(phone)
  const canSubmit = phoneValid && captcha.trim().length >= 4 && !submitting

  const sendCode = async (): Promise<void> => {
    if (!phoneValid || sending || countdown > 0) return
    setSending(true)
    setError('')
    try {
      const result = await api.auth.captchaSend(phone)
      if (result.code !== 200) {
        const message = authError(result.code, result.message, 'send')
        setError(message)
        toast(message, 'error')
        return
      }
      setCountdown(60)
      toast('验证码已发送，请注意查收', 'success')
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '验证码发送失败，请检查网络'
      setError(message)
      toast(message, 'error')
    } finally {
      setSending(false)
    }
  }

  const login = async (): Promise<void> => {
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      const result = await api.auth.phoneLogin(phone, captcha.trim())
      if (result.code !== 200) {
        const message = authError(result.code, result.message, 'login')
        setError(message)
        toast(message, 'error')
        return
      }
      await useAuthStore.getState().refresh()
      if (!useAuthStore.getState().loggedIn) {
        const message = '未能保存登录状态，请重试'
        setError(message)
        toast(message, 'error')
        return
      }
      void useLikesStore.getState().load(true)
      void useContentStore.getState().load(true)
      const profile = useAuthStore.getState().profile
      toast(profile ? `欢迎回来，${profile.nickname}` : '登录成功', 'success')
      window.setTimeout(() => setOpen(false), 600)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '登录失败，请稍后重试'
      setError(message)
      toast(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-slate-900/25"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="glass-strong relative max-h-[calc(100dvh-32px)] w-[min(380px,calc(100vw-24px))] overflow-y-auto rounded-[28px] border border-white/50 p-6 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.38)]"
          >
            <div className="liquid-sheen-static" />
            <div className="pointer-events-none absolute -top-28 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-brand/10 blur-[80px]" />

            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full text-black/30 transition-all duration-200 hover:bg-white/40 hover:text-black active:scale-90"
            >
              <X size={15} />
            </button>

            <div className="relative text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[16px] border border-white/45 bg-white/25 text-brand shadow-[0_10px_28px_-16px_rgba(255,25,73,0.4)]">
                <Smartphone size={22} strokeWidth={1.8} />
              </div>
              <h3 className="mt-3 text-[19px] font-semibold tracking-tight">手机号登录</h3>
              <p className="mt-1.5 text-[11.5px] text-black/45">使用网易云音乐绑定的手机号接收验证码</p>
            </div>

            <form
              className="relative mt-5 space-y-2.5"
              onSubmit={(event) => {
                event.preventDefault()
                void login()
              }}
            >
              <label className="flex items-center gap-3 rounded-[14px] border border-white/45 bg-white/25 px-4 py-3 transition-colors duration-200 focus-within:border-white/75 focus-within:bg-white/35">
                <span className="shrink-0 text-[13px] font-medium text-black/55">+86</span>
                <span className="h-4 w-px shrink-0 bg-black/10" />
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="请输入手机号"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={11}
                  className="min-w-0 flex-1 bg-transparent text-[15px] tracking-[0.02em] text-black/85 outline-none placeholder:text-black/25"
                />
              </label>

              <div className="flex items-center gap-2 rounded-[14px] border border-white/45 bg-white/25 px-4 py-2.5 transition-colors duration-200 focus-within:border-white/75 focus-within:bg-white/35">
                <KeyRound size={15} className="shrink-0 text-black/30" />
                <input
                  value={captcha}
                  onChange={(event) => setCaptcha(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="请输入验证码"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="min-w-0 flex-1 bg-transparent text-[15px] tracking-[0.08em] text-black/85 outline-none placeholder:text-black/25"
                />
                <button
                  type="button"
                  onClick={() => void sendCode()}
                  disabled={!phoneValid || sending || countdown > 0}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-brand/10 px-3 py-1.5 text-[11px] font-medium text-brand transition-all duration-200 enabled:hover:bg-brand/15 enabled:active:scale-95 disabled:bg-white/20 disabled:text-black/25"
                >
                  {sending && <Loader2 size={11} className="animate-spin" />}
                  {sending ? '发送中' : countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-1.5 rounded-[10px] bg-brand/[0.07] px-3 py-2 text-[11px] leading-relaxed text-brand">
                  <AlertCircle size={12} className="mt-[1px] shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3 text-[13.5px] font-medium text-white shadow-[0_10px_26px_rgba(255,25,73,0.28)] transition-all duration-200 enabled:hover:scale-[1.01] enabled:active:scale-[0.98] disabled:opacity-35"
              >
                {submitting && <Loader2 size={15} className="animate-spin" />}
                {submitting ? '登录中…' : '登录'}
              </button>
            </form>

            <div className="mt-3.5 flex items-center justify-center gap-1.5 text-[10px] leading-relaxed text-black/30">
              <ShieldCheck size={11} className="shrink-0" />
              登录凭据仅保存在本机的应用存储中
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function LoginModal(): React.JSX.Element {
  return isMobile() ? <MobilePhoneLogin /> : <DesktopLoginModal />
}
