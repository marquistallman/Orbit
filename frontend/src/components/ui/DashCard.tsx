import { useRef, useEffect, useState, type ReactNode } from 'react'
import SubtleBorderAnimation from '../orbit/SubtleBorderAnimation'

interface Props {
  children: ReactNode
  style?: React.CSSProperties
  speed?: number
}

export default function DashCard({ children, style, speed = 0.0006 }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!ref.current) return
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        setSize({
          width:  Math.round(e.contentRect.width),
          height: Math.round(e.contentRect.height),
        })
      }
    })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        background: '#222222',
        borderRadius: 8,
        padding: '14px 16px',
        ...style,
      }}
    >
      {size.width > 0 && size.height > 0 && (
        <SubtleBorderAnimation width={size.width} height={size.height} speed={speed} />
      )}
      <div style={{ position: 'relative', zIndex: 3 }}>
        {children}
      </div>
    </div>
  )
}
