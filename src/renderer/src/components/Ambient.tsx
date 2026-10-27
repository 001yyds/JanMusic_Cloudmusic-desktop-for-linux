import { songCover } from '../lib/api'
import { rgba, useDominantColor } from '../lib/color'
import { usePlayerStore } from '../store/player'
import { useUiStore } from '../store/ui'

export function Ambient(): React.JSX.Element {
  const current = usePlayerStore((state) => state.current)
  const color = useDominantColor(songCover(current ?? undefined, 300))
  const paused = useUiStore(
    (state) => state.loginOpen || state.nowPlaying || state.queueOpen || state.commentsFor !== null
  )
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden${paused ? ' liquid-paused' : ''}`}
    >
      <div
        className="liquid-blob liquid-blob-a -left-[18%] -top-[32%] h-[72vh] w-[66vw] transition-[background] duration-1000"
        style={{ background: `radial-gradient(circle, ${rgba(color, 0.68)} 0%, transparent 68%)` }}
      />
      <div
        className="liquid-blob liquid-blob-b -bottom-[36%] -right-[18%] h-[70vh] w-[58vw]"
        style={{ background: 'radial-gradient(circle, rgba(255, 35, 95, 0.55) 0%, transparent 68%)' }}
      />
      <div
        className="liquid-blob liquid-blob-a left-[24%] top-[0%] h-[48vh] w-[40vw]"
        style={{ background: 'radial-gradient(circle, rgba(84, 112, 255, 0.48) 0%, transparent 70%)' }}
      />
      <div
        className="liquid-blob liquid-blob-b bottom-[4%] left-[4%] h-[52vh] w-[44vw]"
        style={{ background: 'radial-gradient(circle, rgba(64, 201, 255, 0.42) 0%, transparent 70%)' }}
      />
      <div
        className="liquid-blob liquid-blob-a right-[8%] top-[16%] h-[42vh] w-[36vw]"
        style={{ background: 'radial-gradient(circle, rgba(255, 178, 104, 0.4) 0%, transparent 70%)' }}
      />
    </div>
  )
}
