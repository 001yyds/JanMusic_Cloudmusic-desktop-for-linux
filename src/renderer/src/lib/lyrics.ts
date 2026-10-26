export interface LyricLine {
  time: number
  text: string
  translation?: string
}

export function parseLyric(lrc: string, translated = ''): LyricLine[] {
  const entries = new Map<number, LyricLine>()
  const credit =
    /(作词|作曲|编曲|制作|监制|录音|混音|母带|人声|和声|吉他|贝斯|鼓|键盘|弦乐|出品|发行|统筹|策划|OP|SP)[^:：]{0,8}[:：]/

  const consume = (raw: string, translation: boolean): void => {
    for (const line of raw.split('\n')) {
      const stamps = [...line.matchAll(/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g)]
      if (!stamps.length) continue
      const text = line.replace(/\[[^\]]*\]/g, '').trim()
      if (!text) continue
      if (!translation && credit.test(text)) continue
      for (const stamp of stamps) {
        const minutes = Number(stamp[1])
        const seconds = Number(stamp[2])
        const fraction = stamp[3] ? Number(`0.${stamp[3]}`) : 0
        const time = minutes * 60 + seconds + fraction
        if (translation) {
          const existing = entries.get(time)
          if (existing) existing.translation = text
        } else {
          entries.set(time, { time, text })
        }
      }
    }
  }

  consume(lrc, false)
  consume(translated, true)
  return [...entries.values()].sort((a, b) => a.time - b.time)
}

export function activeLineIndex(lines: LyricLine[], time: number): number {
  if (!lines.length) return -1
  let low = 0
  let high = lines.length - 1
  let result = 0
  while (low <= high) {
    const mid = (low + high) >> 1
    if (lines[mid].time <= time) {
      result = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return result
}
