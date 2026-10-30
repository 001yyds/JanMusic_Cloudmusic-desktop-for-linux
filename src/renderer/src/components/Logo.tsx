export function Logo({ size = 28 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="betterncm-mark" x1="3" y1="1" x2="29" y2="31" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF5C7C" />
          <stop offset="1" stopColor="#C2002F" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#betterncm-mark)" />
      <rect x="7.5" y="12" width="3" height="8" rx="1.5" fill="white" fillOpacity="0.92" />
      <rect x="11.5" y="8.5" width="3" height="15" rx="1.5" fill="white" fillOpacity="0.96" />
      <rect x="15.5" y="6" width="3" height="20" rx="1.5" fill="white" />
      <rect x="19.5" y="10" width="3" height="12" rx="1.5" fill="white" fillOpacity="0.94" />
      <rect x="23.5" y="13" width="3" height="6" rx="1.5" fill="white" fillOpacity="0.86" />
    </svg>
  )
}
