import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { configInputSchema } from '@/lib/schema'
import { getConfigWithPassword, updateConfigDetailed } from '@/server/kv'

const updateBody = z.object({
  config: configInputSchema,
  newPassword: z.string().min(4).optional(),
})

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

function extractPassword(request: Request): string | null {
  const header = request.headers.get('x-config-password')
  if (header) return header
  const auth = request.headers.get('authorization')
  if (auth?.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim()
  return null
}

export const Route = createFileRoute('/api/configs/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const password = extractPassword(request)
        if (!password) return json({ error: 'Missing X-Config-Password header' }, 401)
        const res = await getConfigWithPassword({ data: { id: params.id, password } })
        if (!res.ok) return json({ error: 'Not found or invalid password' }, 404)
        return json(res.config)
      },
      PUT: async ({ request, params }) => {
        const password = extractPassword(request)
        if (!password) return json({ error: 'Missing X-Config-Password header' }, 401)
        let raw: unknown
        try {
          raw = await request.json()
        } catch {
          return json({ error: 'Invalid JSON body' }, 400)
        }
        const parsed = updateBody.safeParse(raw)
        if (!parsed.success) {
          return json({ error: 'Validation failed', details: parsed.error.issues }, 400)
        }
        const res = await updateConfigDetailed({
          data: {
            id: params.id,
            password,
            config: parsed.data.config,
            newPassword: parsed.data.newPassword,
          },
        })
        if (!res.ok) {
          return json(
            { error: res.reason === 'not_found' ? 'Not found' : 'Invalid password' },
            res.reason === 'not_found' ? 404 : 401,
          )
        }
        const origin = new URL(request.url).origin
        return json({ id: res.id, url: `${origin}/${res.id}` })
      },
    },
  },
})
