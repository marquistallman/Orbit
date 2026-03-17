import { useRef, useEffect, useState, type ReactNode } from 'react'
import CardBorderAnimation from '../orbit/CardBorderAnimation'

interface Props {
  children: ReactNode
  maxWidth?: number
}

export default function AuthCard({ children, maxWidth = 360 }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: maxWidth, height: 0 })

  useEffect(() => {
    if (!cardRef.current) return
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        setSize({
          width: Math.round(entry.contentRect.width),
          height: Math.round(entry.contentRect.height),
        })
      }
    })
    obs.observe(cardRef.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={cardRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth,
        background: 'rgba(37, 35, 30, 0.95)',
        borderRadius: 12,
        padding: '32px 28px',
        backdropFilter: 'blur(16px)',
      }}
    >
      {size.height > 0 && (
        <CardBorderAnimation
          width={size.width}
          height={size.height}
          radius={12}
          speed={0.0012}
          trailLength={0.2}
        />
      )}
      <div style={{ position: 'relative', zIndex: 3 }}>
        {children}
      </div>
    </div>
  )
}
