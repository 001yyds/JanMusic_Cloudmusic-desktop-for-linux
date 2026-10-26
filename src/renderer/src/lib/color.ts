import { useEffect, useState } from 'react'

type Rgb = [number, number, number]

const cache = new Map<string, Rgb>()
const FALLBACK: Rgb = [255, 25, 73]

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const light = (max + min) / 2
  if (max === min) return [0, 0, light]
  const delta = max - min
  const saturation = light > 0.5 ? delta / (2 - max - min) : delta / (max + min)
  let hue = 0
  if (max === rn) hue = ((gn - bn) / delta + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) hue = ((bn - rn) / delta + 2) / 6
  else hue = ((rn - gn) / delta + 4) / 6
  return [hue * 360, saturation, light]
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = h / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let rgb: [number, number, number] = [0, 0, 0]
  if (hp < 1) rgb = [c, x, 0]
  else if (hp < 2) rgb = [x, c, 0]
  else if (hp < 3) rgb = [0, c, x]
  else if (hp < 4) rgb = [0, x, c]
  else if (hp < 5) rgb = [x, 0, c]
  else rgb = [c, 0, x]
  const m = l - c / 2
  return [Math.round((rgb[0] + m) * 255), Math.round((rgb[1] + m) * 255), Math.round((rgb[2] + m) * 255)]
}

export async function extractColor(src: string): Promise<Rgb> {
  const cached = cache.get(src)
  if (cached) return cached
  return new Promise<Rgb>((resolve) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 28
        canvas.height = 28
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) return resolve(FALLBACK)
        context.drawImage(image, 0, 0, 28, 28)
        const { data } = context.getImageData(0, 0, 28, 28)
        let red = 0
        let green = 0
        let blue = 0
        let weight = 0
        for (let index = 0; index < data.length; index += 4) {
          const r = data[index]
          const g = data[index + 1]
          const b = data[index + 2]
          const max = Math.max(r, g, b)
          const min = Math.min(r, g, b)
          const saturation = (max - min) / 255
          const luminance = (max + min) / 510
          const w = 0.15 + saturation * 2.4 + (1 - Math.abs(luminance - 0.5)) * 0.45
          red += r * w
          green += g * w
          blue += b * w
          weight += w
        }
        if (!weight) return resolve(FALLBACK)
        const [hue, saturation, lightness] = rgbToHsl(red / weight, green / weight, blue / weight)
        const result = hslToRgb(
          hue,
          Math.min(0.78, Math.max(0.32, saturation * 1.45)),
          Math.min(0.62, Math.max(0.34, lightness * 1.08))
        )
        cache.set(src, result)
        resolve(result)
      } catch {
        resolve(FALLBACK)
      }
    }
    image.onerror = () => resolve(FALLBACK)
    image.src = src
  })
}

export function useDominantColor(src: string | undefined): Rgb {
  const [color, setColor] = useState<Rgb>(() => (src ? cache.get(src) ?? FALLBACK : FALLBACK))
  useEffect(() => {
    if (!src) return
    let alive = true
    void extractColor(src).then((value) => {
      if (alive) setColor(value)
    })
    return () => {
      alive = false
    }
  }, [src])
  return color
}

export function rgba(color: Rgb, alpha: number): string {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`
}
