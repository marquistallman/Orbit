import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export default function AuthInput({ label, error, ...props }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontSize: 12,
        fontWeight: 500,
        color: '#C6A15B',
        fontFamily: "'Questrial', sans-serif",
        letterSpacing: 0.5,
      }}>
        {label}
      </label>
      <input
        {...props}
        style={{
          width: '100%',
          padding: '10px 14px',
          background: '#EDE6D6',
          border: 'none',
          borderRadius: 8,
          fontSize: 13,
          fontFamily: "'Questrial', sans-serif",
          color: '#2a2218',
          outline: 'none',
          transition: 'box-shadow 0.2s',
          boxShadow: error ? '0 0 0 1.5px #9a4a4a' : 'none',
          ...props.style,
        }}
        onFocus={e => {
          e.currentTarget.style.boxShadow = '0 0 0 2px rgba(198,161,91,0.6)'
        }}
        onBlur={e => {
          e.currentTarget.style.boxShadow = error ? '0 0 0 1.5px #9a4a4a' : 'none'
        }}
      />
      {error && (
        <span style={{ fontSize: 11, color: '#c47070' }}>{error}</span>
      )}
    </div>
  )
}
