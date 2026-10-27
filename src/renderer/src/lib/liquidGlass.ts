import { useCallback, useEffect, useMemo, useState } from 'react'

interface LiquidGlassOptions {
  /** 元素圆角，必须与 CSS 的 border-radius 一致，位移图才对得上 */
  radius?: number
  /** 折射强度（px），越大边缘弯曲越明显 */
  strength?: number
  /** 折射影响带宽度（px） */
  thickness?: number
}

interface LiquidGlassResult {
  /** 挂到目标元素上的 callback ref */
  ref: (element: HTMLElement | null) => void
  /** 注入到 CSS 的 filter id，形如 url(#lg-xxxx) */
  filterId: string
  /** 当前环境是否支持 backdrop-filter 引用 SVG 滤镜；不支持时不加折射，退化为磨砂玻璃 */
  refract: boolean
}

function sdRoundRect(px: number, py: number, w: number, h: number, r: number): number {
  const cx = Math.abs(px - w / 2) - (w / 2 - r)
  const cy = Math.abs(py - h / 2) - (h / 2 - r)
  const dx = Math.max(cx, 0)
  const dy = Math.max(cy, 0)
  return Math.min(Math.max(cx, cy), 0) + Math.hypot(dx, dy) - r
}

function clamp(value: number, min = -127, max = 127): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * 生成圆角矩形的位移贴图：R/G 通道编码边缘法线，feDisplacementMap 用它把背景在边缘处弯折，
 * 做出玻璃的折射感。内部区域保持中性值 (128,128) 不变形。
 */
function buildDisplacementMap(
  width: number,
  height: number,
  radius: number,
  thickness: number
): string {
  const w = Math.max(2, Math.round(width))
  const h = Math.max(2, Math.round(height))
  const r = Math.min(radius, w / 2, h / 2)
  const band = Math.max(4, Math.min(thickness, Math.min(w, h) / 2))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const image = ctx.createImageData(w, h)
  const data = image.data
  const eps = 1

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const px = x + 0.5
      const py = y + 0.5
      const index = (y * w + x) * 4
      data[index] = 128
      data[index + 1] = 128
      data[index + 2] = 0
      data[index + 3] = 255

      const depth = -sdRoundRect(px, py, w, h, r)
      if (depth < 0 || depth > band) continue

      // 越靠近外边缘折射越强
      const falloff = Math.pow(1 - depth / band, 1.6)
      const nx =
        (sdRoundRect(px + eps, py, w, h, r) - sdRoundRect(px - eps, py, w, h, r)) / (2 * eps)
      const ny =
        (sdRoundRect(px, py + eps, w, h, r) - sdRoundRect(px, py - eps, w, h, r)) / (2 * eps)

      data[index] = 128 + clamp(nx * falloff * 127)
      data[index + 1] = 128 + clamp(ny * falloff * 127)
    }
  }

  ctx.putImageData(image, 0, 0)
  return canvas.toDataURL('image/png')
}

function supportsBackdropFilterUrl(): boolean {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false
  return (
    CSS.supports('backdrop-filter', 'url(#lg-probe)') ||
    CSS.supports('-webkit-backdrop-filter', 'url(#lg-probe)')
  )
}

/**
 * 给元素套上液态玻璃材质：按尺寸生成位移贴图做折射，并让镜面高光跟随指针。
 * 桌面端（Electron）与手机端（Capacitor WebView）共用。
 */
export function useLiquidGlass(
  { radius = 28, strength = 26, thickness = 30 }: LiquidGlassOptions = {}
): LiquidGlassResult {
  const filterId = useMemo(
    () => `lg-${Math.random().toString(36).slice(2, 9)}`,
    []
  )
  const [element, setElement] = useState<HTMLElement | null>(null)
  const [refract, setRefract] = useState(false)
  const ref = useCallback((node: HTMLElement | null) => setElement(node), [])

  useEffect(() => {
    const el = element
    if (!el) return
    if (!supportsBackdropFilterUrl()) return

    const ns = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(ns, 'svg')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('width', '0')
    svg.setAttribute('height', '0')
    svg.style.position = 'absolute'
    svg.style.pointerEvents = 'none'

    const filter = document.createElementNS(ns, 'filter')
    filter.setAttribute('id', filterId)
    filter.setAttribute('x', '0')
    filter.setAttribute('y', '0')
    filter.setAttribute('width', '100%')
    filter.setAttribute('height', '100%')
    filter.setAttribute('color-interpolation-filters', 'sRGB')

    const feImage = document.createElementNS(ns, 'feImage')
    feImage.setAttribute('result', 'map')
    feImage.setAttribute('preserveAspectRatio', 'none')

    const feDisplace = document.createElementNS(ns, 'feDisplacementMap')
    feDisplace.setAttribute('in', 'SourceGraphic')
    feDisplace.setAttribute('in2', 'map')
    feDisplace.setAttribute('xChannelSelector', 'R')
    feDisplace.setAttribute('yChannelSelector', 'G')
    feDisplace.setAttribute('scale', String(strength))

    filter.append(feImage, feDisplace)
    svg.append(filter)
    document.body.append(svg)
    setRefract(true)

    const update = (): void => {
      // 用布局尺寸而不是 getBoundingClientRect：入场动画的 scale 会让后者偏小
      const width = el.offsetWidth
      const height = el.offsetHeight
      if (width < 4 || height < 4) return
      const href = buildDisplacementMap(width, height, radius, thickness)
      if (!href) return
      feImage.setAttribute('href', href)
      feImage.setAttribute('x', '0')
      feImage.setAttribute('y', '0')
      feImage.setAttribute('width', String(width))
      feImage.setAttribute('height', String(height))
    }

    let frame = requestAnimationFrame(update)
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    })
    observer.observe(el)

    const trackPointer = (event: PointerEvent): void => {
      const box = el.getBoundingClientRect()
      if (!box.width || !box.height) return
      el.style.setProperty('--lg-x', `${((event.clientX - box.left) / box.width) * 100}%`)
      el.style.setProperty('--lg-y', `${((event.clientY - box.top) / box.height) * 100}%`)
    }
    const resetPointer = (): void => {
      el.style.setProperty('--lg-x', '22%')
      el.style.setProperty('--lg-y', '-24%')
    }

    el.addEventListener('pointermove', trackPointer)
    el.addEventListener('pointerleave', resetPointer)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      el.removeEventListener('pointermove', trackPointer)
      el.removeEventListener('pointerleave', resetPointer)
      svg.remove()
    }
  }, [element, filterId, radius, strength, thickness])

  return { ref, filterId, refract }
}
