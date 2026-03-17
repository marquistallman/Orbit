import { useEffect, useRef } from 'react'

interface Props {
  width: number
  height: number
  radius?: number
  color?: string
  speed?: number
  trailLength?: number
}

export default function CardBorderAnimation({
  width,
  height,
  radius = 12,
  color = '#C6A15B',
  speed = 0.0012,
  trailLength = 0.22,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number>(0)
  const progressRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1

    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const r = radius
    const w = width
    const h = height
    const SAMPLES = 1200
    const points: { x: number; y: number }[] = []

    // Build perimeter using a proper path sampling approach
    // We trace the rounded rect as: 4 straight edges + 4 quarter-circle arcs
    // Going clockwise from top-left corner arc

    // Arc lengths
    const arcLen = (Math.PI / 2) * r
    const straightTop    = w - 2 * r
    const straightRight  = h - 2 * r
    const straightBottom = w - 2 * r
    const straightLeft   = h - 2 * r
    const totalLen = straightTop + arcLen + straightRight + arcLen + straightBottom + arcLen + straightLeft + arcLen

    for (let i = 0; i < SAMPLES; i++) {
      const t = (i / SAMPLES) * totalLen
      let pt = { x: 0, y: 0 }

      // Segment boundaries
      const s1 = straightTop
      const s2 = s1 + arcLen
      const s3 = s2 + straightRight
      const s4 = s3 + arcLen
      const s5 = s4 + straightBottom
      const s6 = s5 + arcLen
      const s7 = s6 + straightLeft
      // s8 = s7 + arcLen = totalLen

      if (t < s1) {
        // Top edge: left to right
        pt = { x: r + t, y: 0 }
      } else if (t < s2) {
        // Top-right corner arc: -PI/2 to 0
        const a = -Math.PI / 2 + ((t - s1) / r)
        pt = { x: w - r + Math.cos(a) * r, y: r + Math.sin(a) * r }
      } else if (t < s3) {
        // Right edge: top to bottom
        pt = { x: w, y: r + (t - s2) }
      } else if (t < s4) {
        // Bottom-right corner arc: 0 to PI/2
        const a = ((t - s3) / r)
        pt = { x: w - r + Math.cos(a) * r, y: h - r + Math.sin(a) * r }
      } else if (t < s5) {
        // Bottom edge: right to left
        pt = { x: w - r - (t - s4), y: h }
      } else if (t < s6) {
        // Bottom-left corner arc: PI/2 to PI
        const a = Math.PI / 2 + ((t - s5) / r)
        pt = { x: r + Math.cos(a) * r, y: h - r + Math.sin(a) * r }
      } else if (t < s7) {
        // Left edge: bottom to top
        pt = { x: 0, y: h - r - (t - s6) }
      } else {
        // Top-left corner arc: PI to 3PI/2
        const a = Math.PI + ((t - s7) / r)
        pt = { x: r + Math.cos(a) * r, y: r + Math.sin(a) * r }
      }

      points.push(pt)
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      // Static border
      ctx.beginPath()
      ctx.roundRect(0.5, 0.5, width - 1, height - 1, radius)
      ctx.strokeStyle = 'rgba(198, 161, 91, 0.22)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Animated trail
      const head = Math.floor(progressRef.current * SAMPLES) % SAMPLES
      const trail = Math.floor(trailLength * SAMPLES)

      for (let j = trail; j >= 0; j--) {
        const idx  = (head - j + SAMPLES) % SAMPLES
        const next = (idx + 1) % SAMPLES
        const alpha = (1 - j / trail) * 0.85

        ctx.beginPath()
        ctx.moveTo(points[idx].x, points[idx].y)
        ctx.lineTo(points[next].x, points[next].y)
        ctx.strokeStyle = `rgba(198, 161, 91, ${alpha})`
        ctx.lineWidth = j < trail * 0.08 ? 2.5 : 1.5
        ctx.stroke()
      }

      // Head glow
      const hp = points[head]
      const grd = ctx.createRadialGradient(hp.x, hp.y, 0, hp.x, hp.y, 10)
      grd.addColorStop(0, 'rgba(198, 161, 91, 0.85)')
      grd.addColorStop(1, 'rgba(198, 161, 91, 0)')
      ctx.beginPath()
      ctx.arc(hp.x, hp.y, 10, 0, Math.PI * 2)
      ctx.fillStyle = grd
      ctx.fill()

      // Head dot
      ctx.beginPath()
      ctx.arc(hp.x, hp.y, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()

      progressRef.current += speed
      if (progressRef.current >= 1) progressRef.current -= 1

      frameRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(frameRef.current)
  }, [width, height, radius, color, speed, trailLength])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 2,
        borderRadius: radius,
      }}
    />
  )
}
