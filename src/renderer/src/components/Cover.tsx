import { useEffect, useState } from 'react'
import { Music2 } from 'lucide-react'
import { cn } from '../lib/cn'

interface CoverProps {
  src?: string
  alt?: string
  radius?: number
  className?: string
  imgClassName?: string
}

export function Cover({ src, alt = '', radius = 16, className, imgClassName }: CoverProps): React.JSX.Element {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  return (
    <div
      className={cn('relative overflow-hidden bg-black/[0.04]', className)}
      style={{ borderRadius: radius }}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          draggable={false}
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn('h-full w-full object-cover', imgClassName)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_15%,rgba(255,25,73,0.16),transparent_62%),linear-gradient(160deg,#fafafc,#ececf0)]">
          <Music2 className="text-black/20" size={Math.max(16, Math.min(44, radius * 2.2))} />
        </div>
      )}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-transparent"
        style={{ borderRadius: radius }}
      />
      <div
        className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/25"
        style={{ borderRadius: radius }}
      />
    </div>
  )
}
