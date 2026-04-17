import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfigForm } from '@/components/ConfigForm'
import { defaultConfigInput } from '@/lib/schema'
import { createConfig } from '@/server/kv'

export const Route = createFileRoute('/new')({
  component: NewPage,
})

function NewPage() {
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  return (
    <div className="dark min-h-screen bg-background text-foreground font-serif">
      <ConfigForm
        defaultValues={defaultConfigInput()}
        passwordMode={{ mode: 'create' }}
        submitLabel="Create"
        submitting={busy}
        onSubmit={async ({ config, password }) => {
          if (!password) return
          setBusy(true)
          try {
            const res = await createConfig({ data: { config, password } })
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
