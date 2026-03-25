import { useEffect, useRef } from 'react'

interface Ring {
  rx: number
  ry: number
  tilt: number
  nodeAngle: number
  nodeSpeed: number
  nodeSize: number
  opacity: number
}

const RINGS: Ring[] = [
  { rx: 340, ry: 140, tilt: -12, nodeAngle: 30,  nodeSpeed: 0.0003, nodeSize: 7,  opacity: 0.18 },
  { rx: 260, ry: 108, tilt: -12, nodeAngle: 200, nodeSpeed: -0.0005, nodeSize: 5, opacity: 0.14 },
  { rx: 430, ry: 180, tilt: -12, nodeAngle: 120, nodeSpeed: 0.00018, nodeSize: 5, opacity: 0.10 },
]

export default function OrbitalBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number>(0)
  const anglesRef = useRef<number[]>(RINGS.map(r => r.nodeAngle * Math.PI / 180))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const cx = canvas.width / 2
      const cy = canvas.height / 2

      RINGS.forEach((ring, i) => {
        const tiltRad = ring.tilt * Math.PI / 180
        anglesRef.current[i] += ring.nodeSpeed

        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(tiltRad)

        // Draw ellipse ring
        ctx.beginPath()
        ctx.ellipse(0, 0, ring.rx, ring.ry, 0, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(198, 161, 91, ${ring.opacity})`
        ctx.lineWidth = 1
        ctx.stroke()

        // Draw orbiting node
        const angle = anglesRef.current[i]
        const nx = ring.rx * Math.cos(angle)
        const ny = ring.ry * Math.sin(angle)

        // Glow
        const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, ring.nodeSize * 3)
        grad.addColorStop(0, `rgba(198, 161, 91, 0.5)`)
        grad.addColorStop(1, `rgba(198, 161, 91, 0)`)
        ctx.beginPath()
        ctx.arc(nx, ny, ring.nodeSize * 3, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        // Node
        ctx.beginPath()
        ctx.arc(nx, ny, ring.nodeSize, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(198, 161, 91, 0.75)`
        ctx.fill()

        ctx.restore()
      })

      frameRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}
