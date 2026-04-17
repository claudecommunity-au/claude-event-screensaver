import { customAlphabet } from 'nanoid'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const gen6 = customAlphabet(ALPHABET, 6)
const gen7 = customAlphabet(ALPHABET, 7)

export async function generateId(exists: (id: string) => Promise<boolean>): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const id = gen6()
    if (!(await exists(id))) return id
  }
  // Escalate to size 7 after 5 collisions at size 6.
  for (let i = 0; i < 5; i++) {
    const id = gen7()
    if (!(await exists(id))) return id
  }
  throw new Error('Could not mint a unique ID')
}
