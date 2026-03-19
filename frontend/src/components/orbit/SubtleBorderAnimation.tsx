import { useEffect, useRef } from 'react'

interface Props {
  width: number
  height: number
  radius?: number
  speed?: number
}

export default function SubtleBorderAnimation({ width, height, radius = 8, speed = 0.0006 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef  = useRef<number>(0)
  const progRef   = useRef<number>(Math.random())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    canvas.width  = width  * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const r = radius
    const w = width
    const h = height
    const SAMPLES = 600
    const points: { x: number; y: number }[] = []

    const arcLen = (Math.PI / 2) * r
    const s1 = w - 2 * r
    const s2 = s1 + arcLen
    const s3 = s2 + h - 2 * r
    const s4 = s3 + arcLen
    const s5 = s4 + w - 2 * r
    const s6 = s5 + arcLen
    const s7 = s6 + h - 2 * r
    const total = s7 + arcLen

    for (let i = 0; i < SAMPLES; i++) {
      const t = (i / SAMPLES) * total
      let pt = { x: 0, y: 0 }
      if      (t < s1) pt = { x: r + t, y: 0 }
      else if (t < s2) { const a = -Math.PI/2 + (t-s1)/r; pt = { x: w-r+Math.cos(a)*r, y: r+Math.sin(a)*r } }
      else if (t < s3) pt = { x: w, y: r+(t-s2) }
      else if (t < s4) { const a = (t-s3)/r; pt = { x: w-r+Math.cos(a)*r, y: h-r+Math.sin(a)*r } }
      else if (t < s5) pt = { x: w-r-(t-s4), y: h }
      else if (t < s6) { const a = Math.PI/2+(t-s5)/r; pt = { x: r+Math.cos(a)*r, y: h-r+Math.sin(a)*r } }
      else if (t < s7) pt = { x: 0, y: h-r-(t-s6) }
      else             { const a = Math.PI+(t-s7)/r; pt = { x: r+Math.cos(a)*r, y: r+Math.sin(a)*r } }
      points.push(pt)
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      // Static border
      ctx.beginPath()
      ctx.roundRect(0.5, 0.5, width-1, height-1, radius)
      ctx.strokeStyle = 'rgba(198,161,91,0.15)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Subtle trail
      const head  = Math.floor(progRef.current * SAMPLES) % SAMPLES
      const trail = Math.floor(0.12 * SAMPLES)

      for (let j = trail; j >= 0; j--) {
        const idx  = (head - j + SAMPLES) % SAMPLES
        const next = (idx + 1) % SAMPLES
        const alpha = (1 - j / trail) * 0.45
        ctx.beginPath()
        ctx.moveTo(points[idx].x, points[idx].y)
        ctx.lineTo(points[next].x, points[next].y)
        ctx.strokeStyle = `rgba(198,161,91,${alpha})`
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Tiny head dot
      const hp = points[head]
      ctx.beginPath()
      ctx.arc(hp.x, hp.y, 1.5, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(198,161,91,0.8)'
      ctx.fill()

      progRef.current += speed
      if (progRef.current >= 1) progRef.current -= 1
      frameRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(frameRef.current)
  }, [width, height, radius, speed])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 2,
        borderRadius: radius,
      }}
    />
  )
}
