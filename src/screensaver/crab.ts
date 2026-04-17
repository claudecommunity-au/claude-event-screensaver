// Ported CCC crab mascot from screensaver.py. Draws into a terminal-like cell grid.
export const CRAB_BODY = [
  ' \u2590\u259b\u2588\u2588\u2588\u259c\u258c ',
  '\u259d\u259c\u2588\u2588\u2588\u2588\u2588\u259b\u2598',
]
export const CRAB_LEGS = [
  '  \u2598\u2598 \u259d\u259d  ',
  '  \u259d\u259d \u2598\u2598  ',
]
export const CRAB_W = Math.max(...[...CRAB_BODY, ...CRAB_LEGS].map((l) => l.length))
export const CRAB_COLOR = '#ff8700'
export const MAX_CRABS = 5

type Accessory = { ch: string; color: string } | null
const ACCESSORIES: Accessory[] = [
  null,
  null,
  null,
  { ch: '\u2726', color: '#ffff00' },
  { ch: '\u2726', color: '#ffff00' },
  { ch: '\u25ce', color: '#d0d0d0' },
  { ch: '?', color: '#eeeeee' },
]

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function randFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min
}
function choice<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export class CrabScuttle {
  done = false
  frame = 0
  mode: 'scuttle' | 'chat' | 'flee' = 'scuttle'
  accessory: Accessory
  chatTimer = 0
  chatPartner: CrabScuttle | null = null
  chatCooldown = 0
  goingRight: boolean
  x: number
  y: number
  dx: number
  vy = 0
  pauseTimer = 0
  paused = false

  constructor(public cols: number, public rows: number) {
    this.accessory = choice(ACCESSORIES)
    this.goingRight = Math.random() < 0.5
    this.x = this.goingRight ? -CRAB_W : cols
    this.dx = randFloat(0.25, 0.5) * (this.goingRight ? 1 : -1)
    this.y = randInt(Math.floor(rows / 2) + 3, Math.max(rows - 8, Math.floor(rows / 2) + 4))
    this._schedulePause()
  }

  _schedulePause() {
    this.pauseTimer = randInt(20, 50)
  }

  _resumeScuttle() {
    this.mode = 'scuttle'
    this.chatPartner = null
    this.chatCooldown = 40
    this._schedulePause()
  }

  step(cols: number, rows: number) {
    if (this.done) return
    this.cols = cols
    this.rows = rows
    this.frame++

    if (this.mode === 'flee') {
      this.x += this.dx
      this.y -= 0.3
      if (this.x < -CRAB_W - 2 || this.x > cols + 2) {
        this.done = true
        return
      }
    } else if (this.mode === 'chat') {
      this.chatTimer--
      if (this.chatTimer <= 0) {
        if (this.chatPartner && !this.chatPartner.done) {
          const tmp = this.accessory
          this.accessory = this.chatPartner.accessory
          this.chatPartner.accessory = tmp
          this.chatPartner._resumeScuttle()
        }
        this._resumeScuttle()
      }
    } else {
      if (this.chatCooldown > 0) this.chatCooldown--
      if (!this.paused) {
        this.pauseTimer--
        if (this.pauseTimer <= 0) {
          this.paused = true
          this.pauseTimer = randInt(8, 20)
        }
      } else {
        this.pauseTimer--
        if (this.pauseTimer <= 0) {
          this.paused = false
          this._schedulePause()
          this.vy = randFloat(-0.1, 0.1)
        }
      }
      if (!this.paused) this.x += this.dx
      this.y += this.vy
      this.vy *= 0.95
      this.y = Math.max(
        Math.floor(rows / 2) + 3,
        Math.min(rows - 8, this.y),
      )
      if (this.x > cols + 2 || this.x < -CRAB_W - 2) {
        this.done = true
      }
    }
  }

  sprite(): { lines: string[]; legIdx: number } {
    let legIdx: number
    if (this.mode === 'chat') {
      legIdx = 0
    } else {
      const divisor = this.mode === 'flee' ? 2 : this.paused ? 8 : 5
      legIdx = Math.floor(this.frame / divisor) % 2
    }
    return { lines: [...CRAB_BODY, CRAB_LEGS[legIdx]], legIdx }
  }
}

export const BIG_CRAB_OPEN: string[] = [
  '\u2588'.repeat(50),
  '\u2588'.repeat(50),
  '\u2588'.repeat(12) + '      ' + '\u2588'.repeat(14) + '      ' + '\u2588'.repeat(12),
  '\u2588'.repeat(12) + '      ' + '\u2588'.repeat(14) + '      ' + '\u2588'.repeat(12),
  '\u2588'.repeat(12) + '      ' + '\u2588'.repeat(14) + '      ' + '\u2588'.repeat(12),
  '\u2588'.repeat(50),
  '\u2588'.repeat(50),
  '\u2588'.repeat(50),
]
export const BIG_CRAB_BLINK: string[] = Array(BIG_CRAB_OPEN.length).fill('\u2588'.repeat(50))
export const BIG_CRAB_W = 50
export const BIG_CRAB_H = BIG_CRAB_OPEN.length

export class CrabPeek {
  done = false
  frame = 0
  x: number
  y: number
  targetY: number
  phase: 'rising' | 'peeking' | 'sinking' = 'rising'
  peekTimer = 0
  blinkUntil = 0
  nextBlink = 0

  constructor(public cols: number, public rows: number) {
    this.x = Math.floor((cols - BIG_CRAB_W) / 2) + randInt(-10, 10)
    this.y = rows
    this.targetY = rows - BIG_CRAB_H + 2
  }

  step(_cols: number, rows: number) {
    if (this.done) return
    this.frame++
    if (this.phase === 'rising') {
      this.y -= 0.15
      if (this.y <= this.targetY) {
        this.y = this.targetY
        this.phase = 'peeking'
        this.peekTimer = this.frame + 100
        this.nextBlink = this.frame + randInt(15, 30)
      }
    } else if (this.phase === 'peeking') {
      if (this.frame > this.peekTimer) this.phase = 'sinking'
      if (this.frame >= this.nextBlink && this.blinkUntil <= this.frame) {
        this.blinkUntil = this.frame + randInt(3, 6)
        this.nextBlink = this.frame + randInt(15, 35)
      }
    } else if (this.phase === 'sinking') {
      this.y += 0.15
      if (this.y > rows) this.done = true
    }
  }

  isBlinking(): boolean {
    return this.phase === 'peeking' && this.frame < this.blinkUntil
  }
}

export class FloatingParticle {
  done = false
  x: number
  y: number
  dx: number
  speed: number
  char: string
  color: string

  constructor(public cols: number, public rows: number, warm: readonly string[]) {
    this.x = randInt(2, cols - 3)
    this.y = rows - 1
    this.dx = randFloat(-0.3, 0.3)
    this.speed = randFloat(0.05, 0.15)
    this.char = choice(['\u00b7', '.', '\u00b7'])
    this.color = choice(warm)
  }

  step(_cols: number, _rows: number) {
    if (this.done) return
    this.y -= this.speed
    this.x += this.dx
    if (this.y < 0) this.done = true
  }
}
