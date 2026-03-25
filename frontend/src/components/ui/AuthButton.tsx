import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useState } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  loading?: boolean
  variant?: 'primary' | 'social'
}

export default function AuthButton({ children, loading, variant = 'primary', ...props }: Props) {
  const [hovered, setHovered] = useState(false)

  const isPrimary = variant === 'primary'

  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        padding: isPrimary ? '11px 20px' : '9px 20px',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: isPrimary ? 600 : 400,
        fontFamily: "'Questrial', sans-serif",
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        letterSpacing: isPrimary ? 0.5 : 0,
        opacity: loading ? 0.6 : 1,
        ...(isPrimary ? {
          background: hovered
            ? 'linear-gradient(135deg, #8C6A3E, #C6A15B)'
            : 'transparent',
          border: '1px solid #C6A15B',
          color: '#C6A15B',
          boxShadow: hovered ? '0 0 16px rgba(198,161,91,0.2)' : 'none',
        } : {
          background: hovered ? 'rgba(237,230,214,0.12)' : 'rgba(237,230,214,0.07)',
          border: '1px solid rgba(198,161,91,0.25)',
          color: '#EDE6D6',
        }),
        ...props.style,
      }}
    >
      {loading ? (
        <span style={{
          width: 14, height: 14,
          border: '2px solid rgba(198,161,91,0.3)',
          borderTop: '2px solid #C6A15B',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
          display: 'inline-block',
        }} />
      ) : children}
    </button>
  )
}
