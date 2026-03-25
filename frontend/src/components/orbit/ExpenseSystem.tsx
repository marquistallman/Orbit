import { useEffect, useRef } from 'react'
import type { ExpenseCategory } from '../../api/finance'

const SUBS: Record<string, { name: string; pct: number }[]> = {
  Housing:   [{ name: 'Rent', pct: 70 }, { name: 'Insurance', pct: 18 }, { name: 'Maintenance', pct: 12 }],
  Food:      [{ name: 'Groceries', pct: 55 }, { name: 'Restaurants', pct: 30 }, { name: 'Delivery', pct: 15 }],
  Transport: [{ name: 'Fuel', pct: 50 }, { name: 'Parking', pct: 30 }, { name: 'Transit', pct: 20 }],
  Other:     [{ name: 'Subscriptions', pct: 40 }, { name: 'Health', pct: 35 }, { name: 'Entertainment', pct: 25 }],
}

const COLORS: Record<string, string> = {
  Housing: '#C6A15B', Food: '#4a7fa5', Transport: '#4a9a59', Other: '#8C6A3E',
}

interface Props { categories: ExpenseCategory[] }

export default function ExpenseSystem({ categories }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef  = useRef<number>(0)
  const ctxRef    = useRef<CanvasRenderingContext2D | null>(null)
  const dimRef    = useRef({ W: 0, H: 0 })

  // Orbit angles - planets move along their orbit angle
  const angRef    = useRef<number[]>([])
  const satAngRef = useRef<number[][]>([])

  // Hover / zoom state
  const hovPlanet = useRef<number | null>(null)
  const hovSat    = useRef<{ p: number; s: number } | null>(null)
  const frozen    = useRef(false)
  const speedScale = useRef(1)  // 1 = full speed, 0 = stopped
  // Trail: last N positions per planet
  const trailRef  = useRef<{ x: number; y: number }[][]>(
    Array.from({ length: 4 }, () => [])
  )
  // Warp stars for zoom effect
  const warpRef   = useRef<{ x: number; y: number; angle: number; len: number; speed: number }[]>([])
  const warpInit  = useRef(false)
  const starsRef  = useRef<{ x: number; y: number; r: number; alpha: number; twinkle: number }[]>([])
  const starsInit = useRef(false)

  const zoom = useRef<{ active: boolean; planet: number; progress: number }>({
    active: false, planet: -1, progress: 0,
  })

  type Hit = { x: number; y: number; r: number; planet: number; sat?: number }
  const hits = useRef<Hit[]>([])

  // Planet screen positions (for hitbox accuracy)
  const planetPos = useRef<{ x: number; y: number }[]>([])

  const font = (size: number) => `${size}px Questrial, Arial, sans-serif`
  const boldFont = (size: number) => `bold ${size}px Questrial, Arial, sans-serif`

  // Draw a stylised label: name on top, gold percentage pill below
  const drawLabel = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    name: string, pct: number,
    W: number, alpha = 1,
    flip = false   // true = label goes below instead of above
  ) => {
    ctx.globalAlpha = alpha
    const fs  = Math.round(W * 0.024)
    const pfs = Math.round(W * 0.020)
    const lineH = fs + 4

    // If flip: y is the TOP of the label area, else it's the baseline
    const nameY = flip ? y + fs : y
    const pillY = flip ? y + lineH + 3 : y + 6

    // Name
    ctx.font = font(fs)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = 'rgba(237,230,214,0.85)'
    ctx.fillText(name, x, nameY)

    // Percentage pill
    const pill = `${pct}%`
    ctx.font = font(pfs)
    const pw = ctx.measureText(pill).width + 12
    const ph = pfs + 5
    const px = x - pw / 2

    ctx.fillStyle = 'rgba(198,161,91,0.12)'
    ctx.strokeStyle = 'rgba(198,161,91,0.45)'
    ctx.lineWidth = 0.8
    ctx.beginPath(); ctx.roundRect(px, pillY, pw, ph, ph / 2); ctx.fill(); ctx.stroke()

    ctx.fillStyle = '#C6A15B'
    ctx.textBaseline = 'middle'
    ctx.fillText(pill, x, pillY + ph / 2)

    ctx.globalAlpha = 1
    ctx.textBaseline = 'alphabetic'
  }

  const drawSystem = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    hits.current = []
    planetPos.current = []
    const cx = W / 2, cy = H / 2
    const z = zoom.current
    const sysAlpha = z.active ? Math.max(0, 1 - z.progress * 1.4) : 1

    if (sysAlpha <= 0) return

    // Background stars
    starsRef.current.forEach(s => {
      s.twinkle += 0.018
      const a = s.alpha * (0.7 + 0.3 * Math.sin(s.twinkle)) * sysAlpha
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(237,230,214,${a})`
      ctx.fill()
    })

    // Sun
    const sunR = W * 0.030
    const sg = ctx.createRadialGradient(cx - sunR * 0.25, cy - sunR * 0.25, 0, cx, cy, sunR)
    sg.addColorStop(0, '#FFFDE8'); sg.addColorStop(0.35, '#E8C97A')
    sg.addColorStop(0.75, '#C6A15B'); sg.addColorStop(1, '#8C6A3E88')
    ctx.globalAlpha = sysAlpha
    ctx.beginPath(); ctx.arc(cx, cy, sunR, 0, Math.PI * 2)
    ctx.fillStyle = sg; ctx.fill()
    ctx.globalAlpha = 1

    // Orbits — tilt like solar system
    const TILTS = [-12, -12, -12, -12] // degrees

    categories.forEach((cat, i) => {
      // Orbit is an ellipse: rx full, ry = rx * 0.35, tilted
      const rx     = W * (0.10 + i * 0.09)
      const ry     = rx * 0.28
      const tilt   = (TILTS[i % TILTS.length] * Math.PI) / 180
      const angle  = angRef.current[i]

      // Planet position on tilted ellipse
      const ex = Math.cos(angle) * rx
      const ey = Math.sin(angle) * ry
      const px = cx + ex * Math.cos(tilt) - ey * Math.sin(tilt)
      const py = cy + ex * Math.sin(tilt) + ey * Math.cos(tilt)
      planetPos.current[i] = { x: px, y: py }

      const pr     = W * (0.014 + (cat.percentage / 100) * 0.020)
      const col    = COLORS[cat.name] || '#C6A15B'
      const isHov  = hovPlanet.current === i
      const pAlpha = sysAlpha * (isHov ? 1 : 0.92)

      // Draw orbit ellipse
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(tilt)
      ctx.beginPath()
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(198,161,91,${0.14 * sysAlpha})`
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.restore()

      // Trail — thin glowing streak along orbit
      const trail = trailRef.current[i] || []
      if (trail.length > 1) {
        // Outer soft glow pass
        for (let t = 1; t < trail.length; t++) {
          const frac  = t / trail.length
          const alpha = frac * 0.22 * sysAlpha * Math.max(speedScale.current, 0.15)
          ctx.beginPath()
          ctx.moveTo(trail[t - 1].x, trail[t - 1].y)
          ctx.lineTo(trail[t].x, trail[t].y)
          ctx.strokeStyle = col + Math.round(alpha * 255).toString(16).padStart(2, '0')
          ctx.lineWidth = 4
          ctx.lineCap = 'round'
          ctx.stroke()
        }
        // Inner bright core pass
        for (let t = 1; t < trail.length; t++) {
          const frac  = t / trail.length
          const alpha = frac * 0.85 * sysAlpha * Math.max(speedScale.current, 0.15)
          ctx.beginPath()
          ctx.moveTo(trail[t - 1].x, trail[t - 1].y)
          ctx.lineTo(trail[t].x, trail[t].y)
          ctx.strokeStyle = col + Math.round(alpha * 255).toString(16).padStart(2, '0')
          ctx.lineWidth = 1.2
          ctx.lineCap = 'round'
          ctx.stroke()
        }
      }

      // Glow on hover
      if (isHov) {
        ctx.globalAlpha = sysAlpha
        const gl = ctx.createRadialGradient(px, py, 0, px, py, pr * 2.2)
        gl.addColorStop(0, col + '55'); gl.addColorStop(1, col + '00')
        ctx.beginPath(); ctx.arc(px, py, pr * 2.2, 0, Math.PI * 2)
        ctx.fillStyle = gl; ctx.fill()
        ctx.globalAlpha = 1
      }

      // Planet
      ctx.globalAlpha = pAlpha
      const pg = ctx.createRadialGradient(px - pr * 0.3, py - pr * 0.3, 0, px, py, pr)
      pg.addColorStop(0, col + 'ff')
      pg.addColorStop(0.55, col + 'cc')
      pg.addColorStop(1, col + '55')
      ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2)
      ctx.fillStyle = pg; ctx.fill()
      ctx.globalAlpha = 1

      // Record trail
      if (!trailRef.current[i]) trailRef.current[i] = []
      trailRef.current[i].push({ x: px, y: py })
      if (trailRef.current[i].length > 120) trailRef.current[i].shift()

      hits.current.push({ x: px, y: py, r: pr + 8, planet: i })

      // Label above planet on hover
      if (isHov) {
        const { H } = dimRef.current
        const labelH = Math.round(W * 0.024) * 2 + 20
        const flip   = (py - pr - 22 - labelH) < 6
        const ly     = flip ? py + pr + 10 : py - pr - 22
        drawLabel(ctx, px, ly, cat.name, cat.percentage, W, sysAlpha, flip)
      }
    })
  }

  const initWarp = (W: number, H: number) => {
    const cx = W / 2, cy = H / 2
    warpRef.current = Array.from({ length: 120 }, () => {
      // Spread origin across full canvas quadrants
      const angle = Math.random() * Math.PI * 2
      const dist  = 8 + Math.random() * Math.hypot(W, H) * 0.08
      return {
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        angle,
        len: 18 + Math.random() * 40,
        speed: 0.7 + Math.random() * 1.1,
      }
    })
  }

  const drawZoomed = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    const z = zoom.current
    if (z.planet < 0 || z.planet >= categories.length) return
    const p      = z.progress
    const cat    = categories[z.planet]
    const subs   = SUBS[cat.name] || []
    const col    = COLORS[cat.name] || '#C6A15B'
    const cx     = W / 2, cy = H / 2
    const pr     = W * 0.045 * Math.min(p * 1.5, 1)
    const alpha  = Math.min(p * 1.6, 1)

    // Background stars in zoomed view
    starsRef.current.forEach(s => {
      const a = s.alpha * (0.7 + 0.3 * Math.sin(s.twinkle)) * alpha
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(237,230,214,${a})`
      ctx.fill()
    })

    // Warp speed effect during transition
    if (p < 0.88) {
      const { W: CW, H: CH } = dimRef.current
      if (!warpInit.current) { initWarp(CW, CH); warpInit.current = true }
      const warpAlpha = Math.sin(p * Math.PI) * 0.85
      const cx2 = CW / 2, cy2 = CH / 2
      warpRef.current.forEach(star => {
        // Push origin outward as p increases — full canvas coverage
        const push    = p * Math.hypot(CW, CH) * 0.55 * star.speed
        const stretch = (star.len + p * 80) * star.speed
        const x1 = star.x + Math.cos(star.angle) * push
        const y1 = star.y + Math.sin(star.angle) * push
        const x2 = x1 + Math.cos(star.angle) * stretch
        const y2 = y1 + Math.sin(star.angle) * stretch
        const grad = ctx.createLinearGradient(x1, y1, x2, y2)
        grad.addColorStop(0, `rgba(237,230,214,0)`)
        grad.addColorStop(0.4, `rgba(237,230,214,${warpAlpha * 0.9})`)
        grad.addColorStop(1, `rgba(198,161,91,${warpAlpha * 0.4})`)
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2)
        ctx.strokeStyle = grad
        ctx.lineWidth = 0.8 + star.speed * 0.5
        ctx.lineCap = 'round'
        ctx.stroke()
      })
    } else {
      warpInit.current = false
    }

    ctx.globalAlpha = alpha

    // Central planet
    const pg = ctx.createRadialGradient(cx - pr * 0.3, cy - pr * 0.3, 0, cx, cy, pr)
    pg.addColorStop(0, col + 'ff'); pg.addColorStop(0.55, col + 'cc'); pg.addColorStop(1, col + '44')
    ctx.beginPath(); ctx.arc(cx, cy, pr, 0, Math.PI * 2)
    ctx.fillStyle = pg; ctx.fill()

    // Planet name
    ctx.font = font(Math.round(W * 0.028))
    ctx.fillStyle = 'rgba(237,230,214,0.75)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(cat.name, cx, cy)
    ctx.textBaseline = 'alphabetic'

    const STILTS = [-12, -12, -12]

    subs.forEach((sub, si) => {
      const rx    = W * (0.12 + si * 0.09) * Math.min(p * 1.2, 1)
      const ry    = rx * 0.28
      const tilt  = (STILTS[si % STILTS.length] * Math.PI) / 180
      const sa    = satAngRef.current[z.planet]?.[si] || 0
      const ex    = Math.cos(sa) * rx
      const ey    = Math.sin(sa) * ry
      const sx    = cx + ex * Math.cos(tilt) - ey * Math.sin(tilt)
      const sy    = cy + ex * Math.sin(tilt) + ey * Math.cos(tilt)
      const sr    = W * (0.010 + (sub.pct / 100) * 0.013)
      const isHov = hovSat.current?.p === z.planet && hovSat.current?.s === si

      // Orbit
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt)
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(198,161,91,${0.15 * alpha})`
      ctx.lineWidth = 1; ctx.stroke(); ctx.restore()

      // Glow
      if (isHov) {
        const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 2.5)
        gl.addColorStop(0, col + '55'); gl.addColorStop(1, col + '00')
        ctx.beginPath(); ctx.arc(sx, sy, sr * 2.5, 0, Math.PI * 2)
        ctx.fillStyle = gl; ctx.fill()
      }

      // Satellite
      const sg = ctx.createRadialGradient(sx - sr * 0.3, sy - sr * 0.3, 0, sx, sy, sr)
      sg.addColorStop(0, col + 'ee'); sg.addColorStop(0.6, col + 'aa'); sg.addColorStop(1, col + '33')
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2)
      ctx.fillStyle = sg; ctx.fill()

      hits.current.push({ x: sx, y: sy, r: sr + 8, planet: z.planet, sat: si })

      if (isHov) {
        const { H } = dimRef.current
        const labelH = Math.round(W * 0.024) * 2 + 20
        const flip   = sy - sr - 22 - labelH < 4
        const ly     = flip ? sy + sr + 10 : sy - sr - 22
        drawLabel(ctx, sx, ly, sub.name, sub.pct, W, 1, flip)
      }
    })

    ctx.globalAlpha = 1

    // Back hint
    ctx.font = font(Math.round(W * 0.022))
    ctx.fillStyle = `rgba(198,161,91,${0.6 * alpha})`
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
    ctx.fillText('← click to go back', 12, H - 10)
  }

  const tick = () => {
    const ctx = ctxRef.current
    const { W, H } = dimRef.current
    if (!ctx || !W || !H) { frameRef.current = requestAnimationFrame(tick); return }

    const z = zoom.current
    const isFrozen = frozen.current

    // Ease speed scale toward target (0 if frozen, 1 if not)
    const target = isFrozen ? 0 : 1
    speedScale.current += (target - speedScale.current) * 0.08

    const s = speedScale.current
    if (s > 0.001) {
      const speeds = [0.003, -0.002, 0.0025, -0.0018]
      categories.forEach((_, i) => { angRef.current[i] += speeds[i % speeds.length] * s })
      categories.forEach((cat, pi) => {
        const subs = SUBS[cat.name] || []
        subs.forEach((_, si) => { satAngRef.current[pi][si] += (0.005 - si * 0.001) * s })
      })
    }

    // Zoom progress
    if (z.active && z.progress < 1) z.progress = Math.min(z.progress + 0.04, 1)
    if (!z.active && z.progress > 0) {
      z.progress = Math.max(z.progress - 0.05, 0)
      if (z.progress === 0) z.planet = -1
    }

    ctx.clearRect(0, 0, W, H)
    hits.current = []

    drawSystem(ctx, W, H)
    if (z.active || z.progress > 0) drawZoomed(ctx, W, H)

    frameRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    if (!categories.length) return
    const canvas = canvasRef.current!
    const dpr = window.devicePixelRatio || 1

    // Init angles
    categories.forEach((_, i) => {
      angRef.current[i] = (i / categories.length) * Math.PI * 2
      const subs = SUBS[categories[i].name] || []
      satAngRef.current[i] = subs.map((_, si) => (si / subs.length) * Math.PI * 2)
    })

    const setup = () => {
      const W = canvas.offsetWidth, H = canvas.offsetHeight
      if (!W || !H) return
      canvas.width = W * dpr; canvas.height = H * dpr
      const ctx = canvas.getContext('2d')!
      ctx.scale(dpr, dpr)
      ctxRef.current = ctx; dimRef.current = { W, H }
      // Init background stars once
      if (!starsInit.current) {
        starsRef.current = Array.from({ length: 55 }, () => ({
          x: Math.random() * W,
          y: Math.random() * H,
          r: 0.4 + Math.random() * 0.9,
          alpha: 0.08 + Math.random() * 0.18,
          twinkle: Math.random() * Math.PI * 2,
        }))
        starsInit.current = true
      }
      cancelAnimationFrame(frameRef.current)
      frameRef.current = requestAnimationFrame(tick)
    }
    requestAnimationFrame(() => requestAnimationFrame(setup))

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const { W, H } = dimRef.current
      const mx = (e.clientX - rect.left) * (W / rect.width)
      const my = (e.clientY - rect.top)  * (H / rect.height)

      let fp: number | null = null
      let fs: { p: number; s: number } | null = null

      for (const h of hits.current) {
        const d = Math.hypot(mx - h.x, my - h.y)
        if (d <= h.r) {
          if (h.sat !== undefined) fs = { p: h.planet, s: h.sat }
          else if (!zoom.current.active) fp = h.planet
          break
        }
      }

      hovPlanet.current = fp
      hovSat.current    = fs
      frozen.current    = fp !== null || fs !== null
      canvas.style.cursor = frozen.current ? 'pointer' : 'default'
    }

    const onLeave = () => {
      hovPlanet.current = null; hovSat.current = null
      frozen.current = false; canvas.style.cursor = 'default'
    }

    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const { W, H } = dimRef.current
      const mx = (e.clientX - rect.left) * (W / rect.width)
      const my = (e.clientY - rect.top)  * (H / rect.height)
      const z  = zoom.current

      if (z.active) {
        zoom.current = { active: false, planet: z.planet, progress: z.progress }
        hovSat.current = null; frozen.current = false; return
      }

      for (const h of hits.current) {
        const d = Math.hypot(mx - h.x, my - h.y)
        if (d <= h.r && h.sat === undefined) {
          zoom.current = { active: true, planet: h.planet, progress: 0 }
          hovPlanet.current = null; frozen.current = false; return
        }
      }
    }

    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)
    canvas.addEventListener('click', onClick)
    return () => {
      cancelAnimationFrame(frameRef.current)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
      canvas.removeEventListener('click', onClick)
    }
  }, [categories])

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
}
