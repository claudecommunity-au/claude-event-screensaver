// PBKDF2-SHA256, 150k iters, 16-byte salt, 32-byte derived key. Web Crypto only.
const ITERATIONS = 150_000
const SALT_LEN = 16
const KEY_LEN = 32

function b64encode(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function b64decode(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function derive(password: string, salt: Uint8Array, iters: number): Promise<Uint8Array> {
  const pwBytes = new TextEncoder().encode(password)
  const key = await crypto.subtle.importKey(
    'raw',
    pwBytes as BufferSource,
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: iters },
    key,
    KEY_LEN * 8,
  )
  return new Uint8Array(bits)
}

export interface PasswordBlock {
  algo: 'pbkdf2-sha256'
  iters: number
  salt: string
  hash: string
}

export async function hashPassword(password: string): Promise<PasswordBlock> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN))
  const hash = await derive(password, salt, ITERATIONS)
  return {
    algo: 'pbkdf2-sha256',
    iters: ITERATIONS,
    salt: b64encode(salt),
    hash: b64encode(hash),
  }
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

export async function verifyPassword(password: string, block: PasswordBlock): Promise<boolean> {
  const salt = b64decode(block.salt)
  const expected = b64decode(block.hash)
  const actual = await derive(password, salt, block.iters)
  return constantTimeEqual(actual, expected)
}
