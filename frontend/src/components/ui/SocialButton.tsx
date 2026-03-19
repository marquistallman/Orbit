import { useState } from 'react'
import type { ReactNode } from 'react'

interface Props {
  icon: ReactNode
  label: string
  onClick?: () => void
}

export default function SocialButton({ icon, label, onClick }: Props) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        padding: '9px 16px',
        background: hovered ? 'rgba(237,230,214,0.1)' : 'rgba(237,230,214,0.06)',
        border: '1px solid rgba(198,161,91,0.22)',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontFamily: "'Questrial', sans-serif",
        fontSize: 13,
        color: '#EDE6D6',
        fontWeight: 400,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
      {label}
    </button>
  )
}
