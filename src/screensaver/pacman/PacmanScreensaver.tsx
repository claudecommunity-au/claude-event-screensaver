import { useEffect, useRef } from 'react'
import type { PublicConfig } from '@/lib/schema'
import { TITLE_LINES, WARM, BLOCK_GLYPHS } from '../pixelFont'
import {
  MAZE_COLS,
  MAZE_ROWS,
  AGENT_START,
  GHOST_HOME,
  GHOST_EXIT,
  SCATTER_CORNERS,
  allTokens,
  bfsStep,
  greedyStep,
  randomStep,
  fleeStep,
  manhattan,
  isWallForAgent,
  isWallForGhost,
  isSolidWall,
  isDoor,
  type TileVec,
} from './maze'
import { Mover, Ghost } from './entities'
import {
  COL_BG,
  COL_WALL,
  COL_WALL_GLOW,
  COL_TOKEN,
  COL_POWER,
  COL_AGENT,
  COL_FRIGHT,
  COL_FRIGHT_END,
  COL_EYE,
  COL_PUPIL,
  COL_TEXT,
  COL_TEXT_DIM,
  COL_ACCENT,
  GHOST_SPECS,
  GHOST_BONUS_BASE,
  FRIGHT_FRAMES,
  CONTEXT_WINDOW,
  TOKENS_PER_PELLET,
  TOKENS_PER_POWER,
} from './theme'

const STEP_MS = 1000 / 60
const AGENT_SPEED = 0.13 // tiles per logic step
const GHOST_SPEED = 0.115
const FRIGHT_SPEED = 0.078
const EATEN_SPEED = 0.26
const LEAVING_SPEED = 0.1
const SCATTER_FRAMES = 7 * 60
const CHASE_FRAMES = 20 * 60
const DEATH_FRAMES = 50
const HOUSE_CENTER: TileVec = { c: 13, r: 14 }

interface Layout {
  tile: number
  mazeX: number
  mazeY: number
  mazeW: number
  mazeH: number
  titleH: number
  pad: number
  hasPanels: boolean
  panelW: number
  width: number
  height: number
}

export function PacmanScreensaver({ config }: { config: PublicConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // --- mutable game state -------------------------------------------------
    // token grid: 0 empty, 1 token, 2 power
    const grid = new Uint8Array(MAZE_COLS * MAZE_ROWS)
    const seedTokens = () => {
      grid.fill(0)
      const { tokens, power } = allTokens()
      for (const t of tokens) grid[t.r * MAZE_COLS + t.c] = 1
      for (const p of power) grid[p.r * MAZE_COLS + p.c] = 2
    }
    seedTokens()

    const agent = new Mover(AGENT_START, AGENT_SPEED)
    let facing: TileVec = { c: -1, r: 0 }
    let tokenCount = 0
    let tokensShown = 0
    let contextTokens = 0
    let compactFlash = 0
    let frame = 0

    // ghosts + their global chase/scatter rhythm and the power-token window
    const spawnGhosts = (baseFrame: number): Ghost[] => {
      const n = clamp(config.pacman_ghosts ?? 4, 0, GHOST_SPECS.length)
      const out: Ghost[] = []
      for (let i = 0; i < n; i++) {
        const spec = GHOST_SPECS[i]
        out.push(
          new Ghost(GHOST_HOME[i], GHOST_SPEED, spec.color, spec.name, SCATTER_CORNERS[i], baseFrame + 30 + i * 80),
        )
      }
      return out
    }
    let ghosts = spawnGhosts(0)
    let globalChase = false
    let modeTimer = SCATTER_FRAMES
    let frightTimer = 0
    let eatChain = 0
    let dying = 0
    const popups: { x: number; y: number; text: string; life: number }[] = []

    // --- layout + static wall layer ----------------------------------------
    let layout: Layout = {
      tile: 16,
      mazeX: 0,
      mazeY: 0,
      mazeW: 0,
      mazeH: 0,
      titleH: 0,
      pad: 20,
      hasPanels: false,
      panelW: 0,
      width: 0,
      height: 0,
    }
    let wallCanvas: HTMLCanvasElement | null = null

    const computeLayout = (): Layout => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const pad = 20
      const titleH = clamp(height * 0.15, 64, 150)
      const bottomH = 44
      const availW = width - 2 * pad
      const availH = height - titleH - bottomH - 2 * pad
      const tile = Math.max(6, Math.floor(Math.min(availW / MAZE_COLS, availH / MAZE_ROWS)))
      const mazeW = tile * MAZE_COLS
      const mazeH = tile * MAZE_ROWS
      const mazeX = Math.floor((width - mazeW) / 2)
      const mazeY = Math.floor(titleH + pad + (availH - mazeH) / 2)
      const panelW = mazeX - 2 * pad
      const hasPanels = panelW >= 200
      return { tile, mazeX, mazeY, mazeW, mazeH, titleH, pad, hasPanels, panelW, width, height }
    }

    // Pre-render the (static) maze walls once per resize, then blit each frame.
    // Classic look: neon lines tracing the boundary between walls and corridors,
    // inset slightly so a one-cell-thick wall reads as a clean double line.
    const renderWalls = () => {
      const { tile, mazeW, mazeH } = layout
      const dpr = window.devicePixelRatio || 1
      const off = document.createElement('canvas')
      off.width = Math.floor(mazeW * dpr)
      off.height = Math.floor(mazeH * dpr)
      const o = off.getContext('2d')
      if (!o) return
      o.scale(dpr, dpr)
      o.strokeStyle = COL_WALL
      o.lineWidth = Math.max(1.5, tile * 0.14)
      o.lineCap = 'round'
      o.lineJoin = 'round'
      o.shadowColor = COL_WALL_GLOW
      o.shadowBlur = tile * 0.45
      const m = tile * 0.2 // inset from the cell boundary toward the wall interior
      for (let r = 0; r < MAZE_ROWS; r++) {
        for (let c = 0; c < MAZE_COLS; c++) {
          if (!isSolidWall(c, r)) continue
          const x0 = c * tile
          const y0 = r * tile
          const x1 = x0 + tile
          const y1 = y0 + tile
          const up = isSolidWall(c, r - 1)
          const down = isSolidWall(c, r + 1)
          const left = isSolidWall(c - 1, r)
          const right = isSolidWall(c + 1, r)
          o.beginPath()
          // a corridor-facing side gets a line, with its ends trimmed when the
          // perpendicular side is also open (gives rounded corners)
          if (!up) {
            o.moveTo(left ? x0 : x0 + m, y0 + m)
            o.lineTo(right ? x1 : x1 - m, y0 + m)
          }
          if (!down) {
            o.moveTo(left ? x0 : x0 + m, y1 - m)
            o.lineTo(right ? x1 : x1 - m, y1 - m)
          }
          if (!left) {
            o.moveTo(x0 + m, up ? y0 : y0 + m)
            o.lineTo(x0 + m, down ? y1 : y1 - m)
          }
          if (!right) {
            o.moveTo(x1 - m, up ? y0 : y0 + m)
            o.lineTo(x1 - m, down ? y1 : y1 - m)
          }
          o.stroke()
        }
      }
      // ghost-house door: a thin pink bar across the door cells
      o.shadowBlur = 0
      o.strokeStyle = '#ff9ce0'
      o.lineWidth = Math.max(2, tile * 0.16)
      for (let r = 0; r < MAZE_ROWS; r++) {
        for (let c = 0; c < MAZE_COLS; c++) {
          if (!isDoor(c, r)) continue
          o.beginPath()
          o.moveTo(c * tile, r * tile + tile * 0.5)
          o.lineTo(c * tile + tile, r * tile + tile * 0.5)
          o.stroke()
        }
      }
      wallCanvas = off
    }

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      layout = computeLayout()
      renderWalls()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    const isDanger = (g: Ghost) => g.mode === 'chase' || g.mode === 'scatter'

    // --- agent brain: eat frightened ghosts, flee danger, else chase tokens -
    const agentBrain = (c: number, r: number, dir: TileVec): TileVec | null => {
      // 1. hunt a frightened ghost
      const fright = ghosts.filter((g) => g.mode === 'frightened')
      if (fright.length) {
        const step = bfsStep({ c, r }, (tc, tr) => fright.some((g) => g.c === tc && g.r === tr), isWallForAgent)
        if (step) {
          facing = step
          return step
        }
      }
      // 2. flee a nearby chasing ghost
      let nearest: Ghost | null = null
      let nd = Infinity
      for (const g of ghosts) {
        if (!isDanger(g)) continue
        const d = manhattan({ c, r }, { c: g.c, r: g.r })
        if (d < nd) {
          nd = d
          nearest = g
        }
      }
      if (nearest && nd <= 5) {
        const step = fleeStep({ c, r }, { c: nearest.c, r: nearest.r }, isWallForAgent, dir)
        if (step) {
          facing = step
          return step
        }
      }
      // 3. nearest token
      const step = bfsStep({ c, r }, (tc, tr) => grid[tr * MAZE_COLS + tc] !== 0, isWallForAgent)
      if (step) facing = step
      return step
    }

    // --- ghost brain: target depends on its mode ---------------------------
    const ghostBrain = (g: Ghost) => (c: number, r: number, dir: TileVec): TileVec | null => {
      if (g.mode === 'frightened') return randomStep({ c, r }, isWallForGhost, dir)
      let target: TileVec
      if (g.mode === 'eaten') target = HOUSE_CENTER
      else if (g.mode === 'leaving') target = GHOST_EXIT
      else if (g.mode === 'scatter') target = g.corner
      else target = { c: agent.c, r: agent.r }
      return greedyStep({ c, r }, target, isWallForGhost, dir)
    }

    const respawn = () => {
      agent.reset(AGENT_START)
      facing = { c: -1, r: 0 }
      ghosts = spawnGhosts(frame)
      globalChase = false
      modeTimer = SCATTER_FRAMES
      frightTimer = 0
      eatChain = 0
    }

    // --- logic update (fixed timestep) -------------------------------------
    const update = () => {
      frame++
      for (let i = popups.length - 1; i >= 0; i--) {
        if (--popups[i].life <= 0) popups.splice(i, 1)
      }
      if (dying > 0) {
        if (--dying <= 0) respawn()
        return
      }

      // global scatter/chase rhythm
      if (--modeTimer <= 0) {
        globalChase = !globalChase
        modeTimer = globalChase ? CHASE_FRAMES : SCATTER_FRAMES
      }
      // power-token (frightened) window
      if (frightTimer > 0 && --frightTimer === 0) {
        for (const g of ghosts) if (g.mode === 'frightened') g.mode = globalChase ? 'chase' : 'scatter'
      }

      // agent
      agent.step(agentBrain)
      if (compactFlash > 0) compactFlash--
      if (agent.isCentered()) {
        const idx = agent.r * MAZE_COLS + agent.c
        const v = grid[idx]
        if (v !== 0) {
          grid[idx] = 0
          const gain = v === 2 ? TOKENS_PER_POWER : TOKENS_PER_PELLET
          tokenCount += gain
          contextTokens += gain
          // context window fills, then "compacts" and rolls over
          if (contextTokens >= CONTEXT_WINDOW) {
            contextTokens -= CONTEXT_WINDOW
            compactFlash = 110
          }
          if (v === 2) {
            frightTimer = FRIGHT_FRAMES
            eatChain = 0
            for (const g of ghosts) if (isDanger(g)) g.mode = 'frightened'
          }
        }
      }
      if (!grid.some((x) => x !== 0)) seedTokens()

      // ghosts
      for (const g of ghosts) {
        if (g.mode === 'house') {
          if (frame >= g.releaseAt) g.mode = 'leaving'
          continue
        }
        g.speed =
          g.mode === 'eaten'
            ? EATEN_SPEED
            : g.mode === 'frightened'
              ? FRIGHT_SPEED
              : g.mode === 'leaving'
                ? LEAVING_SPEED
                : GHOST_SPEED
        g.step(ghostBrain(g))
        if (g.mode === 'leaving' && g.c === GHOST_EXIT.c && g.r === GHOST_EXIT.r) {
          g.mode = globalChase ? 'chase' : 'scatter'
        } else if (g.mode === 'eaten' && g.r >= 13 && g.r <= 15 && g.c >= 11 && g.c <= 16) {
          g.mode = 'leaving'
        }
      }

      // collisions
      for (const g of ghosts) {
        if (g.mode === 'house' || g.mode === 'leaving' || g.mode === 'eaten') continue
        const dx = agent.x - g.x
        const dy = agent.y - g.y
        if (dx * dx + dy * dy > 0.36) continue
        if (g.mode === 'frightened') {
          const bonus = GHOST_BONUS_BASE * 2 ** eatChain
          eatChain++
          tokenCount += bonus
          popups.push({ x: g.x, y: g.y, text: `+${bonus.toLocaleString('en-US')}`, life: 70 })
          g.mode = 'eaten'
        } else {
          dying = DEATH_FRAMES
        }
      }
    }

    // --- drawing ------------------------------------------------------------
    const drawTokens = () => {
      const { tile, mazeX, mazeY } = layout
      const tr = tile * 0.5
      for (let r = 0; r < MAZE_ROWS; r++) {
        for (let c = 0; c < MAZE_COLS; c++) {
          const v = grid[r * MAZE_COLS + c]
          if (v === 0) continue
          const cx = mazeX + c * tile + tr
          const cy = mazeY + r * tile + tr
          if (v === 1) {
            ctx.fillStyle = COL_TOKEN
            ctx.beginPath()
            ctx.arc(cx, cy, Math.max(1.2, tile * 0.09), 0, Math.PI * 2)
            ctx.fill()
          } else {
            const pulse = 0.7 + 0.3 * Math.sin(frame * 0.15)
            ctx.fillStyle = COL_POWER
            ctx.shadowColor = COL_POWER
            ctx.shadowBlur = tile * 0.5 * pulse
            ctx.beginPath()
            ctx.arc(cx, cy, tile * 0.26 * pulse, 0, Math.PI * 2)
            ctx.fill()
            ctx.shadowBlur = 0
          }
        }
      }
    }

    const drawAgent = () => {
      const { tile, mazeX, mazeY } = layout
      const cx = mazeX + (agent.x + 0.5) * tile
      const cy = mazeY + (agent.y + 0.5) * tile
      // during a "context lost" death, the agent winds its mouth shut and fades
      const dieT = dying > 0 ? 1 - dying / DEATH_FRAMES : 0
      const radius = tile * 0.46 * (1 - dieT)
      const ang = Math.atan2(facing.r, facing.c)
      const open = dying > 0 ? dieT * Math.PI : (0.5 + 0.5 * Math.sin(frame * 0.4)) * 0.9 + 0.05
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(ang)
      ctx.fillStyle = COL_AGENT
      ctx.shadowColor = COL_AGENT
      ctx.shadowBlur = tile * 0.4
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, radius, open, Math.PI * 2 - open)
      ctx.closePath()
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.restore()
    }

    const drawGhost = (g: Ghost) => {
      const { tile, mazeX, mazeY } = layout
      const cx = mazeX + (g.x + 0.5) * tile
      const cy = mazeY + (g.y + 0.5) * tile
      // gentle bob while idling in the house
      const bob = g.mode === 'house' ? Math.sin(frame * 0.12 + g.corner.c) * tile * 0.12 : 0
      const yc = cy + bob
      const rad = tile * 0.46
      let body: string | null = g.color
      if (g.mode === 'eaten') body = null
      else if (g.mode === 'frightened') {
        const flashing = frightTimer < 120 && Math.floor(frame / 12) % 2 === 0
        body = flashing ? COL_FRIGHT_END : COL_FRIGHT
      }
      if (body) {
        ctx.fillStyle = body
        ctx.beginPath()
        ctx.arc(cx, yc, rad, Math.PI, 0) // domed head
        ctx.lineTo(cx + rad, yc + rad)
        const steps = 6
        for (let k = 1; k <= steps; k++) {
          const xx = cx + rad - (2 * rad * k) / steps
          const yy = yc + rad - (k % 2 === 1 ? rad * 0.3 : 0)
          ctx.lineTo(xx, yy)
        }
        ctx.closePath()
        ctx.fill()
      }
      // eyes (looking in travel direction); frightened shows a worried face
      const ex = rad * 0.36
      const ey = -rad * 0.12
      if (g.mode === 'frightened') {
        ctx.fillStyle = COL_FRIGHT_END
        for (const side of [-1, 1]) {
          ctx.beginPath()
          ctx.arc(cx + side * ex, yc + ey, rad * 0.12, 0, Math.PI * 2)
          ctx.fill()
        }
      } else {
        const er = rad * 0.3
        const pr = rad * 0.15
        for (const side of [-1, 1]) {
          const x = cx + side * ex
          const y = yc + ey
          ctx.fillStyle = COL_EYE
          ctx.beginPath()
          ctx.arc(x, y, er, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = COL_PUPIL
          ctx.beginPath()
          ctx.arc(x + g.dir.c * pr, y + g.dir.r * pr, pr, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    const drawPopups = () => {
      const { tile, mazeX, mazeY } = layout
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `bold ${Math.max(10, tile * 0.8)}px ui-monospace, Menlo, monospace`
      for (const p of popups) {
        ctx.fillStyle = `rgba(103, 232, 249, ${Math.min(1, p.life / 35)})`
        const rise = (70 - p.life) * 0.3
        ctx.fillText(p.text, mazeX + (p.x + 0.5) * tile, mazeY + (p.y + 0.5) * tile - rise)
      }
      ctx.textAlign = 'left'
    }

    const drawTitle = () => {
      const { width, titleH } = layout
      // CLAUDE block-glyph logo, shimmering, fit within the top band.
      const titleW = Math.max(...TITLE_LINES.map((l) => l.length))
      const rows = TITLE_LINES.length
      const cellH = Math.min((titleH * 0.62) / rows, (width * 0.5) / titleW)
      const cellW = cellH
      const startX = (width - titleW * cellW) / 2
      const startY = titleH * 0.08
      const t = frame / 60
      for (let i = 0; i < rows; i++) {
        const line = TITLE_LINES[i]
        for (let j = 0; j < line.length; j++) {
          const ch = line[j]
          const glyph = BLOCK_GLYPHS[ch]
          if (!glyph) continue
          const shimmer = Math.sin(j * 0.3 + t * 0.4 + i * 0.5)
          const idx = Math.floor(((shimmer + 1) / 2) * WARM.length) % WARM.length
          ctx.fillStyle = WARM[idx]
          const px = startX + j * cellW
          const py = startY + i * cellH
          for (const [bx, by, bw, bh] of glyph) {
            ctx.fillRect(px + bx * cellW, py + by * cellH, Math.ceil(bw * cellW) + 0.5, Math.ceil(bh * cellH) + 0.5)
          }
        }
      }
      // subtitle
      const sub = (config.subtitle || 'CODE CURIOUS').split('').join(' ')
      ctx.font = `${Math.max(10, Math.floor(cellH * 1.1))}px ui-monospace, Menlo, monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = COL_TEXT
      ctx.fillText(sub, width / 2, startY + rows * cellH + cellH * 0.3)
      ctx.textAlign = 'left'
    }

    const mono = (px: number, bold = false) =>
      `${bold ? 'bold ' : ''}${Math.max(9, Math.round(px))}px ui-monospace, Menlo, monospace`
    const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
    const fillRound = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, r)
      ctx.fill()
    }

    // context-window meter: fills as tokens accrue, "compacts" on overflow
    const drawContextMeter = (x: number, y: number, w: number) => {
      const { tile } = layout
      const h = Math.max(8, tile * 0.55)
      const frac = clamp(contextTokens / CONTEXT_WINDOW, 0, 1)
      ctx.font = mono(tile * 0.62)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      if (compactFlash > 0 && Math.floor(frame / 8) % 2 === 0) {
        ctx.fillStyle = '#ff5d5d'
        ctx.fillText('COMPACTING CONTEXT…', x, y - tile * 0.35)
      } else {
        ctx.fillStyle = COL_TEXT_DIM
        ctx.fillText(`CONTEXT  ${Math.round(frac * 100)}%`, x, y - tile * 0.35)
      }
      ctx.fillStyle = 'rgba(255,255,255,0.09)'
      fillRound(x, y, w, h, h / 2)
      ctx.fillStyle = frac > 0.8 ? '#ff5d5d' : frac > 0.5 ? COL_POWER : COL_AGENT
      fillRound(x, y, Math.max(h, w * frac), h, h / 2)
    }

    // a small icon for the legend (the agent, a token, or a ghost)
    const drawSwatch = (kind: 'agent' | 'token' | 'power' | 'ghost', x: number, y: number, s: number, color: string) => {
      if (kind === 'token' || kind === 'power') {
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(x, y, kind === 'power' ? s * 0.5 : s * 0.22, 0, Math.PI * 2)
        ctx.fill()
        return
      }
      if (kind === 'agent') {
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.arc(x, y, s * 0.55, 0.32, Math.PI * 2 - 0.32)
        ctx.closePath()
        ctx.fill()
        return
      }
      // ghost dome
      const r = s * 0.55
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, r, Math.PI, 0)
      ctx.lineTo(x + r, y + r)
      for (let k = 1; k <= 4; k++) {
        const xx = x + r - (2 * r * k) / 4
        const yy = y + r - (k % 2 === 1 ? r * 0.4 : 0)
        ctx.lineTo(xx, yy)
      }
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#fff'
      for (const side of [-1, 1]) {
        ctx.beginPath()
        ctx.arc(x + side * r * 0.35, y - r * 0.1, r * 0.22, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const drawLeftPanel = (x: number, y: number) => {
      const { tile } = layout
      const lh = tile * 1.5
      let cy = y
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillStyle = COL_ACCENT
      ctx.font = mono(tile * 0.95, true)
      ctx.fillText('SCHEDULE', x, cy)
      cy += lh * 1.2
      ctx.font = mono(tile * 0.8)
      const timeW = tile * 3.4
      for (const a of config.agenda) {
        ctx.fillStyle = COL_ACCENT
        ctx.fillText(a.time, x, cy)
        ctx.fillStyle = COL_TEXT
        const label = a.label.length > 22 ? a.label.slice(0, 21) + '…' : a.label
        ctx.fillText(label, x + timeW, cy)
        cy += lh
      }
    }

    const drawRightPanel = (x: number, y: number, w: number) => {
      const { tile } = layout
      const lh = tile * 1.5
      let cy = y
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillStyle = COL_ACCENT
      ctx.font = mono(tile * 0.95, true)
      ctx.fillText('TOKEN USAGE', x, cy)
      cy += lh * 1.2
      ctx.fillStyle = COL_AGENT
      ctx.font = mono(tile * 1.6, true)
      ctx.fillText(fmt(tokensShown), x, cy)
      cy += tile * 1.9
      ctx.fillStyle = COL_TEXT_DIM
      ctx.font = mono(tile * 0.7)
      ctx.fillText('tokens consumed', x, cy)
      cy += lh * 1.6
      drawContextMeter(x, cy, w)
      cy += lh * 2.1

      ctx.fillStyle = COL_ACCENT
      ctx.font = mono(tile * 0.95, true)
      ctx.fillText('LEGEND', x, cy)
      cy += lh * 1.1
      ctx.font = mono(tile * 0.72)
      const ix = x + tile * 0.7
      const legend: [Parameters<typeof drawSwatch>[0], string, string][] = [
        ['agent', COL_AGENT, 'Claude — eats tokens'],
        ['token', COL_TOKEN, 'token'],
        ['power', COL_POWER, 'context boost — stuns hazards'],
      ]
      for (const [kind, color, text] of legend) {
        drawSwatch(kind, ix, cy + tile * 0.45, tile, color)
        ctx.fillStyle = COL_TEXT
        ctx.textBaseline = 'middle'
        ctx.fillText(text, x + tile * 1.8, cy + tile * 0.5)
        ctx.textBaseline = 'top'
        cy += lh
      }
      cy += lh * 0.3
      ctx.fillStyle = COL_TEXT_DIM
      ctx.fillText('Hazards:', x, cy)
      cy += lh
      for (const spec of GHOST_SPECS.slice(0, clamp(config.pacman_ghosts ?? 4, 0, GHOST_SPECS.length))) {
        drawSwatch('ghost', ix, cy + tile * 0.45, tile, spec.color)
        ctx.fillStyle = COL_TEXT
        ctx.textBaseline = 'middle'
        ctx.fillText(spec.name, x + tile * 1.8, cy + tile * 0.5)
        ctx.textBaseline = 'top'
        cy += lh
      }
    }

    const drawBottom = () => {
      const { width, height, tile } = layout
      const parts: string[] = []
      if (config.event_date) parts.push(formatDate(config.event_date))
      if (config.venue) parts.push(config.venue)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      const px = Math.max(12, tile * 0.85)
      let baseY = height - 12
      if (config.wifi) {
        ctx.font = mono(px, true)
        ctx.fillStyle = COL_TEXT
        ctx.fillText(`WiFi  ${config.wifi}`, width / 2, baseY)
        baseY -= px * 1.5
      }
      if (parts.length) {
        ctx.font = mono(px)
        ctx.fillStyle = COL_TEXT_DIM
        ctx.fillText(parts.join('   ·   '), width / 2, baseY)
      }
      ctx.textAlign = 'left'
    }

    // compact counter shown above the maze when there's no room for side panels
    const drawTopCounter = () => {
      const { width, mazeY, tile } = layout
      ctx.font = mono(Math.max(14, tile * 1.1), true)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillStyle = COL_ACCENT
      ctx.fillText(`TOKENS  ${fmt(tokensShown)}`, width / 2, mazeY - 6)
      ctx.textAlign = 'left'
    }

    const drawHud = () => {
      tokensShown += (tokenCount - tokensShown) * 0.15
      if (layout.hasPanels) {
        drawLeftPanel(layout.pad, layout.mazeY)
        drawRightPanel(layout.mazeX + layout.mazeW + layout.pad, layout.mazeY, layout.panelW)
      } else {
        drawTopCounter()
      }
      drawBottom()
    }

    // --- main loop ----------------------------------------------------------
    let rafId = 0
    let last = performance.now()
    let acc = 0
    const tick = (now: number) => {
      // An unattended screensaver must never die on a stray throw: keep the
      // frame loop alive even if one update/draw fails.
      try {
        acc += Math.min(now - last, 100)
        last = now
        let steps = 0
        while (acc >= STEP_MS && steps < 6) {
          update()
          acc -= STEP_MS
          steps++
        }

        ctx.fillStyle = COL_BG
        ctx.fillRect(0, 0, layout.width, layout.height)
        if (wallCanvas) {
          ctx.drawImage(wallCanvas, layout.mazeX, layout.mazeY, layout.mazeW, layout.mazeH)
        }
        drawTokens()
        drawAgent()
        for (const g of ghosts) drawGhost(g)
        drawPopups()
        drawTitle()
        drawHud()
      } catch (err) {
        console.error('pacman tick error', err)
        acc = 0
      }

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
      style={{ imageRendering: 'auto' }}
    />
  )
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
