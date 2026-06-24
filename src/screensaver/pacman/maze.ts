// Authentic 28x31 Pac-Man maze. Self-contained: layout + tile queries +
// grid pathfinding. No app dependencies.
//
//   '#' wall            '.' token (pellet)        'o' big token (power pellet)
//   ' ' open, no token  '-' ghost-house door (wall for the agent, door for ghosts)
//
// The maze is left/right symmetric and fully connected. Row 14 has open edges:
// that is the wrap-around tunnel.
export const MAZE: string[] = [
  '############################',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#o####.#####.##.#####.####o#',
  '#.####.#####.##.#####.####.#',
  '#..........................#',
  '#.####.##.########.##.####.#',
  '#.####.##.########.##.####.#',
  '#......##....##....##......#',
  '######.##### ## #####.######',
  '######.##### ## #####.######',
  '######.##          ##.######',
  '######.## ###--### ##.######',
  '######.## #      # ##.######',
  '      .   #      #   .      ',
  '######.## #      # ##.######',
  '######.## ######## ##.######',
  '######.##          ##.######',
  '######.## ######## ##.######',
  '######.##### ## #####.######',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#.####.#####.##.#####.####.#',
  '#o..##.......  .......##..o#',
  '###.##.##.########.##.##.###',
  '###.##.##.########.##.##.###',
  '#......##....##....##......#',
  '#.##########.##.##########.#',
  '#.##########.##.##########.#',
  '#..........................#',
  '############################',
]

export const MAZE_COLS = 28
export const MAZE_ROWS = 31

// Fail fast on a copy/paste truncation — the classic maze bug.
for (let r = 0; r < MAZE.length; r++) {
  if (MAZE[r].length !== MAZE_COLS) {
    throw new Error(`maze row ${r} is ${MAZE[r].length} chars, expected ${MAZE_COLS}`)
  }
}
if (MAZE.length !== MAZE_ROWS) {
  throw new Error(`maze has ${MAZE.length} rows, expected ${MAZE_ROWS}`)
}

export type TileVec = { c: number; r: number }

// Spawn just above the ghost-house door, on the main path.
export const AGENT_START: TileVec = { c: 13, r: 23 }
// Idle tiles inside the ghost house (left to right).
export const GHOST_HOME: TileVec[] = [
  { c: 11, r: 14 },
  { c: 13, r: 14 },
  { c: 14, r: 14 },
  { c: 16, r: 14 },
]
// Tile the ghosts climb to when leaving the house, then start hunting.
export const GHOST_EXIT: TileVec = { c: 13, r: 11 }
// Scatter corners (one per ghost) — keeps them spreading out, classic style.
export const SCATTER_CORNERS: TileVec[] = [
  { c: 26, r: 1 },
  { c: 1, r: 1 },
  { c: 26, r: 29 },
  { c: 1, r: 29 },
]

function tileAt(c: number, r: number): string {
  if (r < 0 || r >= MAZE_ROWS) return '#'
  const row = MAZE[r]
  if (c < 0 || c >= MAZE_COLS) return ' '
  return row[c]
}

export function isDoor(c: number, r: number): boolean {
  return tileAt(c, r) === '-'
}

// A solid wall ('#'), with everything outside the grid treated as solid so the
// outer silhouette isn't outlined. The door is NOT solid (it's an opening).
export function isSolidWall(c: number, r: number): boolean {
  if (r < 0 || r >= MAZE_ROWS) return true
  if (c < 0 || c >= MAZE_COLS) return true
  return MAZE[r][c] === '#'
}

export function isToken(c: number, r: number): boolean {
  return tileAt(c, r) === '.'
}
export function isPowerToken(c: number, r: number): boolean {
  return tileAt(c, r) === 'o'
}

// Walls for the agent: solid walls and the ghost-house door.
export function isWallForAgent(c: number, r: number): boolean {
  const t = tileAt(c, r)
  return t === '#' || t === '-'
}
// Walls for ghosts: only solid walls (door is passable so they can leave/return).
export function isWallForGhost(c: number, r: number): boolean {
  return tileAt(c, r) === '#'
}

// Tunnel wrap on the horizontal axis.
export function wrapCol(c: number): number {
  if (c < 0) return MAZE_COLS - 1
  if (c >= MAZE_COLS) return 0
  return c
}

export const DIRS: ReadonlyArray<TileVec> = [
  { c: 1, r: 0 },
  { c: -1, r: 0 },
  { c: 0, r: 1 },
  { c: 0, r: -1 },
]

// All token positions, used to (re)seed the board.
export function allTokens(): { tokens: TileVec[]; power: TileVec[] } {
  const tokens: TileVec[] = []
  const power: TileVec[] = []
  for (let r = 0; r < MAZE_ROWS; r++) {
    for (let c = 0; c < MAZE_COLS; c++) {
      if (isToken(c, r)) tokens.push({ c, r })
      else if (isPowerToken(c, r)) power.push({ c, r })
    }
  }
  return { tokens, power }
}

// Breadth-first search returning the first step (a unit direction) from `start`
// toward the nearest tile satisfying `isTarget`. Honours tunnel wrap. Returns
// null when no target is reachable.
export function bfsStep(
  start: TileVec,
  isTarget: (c: number, r: number) => boolean,
  isWall: (c: number, r: number) => boolean,
): TileVec | null {
  const key = (c: number, r: number) => r * MAZE_COLS + c
  const seen = new Set<number>([key(start.c, start.r)])
  // queue entries carry the first-step direction that led there
  const queue: { c: number; r: number; first: TileVec | null }[] = [
    { c: start.c, r: start.r, first: null },
  ]
  let head = 0
  while (head < queue.length) {
    const cur = queue[head++]
    if (cur.first && isTarget(cur.c, cur.r)) return cur.first
    for (const d of DIRS) {
      const nc = wrapCol(cur.c + d.c)
      const nr = cur.r + d.r
      if (nr < 0 || nr >= MAZE_ROWS) continue
      if (isWall(nc, nr)) continue
      const k = key(nc, nr)
      if (seen.has(k)) continue
      seen.add(k)
      queue.push({ c: nc, r: nr, first: cur.first ?? d })
    }
  }
  return null
}

export function manhattan(a: TileVec, b: TileVec): number {
  return Math.abs(a.c - b.c) + Math.abs(a.r - b.r)
}

// Classic ghost tie-break priority: up, left, down, right.
const PRIORITY: ReadonlyArray<TileVec> = [
  { c: 0, r: -1 },
  { c: -1, r: 0 },
  { c: 0, r: 1 },
  { c: 1, r: 0 },
]

function passableNeighbors(
  c: number,
  r: number,
  isWall: (c: number, r: number) => boolean,
  curDir: TileVec,
): TileVec[] {
  const out: TileVec[] = []
  for (const d of PRIORITY) {
    // never reverse unless it is the only option (handled by the caller)
    if (curDir.c !== 0 || curDir.r !== 0) {
      if (d.c === -curDir.c && d.r === -curDir.r) continue
    }
    const nc = wrapCol(c + d.c)
    const nr = r + d.r
    if (nr < 0 || nr >= MAZE_ROWS) continue
    if (isWall(nc, nr)) continue
    out.push(d)
  }
  return out
}

// Greedy step toward `target` (used by ghosts in chase/scatter/leaving/eaten).
// Picks the non-reversing passable move that minimises distance to target,
// falling back to a reverse only at a dead end.
export function greedyStep(
  start: TileVec,
  target: TileVec,
  isWall: (c: number, r: number) => boolean,
  curDir: TileVec,
): TileVec | null {
  const options = passableNeighbors(start.c, start.r, isWall, curDir)
  let best: TileVec | null = null
  let bestD = Infinity
  for (const d of options) {
    const nc = wrapCol(start.c + d.c)
    const nr = start.r + d.r
    const dist = manhattan({ c: nc, r: nr }, target)
    if (dist < bestD) {
      bestD = dist
      best = d
    }
  }
  if (best) return best
  // dead end: reverse
  const rc = wrapCol(start.c - curDir.c)
  const rr = start.r - curDir.r
  if (rr >= 0 && rr < MAZE_ROWS && !isWall(rc, rr)) return { c: -curDir.c, r: -curDir.r }
  return null
}

// Random passable non-reversing step (frightened ghosts).
export function randomStep(
  start: TileVec,
  isWall: (c: number, r: number) => boolean,
  curDir: TileVec,
): TileVec | null {
  const options = passableNeighbors(start.c, start.r, isWall, curDir)
  if (options.length > 0) return options[Math.floor(Math.random() * options.length)]
  const rc = wrapCol(start.c - curDir.c)
  const rr = start.r - curDir.r
  if (rr >= 0 && rr < MAZE_ROWS && !isWall(rc, rr)) return { c: -curDir.c, r: -curDir.r }
  return null
}

// Step that maximises distance from `threat` (agent fleeing nearby ghosts).
export function fleeStep(
  start: TileVec,
  threat: TileVec,
  isWall: (c: number, r: number) => boolean,
  curDir: TileVec,
): TileVec | null {
  const options = passableNeighbors(start.c, start.r, isWall, curDir)
  let best: TileVec | null = null
  let bestD = -Infinity
  for (const d of options) {
    const nc = wrapCol(start.c + d.c)
    const nr = start.r + d.r
    const dist = manhattan({ c: nc, r: nr }, threat)
    if (dist > bestD) {
      bestD = dist
      best = d
    }
  }
  return best
}
