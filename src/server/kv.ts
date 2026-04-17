import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { z } from 'zod'
import { configInputSchema, storedConfigSchema } from '@/lib/schema'
import type { PublicConfig, StoredConfig } from '@/lib/schema'
import { hashPassword, verifyPassword } from './password'
import { generateId } from './id'

const KEY = (id: string) => `cfg:${id}`

function kv(): KVNamespace {
  return (env as unknown as { CONFIGS_KV: KVNamespace }).CONFIGS_KV
}

async function readStored(id: string): Promise<StoredConfig | null> {
  const raw = await kv().get(KEY(id), 'json')
  if (!raw) return null
  const parsed = storedConfigSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

function publicView(stored: StoredConfig): PublicConfig {
  const { password: _p, ...rest } = stored
  return rest
}

export const createConfig = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      config: configInputSchema,
      password: z.string().min(4),
    }),
  )
  .handler(async ({ data }) => {
    const id = await generateId(async (candidate) => (await kv().get(KEY(candidate))) !== null)
    const pw = await hashPassword(data.password)
    const now = new Date().toISOString()
    const stored: StoredConfig = {
      ...data.config,
      id,
      password: pw,
      createdAt: now,
      updatedAt: now,
    }
    await kv().put(KEY(id), JSON.stringify(stored))
    return { id }
  })

export const getConfig = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }): Promise<PublicConfig | null> => {
    const stored = await readStored(data.id)
    return stored ? publicView(stored) : null
  })

export const updateConfig = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string(),
      password: z.string(),
      config: configInputSchema,
      newPassword: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const stored = await readStored(data.id)
    if (!stored) throw new Error('Not found')
    const ok = await verifyPassword(data.password, stored.password)
    if (!ok) throw new Error('Invalid password')
    const pwBlock =
      data.newPassword && data.newPassword.length > 0
        ? await hashPassword(data.newPassword)
        : stored.password
    const next: StoredConfig = {
      ...data.config,
      id: stored.id,
      password: pwBlock,
      createdAt: stored.createdAt,
      updatedAt: new Date().toISOString(),
    }
    await kv().put(KEY(stored.id), JSON.stringify(next))
    return { id: stored.id }
  })

export const verifyConfigPassword = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string(), password: z.string() }))
  .handler(async ({ data }) => {
    const stored = await readStored(data.id)
    if (!stored) return { ok: false as const }
    const ok = await verifyPassword(data.password, stored.password)
    return { ok }
  })

export const getConfigWithPassword = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string(), password: z.string() }))
  .handler(async ({ data }): Promise<{ ok: false } | { ok: true; config: PublicConfig }> => {
    const stored = await readStored(data.id)
    if (!stored) return { ok: false }
    const ok = await verifyPassword(data.password, stored.password)
    if (!ok) return { ok: false }
    return { ok: true, config: publicView(stored) }
  })

export const updateConfigDetailed = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string(),
      password: z.string(),
      config: configInputSchema,
      newPassword: z.string().optional(),
    }),
  )
  .handler(
    async ({
      data,
    }): Promise<
      { ok: false; reason: 'not_found' | 'invalid_password' } | { ok: true; id: string }
    > => {
      const stored = await readStored(data.id)
      if (!stored) return { ok: false, reason: 'not_found' }
      const passOk = await verifyPassword(data.password, stored.password)
      if (!passOk) return { ok: false, reason: 'invalid_password' }
      const pwBlock =
        data.newPassword && data.newPassword.length > 0
          ? await hashPassword(data.newPassword)
          : stored.password
      const next: StoredConfig = {
        ...data.config,
        id: stored.id,
        password: pwBlock,
        createdAt: stored.createdAt,
        updatedAt: new Date().toISOString(),
      }
      await kv().put(KEY(stored.id), JSON.stringify(next))
      return { ok: true, id: stored.id }
    },
  )
