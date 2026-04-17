import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { configInputSchema } from '@/lib/schema'
import { createConfig } from '@/server/kv'

const createBody = z.object({
  config: configInputSchema,
  password: z.string().min(4),
})

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

export const Route = createFileRoute('/api/configs')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown
        try {
          raw = await request.json()
        } catch {
          return json({ error: 'Invalid JSON body' }, 400)
        }
        const parsed = createBody.safeParse(raw)
        if (!parsed.success) {
          return json({ error: 'Validation failed', details: parsed.error.issues }, 400)
        }
        const { id } = await createConfig({ data: parsed.data })
        const origin = new URL(request.url).origin
        return json({ id, url: `${origin}/${id}` }, 201)
      },
    },
  },
})
