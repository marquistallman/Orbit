import { useEffect, useRef } from 'react'

export interface OrbitalApp {
  name: string
  color: string
}

// Precomputed orbit tracks for up to 6 apps
const ORBIT_SLOTS = [
  { rxF: 0.18, ryF: 0.16, speed:  0.0007, startAngle: 0.8 },
  { rxF: 0.30, ryF: 0.27, speed: -0.0005, startAngle: 2.4 },
  { rxF: 0.42, ryF: 0.38, speed:  0.0003, startAngle: 4.1 },
  { rxF: 0.53, ryF: 0.47, speed: -0.0004, startAngle: 1.2 },
  { rxF: 0.62, ryF: 0.55, speed:  0.0006, startAngle: 3.7 },
  { rxF: 0.70, ryF: 0.63, speed: -0.0003, startAngle: 5.0 },
]
const TILT = -20

interface Props {
  apps?: OrbitalApp[]
}

export default function OrbitalNucleus({ apps = [] }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef  = useRef<number>(0)
  const appsRef   = useRef<OrbitalApp[]>(apps)

  // Keep appsRef in sync without restarting the animation loop
  appsRef.current = apps

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const tiltRad = TILT * Math.PI / 180
    const W = 500
    const H = 420
    canvas.width  = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    const cx = W * 0.50
    const cy = H * 0.50

    const angles = ORBIT_SLOTS.map(s => s.startAngle)
    let pulse = 0

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      pulse += 0.025

      const currentApps = appsRef.current
      const count = Math.min(currentApps.length, ORBIT_SLOTS.length)

      // Draw orbit rings
      for (let i = 0; i < count; i++) {
        const slot = ORBIT_SLOTS[i]
        const rx = W * slot.rxF
        const ry = H * slot.ryF
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(tiltRad)
        ctx.beginPath()
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(198,161,91,0.28)'
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.restore()
      }

      // Draw orbiting dots
      for (let i = 0; i < count; i++) {
        const slot = ORBIT_SLOTS[i]
        angles[i] += slot.speed
        const angle = angles[i]
        const rx = W * slot.rxF
        const ry = H * slot.ryF
        const nx0 = rx * Math.cos(angle)
        const ny0 = ry * Math.sin(angle)
        const nx = cx + nx0 * Math.cos(tiltRad) - ny0 * Math.sin(tiltRad)
        const ny = cy + nx0 * Math.sin(tiltRad) + ny0 * Math.cos(tiltRad)

        const color = currentApps[i].color
        const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, 8)
        g.addColorStop(0, color + 'aa')
        g.addColorStop(1, color + '00')
        ctx.beginPath()
        ctx.arc(nx, ny, 8, 0, Math.PI * 2)
        ctx.fillStyle = g
        ctx.fill()

        ctx.beginPath()
        ctx.arc(nx, ny, 3.5, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
      }

      // Draw nucleus core
      const p = Math.sin(pulse) * 0.5 + 0.5
      const coreR = 11 + p * 4
      ;[36, 24, 15].forEach((r, idx) => {
        const alpha = [0.05, 0.09, 0.15][idx] * (0.7 + p * 0.3)
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(198,161,91,${alpha})`
        ctx.fill()
      })
      const coreGrad = ctx.createRadialGradient(cx - 2, cy - 2, 0, cx, cy, coreR)
      coreGrad.addColorStop(0, '#FFFDE8')
      coreGrad.addColorStop(0.3, '#E8C97A')
      coreGrad.addColorStop(0.7, '#C6A15B')
      coreGrad.addColorStop(1,   '#8C6A3E')
      ctx.beginPath()
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2)
      ctx.fillStyle = coreGrad
      ctx.fill()

      frameRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frameRef.current)
  }, []) // run once; appsRef keeps current data

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
}
