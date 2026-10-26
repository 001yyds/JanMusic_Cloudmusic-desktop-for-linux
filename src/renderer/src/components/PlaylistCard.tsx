import { motion } from 'framer-motion'
import { Headphones, Play } from 'lucide-react'
import type { Playlist } from '../../../shared/types'
import { playPlaylist } from '../lib/actions'
import { coverUrl } from '../lib/api'
import { formatCount } from '../lib/format'
import { useUiStore } from '../store/ui'
import { Cover } from './Cover'

interface PlaylistCardProps {
  playlist: Playlist
}

export function PlaylistCard({ playlist }: PlaylistCardProps): React.JSX.Element {
  const navigate = useUiStore((state) => state.navigate)

  return (
    <motion.button
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      onClick={() => navigate({ page: 'playlist', id: playlist.id, title: playlist.name })}
      className="glass-tile group block w-full rounded-[22px] border border-white/40 p-2 pb-2.5 text-left"
    >
      <div className="relative">
        <Cover
          src={coverUrl(playlist.coverImgUrl ?? playlist.picUrl, 400)}
          radius={16}
          className="aspect-square w-full shadow-[0_14px_34px_-20px_rgba(0,0,0,0.4)]"
          imgClassName="transition-transform duration-500 ease-out group-hover:scale-[1.045]"
        />
        <div className="pointer-events-none absolute inset-0 rounded-[16px] bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <button
          onClick={(event) => {
            event.stopPropagation()
            void playPlaylist(playlist.id)
          }}
          className="absolute bottom-3 right-3 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-brand text-white opacity-0 shadow-[0_8px_24px_rgba(255,25,73,0.35)] transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 hover:scale-105 active:scale-95"
          aria-label="播放歌单"
        >
          <Play size={16} fill="currentColor" className="ml-0.5" />
        </button>
        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/35 px-2 py-1 text-[10px] text-white/80 backdrop-blur-md">
          <Headphones size={10} />
          {formatCount(playlist.playCount)}
        </div>
      </div>
      <div className="mt-2.5 line-clamp-2 px-1 text-[12.5px] leading-[1.45] text-black/75 transition-colors duration-200 group-hover:text-black">
        {playlist.name}
      </div>
    </motion.button>
  )
}
