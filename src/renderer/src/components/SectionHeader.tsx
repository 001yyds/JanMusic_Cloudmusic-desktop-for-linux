import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps): React.JSX.Element {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-black/90">{title}</h2>
        {subtitle && <p className="mt-1 text-[12px] text-black/40">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
