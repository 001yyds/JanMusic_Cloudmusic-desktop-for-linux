import { Download, Heart, ListPlus, Play } from 'lucide-react'
import type { Song } from '../../../shared/types'
import { downloadSong } from '../lib/actions'
import { songArtists, songDuration } from '../lib/api'
import { cn } from '../lib/cn'
import { formatDuration } from '../lib/format'
import { useLikesStore } from '../store/likes'
import { usePlayerStore } from '../store/player'
import { useSettingsStore } from '../store/settings'
import { Equalizer } from './Equalizer'

interface TrackListProps {
  songs: Song[]
  showAlbum?: boolean
  showIndex?: boolean
  dense?: boolean
}

function RowAction({
  onClick,
  active,
  title,
  children
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      title={title}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-[8px] transition-all duration-200 active:scale-90',
        active ? 'text-brand' : 'text-black/40 hover:bg-white/30 hover:text-black'
      )}
    >
      {children}
    </button>
  )
}

export function TrackList({ songs, showAlbum = true, showIndex = true, dense }: TrackListProps): React.JSX.Element {
  const currentId = usePlayerStore((state) => state.current?.id)
  const playing = usePlayerStore((state) => state.playing)
  const liked = useLikesStore((state) => state.liked)
  const quality = useSettingsStore((state) => state.settings?.quality ?? 'exhigh')
  const play = usePlayerStore((state) => state.play)
  const toggle = usePlayerStore((state) => state.toggle)
  const addToQueue = usePlayerStore((state) => state.addToQueue)

  const columns = showAlbum
    ? showIndex
      ? 'grid-cols-[28px_minmax(0,2.4fr)_52px_88px] min-[1040px]:grid-cols-[28px_minmax(0,2.4fr)_minmax(0,1.5fr)_52px_88px]'
      : 'grid-cols-[minmax(0,2.4fr)_52px_88px] min-[1040px]:grid-cols-[minmax(0,2.4fr)_minmax(0,1.5fr)_52px_88px]'
    : showIndex
      ? 'grid-cols-[28px_minmax(0,1fr)_52px_88px]'
      : 'grid-cols-[minmax(0,1fr)_52px_88px]'

  return (
    <div className="flex flex-col">
      {songs.map((song, index) => {
        const active = currentId === song.id
        const isLiked = liked.has(song.id)
        const vip = song.fee === 1 || song.fee === 4
        return (
          <div
            key={`${song.id}-${index}`}
            onClick={() => {
              if (active) toggle()
              else play(song, songs)
            }}
            className={cn(
              'group grid cursor-pointer items-center gap-3 rounded-[12px] px-2.5 transition-colors duration-200 hover:bg-white/25 active:bg-white/35',
              active && 'bg-white/10',
              dense ? 'py-1.5' : 'py-2',
              columns
            )}
          >
            {showIndex && (
              <div className="relative flex h-4 items-center justify-center">
                {active ? (
                  <Equalizer active={playing} />
                ) : (
                  <>
                    <span className="tabular text-[11.5px] text-black/30 group-hover:opacity-0">{index + 1}</span>
                    <Play
                      size={13}
                      fill="currentColor"
                      className="absolute text-black/70 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    />
                  </>
                )}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'truncate text-[13px] transition-colors duration-200',
                    active ? 'text-brand' : 'text-black/85 group-hover:text-black'
                  )}
                >
                  {song.name}
                </span>
                {vip && (
                  <span className="shrink-0 rounded-[3px] border border-brand/35 px-1 text-[8px] leading-[13px] text-brand">
                    VIP
                  </span>
                )}
              </div>
              <div className="truncate text-[11px] text-black/45">{songArtists(song)}</div>
            </div>

            {showAlbum && (
              <div className="hidden truncate text-[12px] text-black/45 min-[1040px]:block">
                {(song.al ?? song.album)?.name ?? '—'}
              </div>
            )}

            <div className="tabular text-right text-[11.5px] text-black/35">{formatDuration(songDuration(song))}</div>

            <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <RowAction title={isLiked ? '取消喜欢' : '喜欢'} active={isLiked} onClick={() => void useLikesStore.getState().toggle(song)}>
                <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
              </RowAction>
              <RowAction title="下载" onClick={() => void downloadSong(song, quality)}>
                <Download size={14} />
              </RowAction>
              <RowAction title="加入播放队列" onClick={() => addToQueue([song])}>
                <ListPlus size={14} />
              </RowAction>
            </div>
          </div>
        )
      })}
    </div>
  )
}
