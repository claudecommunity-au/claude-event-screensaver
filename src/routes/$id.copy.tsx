import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfigForm } from '@/components/ConfigForm'
import { createConfig, getConfig } from '@/server/kv'
import { defaultConfigInput } from '@/lib/schema'

export const Route = createFileRoute('/$id/copy')({
  component: CopyPage,
  loader: async ({ params }) => {
    const config = await getConfig({ data: { id: params.id } })
    return { config }
  },
})

function CopyPage() {
  const { config } = Route.useLoaderData()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)

  const base = config
    ? {
        subtitle: config.subtitle,
        event_date: config.event_date,
        venue: config.venue,
        wifi: config.wifi,
        agenda: config.agenda,
        verbs: config.verbs,
        go_home_messages: config.go_home_messages,
        urgency_start_minutes_before_end: config.urgency_start_minutes_before_end,
      }
    : defaultConfigInput()

  return (
    <div className="dark min-h-screen bg-[#2a2e33] text-foreground">
      <ConfigForm
        defaultValues={base}
        passwordMode={{ mode: 'create' }}
        submitLabel="Create copy"
        submitting={busy}
        onSubmit={async ({ config: next, password }) => {
          if (!password) return
          setBusy(true)
          try {
            const res = await createConfig({ data: { config: next, password } })
            nav({ to: '/$id', params: { id: res.id } })
          } catch (err) {
            toast.error(String((err as Error).message ?? err))
            setBusy(false)
          }
        }}
      />
    </div>
  )
}
