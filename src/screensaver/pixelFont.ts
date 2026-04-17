// Ported from screensaver.py TITLE_LINES and WARM palette.
export const TITLE_LINES: string[] = [
  '    \u2584\u2584\u2584\u2584   \u2584\u2584           \u2584\u2584     \u2584\u2584    \u2584\u2584  \u2584\u2584\u2584\u2584\u2584     \u2584\u2584\u2584\u2584\u2584\u2584\u2584\u2584 ',
  '  \u2588\u2588\u2580\u2580\u2580\u2580\u2588  \u2588\u2588          \u2588\u2588\u2588\u2588    \u2588\u2588    \u2588\u2588  \u2588\u2588\u2580\u2580\u2580\u2588\u2588   \u2588\u2588\u2580\u2580\u2580\u2580\u2580\u2580 ',
  ' \u2588\u2588\u2580       \u2588\u2588          \u2588\u2588\u2588\u2588    \u2588\u2588    \u2588\u2588  \u2588\u2588    \u2588\u2588  \u2588\u2588       ',
  ' \u2588\u2588        \u2588\u2588         \u2588\u2588  \u2588\u2588   \u2588\u2588    \u2588\u2588  \u2588\u2588    \u2588\u2588  \u2588\u2588\u2588\u2588\u2588\u2588\u2588  ',
  ' \u2588\u2588\u2584       \u2588\u2588         \u2588\u2588\u2588\u2588\u2588\u2588   \u2588\u2588    \u2588\u2588  \u2588\u2588    \u2588\u2588  \u2588\u2588       ',
  '  \u2588\u2588\u2584\u2584\u2584\u2584\u2588  \u2588\u2588\u2584\u2584\u2584\u2584\u2584\u2584  \u2584\u2588\u2588  \u2588\u2588\u2584  \u2580\u2588\u2588\u2584\u2584\u2588\u2588\u2580  \u2588\u2588\u2584\u2584\u2584\u2588\u2588   \u2588\u2588\u2584\u2584\u2584\u2584\u2584\u2584 ',
  '    \u2580\u2580\u2580\u2580   \u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580  \u2580\u2580    \u2580\u2580    \u2580\u2580\u2580\u2580    \u2580\u2580\u2580\u2580\u2580     \u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580',
]

// WARM palette from ANSI 256-color indices mapped to approximate RGB.
// These were hand-approximated from xterm's 256-color palette.
export const WARM: string[] = [
  '#d7af87', // 173
  '#d7af5f', // 179
  '#d7afaf', // 180
  '#d7d787', // 186
  '#d7d7af', // 187
  '#ffaf87', // 216
  '#ffafaf', // 217
  '#ffd7af', // 223
  '#ffd7d7', // 224
  '#ffffd7', // 230
  '#ff875f', // 209
  '#ffaf5f', // 215
  '#af8787', // 174
  '#af875f', // 138
  '#afafaf', // 144
]

// Block Elements rendered as rect(s) inside a cell, coords in 0..1 space: [x, y, w, h]
// Matches the Unicode Block Elements range used by screensaver.py for both title and crab sprites.
export const BLOCK_GLYPHS: Record<string, ReadonlyArray<readonly [number, number, number, number]>> = {
  '\u2588': [[0, 0, 1, 1]],           // █ FULL BLOCK
  '\u2584': [[0, 0.5, 1, 0.5]],       // ▄ LOWER HALF BLOCK
  '\u2580': [[0, 0, 1, 0.5]],         // ▀ UPPER HALF BLOCK
  '\u258C': [[0, 0, 0.5, 1]],         // ▌ LEFT HALF BLOCK
  '\u2590': [[0.5, 0, 0.5, 1]],       // ▐ RIGHT HALF BLOCK
  '\u2596': [[0, 0.5, 0.5, 0.5]],     // ▖ QUADRANT LOWER LEFT
  '\u2597': [[0.5, 0.5, 0.5, 0.5]],   // ▗ QUADRANT LOWER RIGHT
  '\u2598': [[0, 0, 0.5, 0.5]],       // ▘ QUADRANT UPPER LEFT
  '\u259D': [[0.5, 0, 0.5, 0.5]],     // ▝ QUADRANT UPPER RIGHT
  '\u259B': [[0, 0, 1, 0.5], [0, 0.5, 0.5, 0.5]],   // ▛ UL + UR + LL
  '\u259C': [[0, 0, 1, 0.5], [0.5, 0.5, 0.5, 0.5]], // ▜ UL + UR + LR
  '\u2599': [[0, 0, 0.5, 1], [0.5, 0.5, 0.5, 0.5]], // ▙ UL + LL + LR
  '\u259F': [[0.5, 0, 0.5, 1], [0, 0.5, 0.5, 0.5]], // ▟ UR + LL + LR
  '\u259A': [[0, 0, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]], // ▚ UL + LR
  '\u259E': [[0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5]], // ▞ UR + LL
}

export const COLOR_252 = '#d0d0d0'
export const COLOR_245 = '#8a8a8a'
export const COLOR_216 = '#ffaf87'
export const COLOR_196 = '#ff0000'
export const COLOR_209 = '#ff875f'
export const COLOR_255 = '#eeeeee'
