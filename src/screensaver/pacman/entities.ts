import { wrapCol, type TileVec } from './maze'

// A "brain" decides which direction to take from a tile. Returns null to stop.
export type Brain = (c: number, r: number, dir: TileVec) => TileVec | null

const STOP: TileVec = { c: 0, r: 0 }

// Grid-locked mover. Lives on integer tile (c,r) and slides toward the next
// tile in `dir`; `progress` is 0..1 across the gap. Decisions happen at tile
// centres (spawn, and each arrival) via the injected brain. Speed is kept < 1
// tile/frame so at most one tile is crossed per step.
export class Mover {
  c: number
  r: number
  progress = 0
  dir: TileVec = STOP

  constructor(start: TileVec, public speed: number) {
    this.c = start.c
    this.r = start.r
  }

  // Fractional render position in tile units. May briefly fall outside the
  // grid during a tunnel crossing — the renderer wraps it for display.
  get x(): number {
    return this.c + this.dir.c * this.progress
  }
  get y(): number {
    return this.r + this.dir.r * this.progress
  }

  isCentered(): boolean {
    return this.progress < this.speed / 2 || this.progress > 1 - this.speed / 2
  }

  reset(start: TileVec) {
    this.c = start.c
    this.r = start.r
    this.progress = 0
    this.dir = STOP
  }

  step(brain: Brain) {
    if (this.dir === STOP) {
      this.dir = brain(this.c, this.r, this.dir) ?? STOP
      if (this.dir === STOP) return
    }
    this.progress += this.speed
    if (this.progress >= 1) {
      this.progress -= 1
      this.c = wrapCol(this.c + this.dir.c)
      this.r += this.dir.r
      this.dir = brain(this.c, this.r, this.dir) ?? STOP
      if (this.dir === STOP) this.progress = 0
    }
  }
}

export type GhostMode = 'house' | 'leaving' | 'scatter' | 'chase' | 'frightened' | 'eaten'

export class Ghost extends Mover {
  mode: GhostMode = 'house'
  // Stagger before this ghost first leaves the house, in frames.
  releaseAt: number

  constructor(
    start: TileVec,
    speed: number,
    public color: string,
    public name: string,
    public corner: TileVec,
    releaseAt: number,
  ) {
    super(start, speed)
    this.releaseAt = releaseAt
  }
}
