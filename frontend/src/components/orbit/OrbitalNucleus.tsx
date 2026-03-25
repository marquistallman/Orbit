import { useEffect, useRef } from 'react'

const APPS = [
  { color: '#C6A15B', speed: 0.0007,  rxF: 0.18, ryF: 0.16, startAngle: 0.8 },
  { color: '#6ab4c8', speed: -0.0005, rxF: 0.30, ryF: 0.27, startAngle: 2.4 },
  { color: '#8C6A3E', speed: 0.0003,  rxF: 0.42, ryF: 0.38, startAngle: 4.1 },
]
const TILT = -20

export default function OrbitalNucleus() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef  = useRef<number>(0)
  const anglesRef = useRef(APPS.map(a => a.startAngle))
  const pulseRef  = useRef(0)

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

    // True center
    const cx = W * 0.50
    const cy = H * 0.50

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      pulseRef.current += 0.025

      APPS.forEach(app => {
        const rx = W * app.rxF
        const ry = H * app.ryF
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(tiltRad)
        ctx.beginPath()
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(198,161,91,0.28)'
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.restore()
      })

      APPS.forEach((app, i) => {
        anglesRef.current[i] += app.speed
        const angle = anglesRef.current[i]
        const rx = W * app.rxF
        const ry = H * app.ryF
        const nx0 = rx * Math.cos(angle)
        const ny0 = ry * Math.sin(angle)
        const nx = cx + nx0 * Math.cos(tiltRad) - ny0 * Math.sin(tiltRad)
        const ny = cy + nx0 * Math.sin(tiltRad) + ny0 * Math.cos(tiltRad)

        const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, 8)
        g.addColorStop(0, app.color + 'aa')
        g.addColorStop(1, app.color + '00')
        ctx.beginPath()
        ctx.arc(nx, ny, 8, 0, Math.PI * 2)
        ctx.fillStyle = g
        ctx.fill()

        ctx.beginPath()
        ctx.arc(nx, ny, 3.5, 0, Math.PI * 2)
        ctx.fillStyle = app.color
        ctx.fill()
      })

      const pulse = Math.sin(pulseRef.current) * 0.5 + 0.5
      const coreR = 11 + pulse * 4
      ;[36, 24, 15].forEach((r, idx) => {
        const alpha = [0.05, 0.09, 0.15][idx] * (0.7 + pulse * 0.3)
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
  }, [])

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
}
