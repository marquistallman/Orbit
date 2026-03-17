export default function OrbitIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="6" fill="#C6A15B" />
      <ellipse cx="20" cy="20" rx="18" ry="7.5" stroke="#C6A15B" strokeWidth="1.2" fill="none" transform="rotate(-20 20 20)" />
      <ellipse cx="20" cy="20" rx="18" ry="7.5" stroke="#8C6A3E" strokeWidth="0.8" fill="none" transform="rotate(55 20 20)" opacity="0.55" />
      <circle cx="35" cy="16" r="2.5" fill="#C6A15B" opacity="0.85" />
    </svg>
  )
}
