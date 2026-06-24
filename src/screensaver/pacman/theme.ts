// Visual + thematic constants for the Pac-Man ("token muncher") screensaver.
// The theme is "AI token usage": the agent is Claude, pellets are tokens, the
// ghosts are the hazards that eat into a run.

export const COL_BG = '#000000'
export const COL_WALL = '#2b3df5' // classic neon-blue maze, glows
export const COL_WALL_GLOW = '#5b6dff'
export const COL_TOKEN = '#ffd9a8' // warm cream tokens
export const COL_POWER = '#ffb454' // big "context" tokens
export const COL_AGENT = '#ff8700' // Claude orange (matches Clawd)
export const COL_FRIGHT = '#3b4ad6' // frightened ghost body
export const COL_FRIGHT_END = '#e8e8ff' // flashing as fright ends
export const COL_EYE = '#ffffff'
export const COL_PUPIL = '#2b3df5'
export const COL_TEXT = '#d0d0d0'
export const COL_TEXT_DIM = '#8a8a8a'
export const COL_ACCENT = '#ff8700'

// Tokens awarded per pellet — keeps the counter ticking like real usage.
export const TOKENS_PER_PELLET = 12
export const TOKENS_PER_POWER = 256
// Eating a frightened ghost: doubles each time within one power window.
export const GHOST_BONUS_BASE = 1000

// Context window the meter fills toward before "compacting" and resetting.
export const CONTEXT_WINDOW = 8000

// The four ghosts as AI hazards. Order matches scatter corners in maze.ts.
export interface GhostSpec {
  name: string
  color: string
}
export const GHOST_SPECS: GhostSpec[] = [
  { name: 'LATENCY', color: '#ff5d5d' },
  { name: 'RATE LIMIT', color: '#ff9ce0' },
  { name: 'HALLUCINATION', color: '#67e8f9' },
  { name: 'OFF-BY-ONE', color: '#ffb86b' },
]

// Frames a power token keeps ghosts frightened.
export const FRIGHT_FRAMES = 7 * 60
