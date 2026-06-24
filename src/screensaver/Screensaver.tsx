import { useEffect, useRef } from 'react'
import type { PublicConfig } from '@/lib/schema'
import { PacmanScreensaver } from './pacman/PacmanScreensaver'
import {
  TITLE_LINES,
  WARM,
  BLOCK_GLYPHS,
  COLOR_252,
  COLOR_245,
  COLOR_216,
  COLOR_196,
  COLOR_209,
  COLOR_255,
} from './pixelFont'
import {
  CrabScuttle,
  CrabPeek,
  FloatingParticle,
  CRAB_W,
  CRAB_COLOR,
  BIG_CRAB_OPEN,
  BIG_CRAB_BLINK,
  BIG_CRAB_H,
} from './crab'

type Egg = CrabScuttle | CrabPeek | FloatingParticle

interface Urgency {
  startMins: number
  urgencyMinutes: number
  endH: number
  endM: number
}

function computeUrgency(cfg: PublicConfig): Urgency | null {
  if (cfg.agenda.length === 0) return null
  const last = cfg.agenda[cfg.agenda.length - 1]
  const [h, m] = last.time.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  const endTotal = h * 60 + m
  const urgencyMinutes = Math.max(1, cfg.urgency_start_minutes_before_end)
  const startTotal = endTotal - urgencyMinutes
  return { startMins: startTotal, urgencyMinutes, endH: h, endM: m }
}

function getUrgency(u: Urgency | null): number {
  if (!u) return 0
  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60
  if (nowMins < u.startMins) return 0
  return (nowMins - u.startMins) / u.urgencyMinutes
}

export function Screensaver({ config }: { config: PublicConfig }) {
  if (config.mode === 'pacman') return <PacmanScreensaver config={config} />
  return <ClassicScreensaver config={config} />
}

function ClassicScreensaver({ config }: { config: PublicConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let rafId = 0
    let verbIdx = 0
    let lastVerbSwitch = performance.now()
    const eggs: Egg[] = []
    let nextEggTime = performance.now() + randRange(5000, 12000)
    let nextPeekTime = performance.now() + randRange(90000, 180000)
    const tStart = performance.now()
    const urgency = computeUrgency(config)

    let fontSize = 12
    let cellW = 8
    let cellH = 16
    let cols = 80
    let rows = 40

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      fontSize = Math.max(8, Math.min(20, Math.floor(w * 0.018)))
      ctx.font = `${fontSize}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`
      cellW = ctx.measureText('M').width
      cellH = fontSize * 1.3
      cols = Math.max(20, Math.floor(w / cellW))
      rows = Math.max(15, Math.floor(h / cellH))
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    const maxCrabs = config.max_crabs ?? 5
    // Spawn one crab immediately (if any allowed)
    if (maxCrabs > 0) eggs.push(new CrabScuttle(cols, rows))

    const drawChar = (y: number, x: number, ch: string, color: string, bold = false) => {
      if (y < 0 || y >= rows || x < 0 || x >= cols || ch === ' ') return
      ctx.fillStyle = color
      const glyph = BLOCK_GLYPHS[ch]
      if (glyph) {
        const px = x * cellW
        const py = y * cellH
        for (const [bx, by, bw, bh] of glyph) {
          // Ceil sizes so adjacent rects butt without gaps.
          ctx.fillRect(
            Math.floor(px + bx * cellW),
            Math.floor(py + by * cellH),
            Math.ceil(bw * cellW) + 1,
            Math.ceil(bh * cellH) + 1,
          )
        }
        return
      }
      ctx.font = `${bold ? 'bold ' : ''}${fontSize}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      ctx.fillText(ch, x * cellW, y * cellH)
    }

    const drawLine = (y: number, x: number, s: string, color: string, bold = false) => {
      for (let i = 0; i < s.length; i++) drawChar(y, x + i, s[i], color, bold)
    }

    const drawLogo = (now: number) => {
      const t = (now - tStart) / 1000
      const titleW = Math.max(...TITLE_LINES.map((l) => l.length))
      const startY = Math.max(1, Math.floor(rows / 2) - TITLE_LINES.length - 3)
      const startX = Math.max(0, Math.floor((cols - titleW) / 2))

      for (let i = 0; i < TITLE_LINES.length; i++) {
        const line = TITLE_LINES[i]
        for (let j = 0; j < line.length; j++) {
          const ch = line[j]
          if (ch === ' ') continue
          const shimmer = Math.sin(j * 0.3 + t * 0.4 + i * 0.5)
          const idx = Math.floor(((shimmer + 1) / 2) * WARM.length) % WARM.length
          drawChar(startY + i, startX + j, ch, WARM[idx], true)
        }
      }

      // Subtitle: "C O D E   C U R I O U S"
      const subWord = config.subtitle || 'CODE CURIOUS'
      const subtitle = subWord.split('').join('   ')
      const subY = startY + TITLE_LINES.length + 1
      const subX = Math.max(0, Math.floor((cols - subtitle.length) / 2))
      for (let j = 0; j < subtitle.length; j++) {
        const shimmer = Math.sin(j * 0.4 + t * 0.3)
        const idx = Math.floor(((shimmer + 1) / 2) * WARM.length) % WARM.length
        drawChar(subY, subX + j, subtitle[j], WARM[idx], true)
      }

      // Verb
      const verbs = config.verbs.length > 0 ? config.verbs : ['...']
      const verb = verbs[verbIdx % verbs.length]
      const verbY = subY + 2
      const verbX = Math.max(0, Math.floor((cols - verb.length) / 2))
      const glow = Math.floor(((Math.sin(t * 0.5) + 1) / 2) * 3)
      const glowColors = ['#585858', '#8a8a8a', '#bcbcbc', '#eeeeee']
      drawLine(verbY, verbX, verb, glowColors[glow])

      // Agenda
      const u = getUrgency(urgency)
      const agendaLines = config.agenda.map((a) => `${a.time}   ${a.label}`)
      const agendaStartY = rows - 3 - agendaLines.length - 1
      for (let i = 0; i < agendaLines.length; i++) {
        let line = agendaLines[i]
        let ax = Math.max(0, Math.floor((cols - line.length) / 2))
        if (i < agendaLines.length - 1) {
          drawLine(agendaStartY + i, ax, line, COLOR_252)
        } else {
          if (u >= 1.0) {
            const msgs = config.go_home_messages
            if (msgs.length > 0) {
              const idx = Math.min(Math.floor((u - 1.0) * 5), msgs.length - 1)
              const timeStr = `${String(urgency?.endH ?? 20).padStart(2, '0')}:${String(urgency?.endM ?? 0).padStart(2, '0')}`
              line = `${timeStr}   ${msgs[idx]}`
              ax = Math.max(0, Math.floor((cols - line.length) / 2))
            }
          }
          if (u < 0.2) {
            drawLine(agendaStartY + i, ax, line, COLOR_252)
          } else if (u < 0.5) {
            const pulse = (Math.sin(t * 1.5) + 1) / 2
            drawLine(agendaStartY + i, ax, line, pulse < 0.5 ? COLOR_252 : COLOR_216, true)
          } else if (u < 0.8) {
            const pulse = (Math.sin(t * 3) + 1) / 2
            drawLine(agendaStartY + i, ax, line, pulse > 0.3 ? COLOR_196 : COLOR_209, true)
          } else {
            const flash = Math.floor(t * 4) % 2
            drawLine(agendaStartY + i, ax, line, flash ? COLOR_196 : COLOR_255, true)
          }
        }
      }

      // Date / venue / wifi
      const dateLine =
        config.event_date && config.venue
          ? `${formatDate(config.event_date)}  \u00b7  ${config.venue}`
          : config.event_date
            ? formatDate(config.event_date)
            : config.venue
      const dateY = rows - 3
      const dateX = Math.max(0, Math.floor((cols - dateLine.length) / 2))
      drawLine(dateY, dateX, dateLine, COLOR_245)
      if (config.wifi) {
        const wifiLine = `WiFi:  ${config.wifi}`
        const wifiY = rows - 2
        const wifiX = Math.max(0, Math.floor((cols - wifiLine.length) / 2))
        drawLine(wifiY, wifiX, wifiLine, COLOR_252, true)
      }
    }

    const drawEggs = (now: number) => {
      const t = (now - tStart) / 1000
      for (const e of eggs) {
        if (e instanceof CrabScuttle) {
          e.step(cols, rows)
          if (e.done) continue
          const { lines } = e.sprite()
          const ix = Math.floor(e.x)
          const iy = Math.floor(e.y)
          for (let i = 0; i < lines.length; i++) {
            drawLine(iy + i, ix, lines[i], CRAB_COLOR, true)
          }
          if (e.accessory) {
            const bob = Math.sin(t * 2 + e.x) * 0.4
            drawChar(iy - 1 + Math.floor(bob), ix + Math.floor(CRAB_W / 2), e.accessory.ch, e.accessory.color, true)
          }
          if (e.mode === 'chat') {
            const dots = Math.floor(e.frame / 10) % 2 === 0 ? '...' : ' . '
            drawLine(iy - 1, ix + Math.floor(CRAB_W / 2) - 1, dots, COLOR_252)
          }
        } else if (e instanceof CrabPeek) {
          e.step(cols, rows)
          if (e.done) continue
          const sprite = e.isBlinking() ? BIG_CRAB_BLINK : BIG_CRAB_OPEN
          const ix = Math.floor(e.x)
          const iy = Math.floor(e.y)
          for (let i = 0; i < BIG_CRAB_H; i++) {
            drawLine(iy + i, ix, sprite[i], CRAB_COLOR, true)
          }
        } else {
          e.step(cols, rows)
          if (e.done) continue
          drawChar(Math.floor(e.y), Math.floor(e.x), e.char, e.color)
        }
      }
      // crab collision chat
      const crabs = eggs.filter(
        (e): e is CrabScuttle =>
          e instanceof CrabScuttle && !e.done && e.mode === 'scuttle' && e.chatCooldown <= 0,
      )
      for (let i = 0; i < crabs.length; i++) {
        const a = crabs[i]
        if (a.mode !== 'scuttle') continue
        for (let j = i + 1; j < crabs.length; j++) {
          const b = crabs[j]
          if (b.mode === 'scuttle' && Math.abs(a.x - b.x) < CRAB_W && Math.abs(a.y - b.y) < 3) {
            const chatLen = 30 + Math.floor(Math.random() * 31)
            a.mode = 'chat'
            b.mode = 'chat'
            a.chatTimer = chatLen
            b.chatTimer = chatLen
            a.chatPartner = b
            b.chatPartner = a
            break
          }
        }
      }
      // prune
      for (let i = eggs.length - 1; i >= 0; i--) {
        if (eggs[i].done) eggs.splice(i, 1)
      }
    }

    const tick = (now: number) => {
      if (now - lastVerbSwitch > 8000) {
        const verbs = config.verbs.length > 0 ? config.verbs : ['...']
        verbIdx = (verbIdx + 1) % verbs.length
        lastVerbSwitch = now
      }
      if (now > nextEggTime) {
        const activeCrabs = eggs.filter((e) => e instanceof CrabScuttle && !e.done).length
        if (activeCrabs < maxCrabs) {
          eggs.push(new CrabScuttle(cols, rows))
          nextEggTime = now + randRange(2000, 5000)
        } else {
          const n = 1 + Math.floor(Math.random() * 3)
          for (let i = 0; i < n; i++) eggs.push(new FloatingParticle(cols, rows, WARM))
          nextEggTime = now + randRange(8000, 18000)
        }
      }
      if (now > nextPeekTime) {
        const hasPeek = eggs.some((e) => e instanceof CrabPeek && !e.done)
        if (!hasPeek) {
          eggs.push(new CrabPeek(cols, rows))
          const centerX = cols / 2
          for (const e of eggs) {
            if (e instanceof CrabScuttle && !e.done) {
              e.mode = 'flee'
              e.chatPartner = null
              e.dx = (e.x < centerX ? -1 : 1) * (0.8 + Math.random() * 0.7)
            }
          }
        }
        nextPeekTime = now + randRange(120000, 240000)
      }

      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      drawLogo(now)
      drawEggs(now)

      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
    }
  }, [config])

  return (
    <canvas
      ref={canvasRef}
      className="block w-screen h-screen bg-black"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

function randRange(a: number, b: number): number {
  return a + Math.random() * (b - a)
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
