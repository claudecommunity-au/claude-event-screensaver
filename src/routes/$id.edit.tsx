import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfigForm } from '@/components/ConfigForm'
import { PasswordGate } from '@/components/PasswordGate'
import { getConfig, updateConfig, verifyConfigPassword } from '@/server/kv'

export const Route = createFileRoute('/$id/edit')({
  component: EditPage,
  loader: async ({ params }) => {
    const config = await getConfig({ data: { id: params.id } })
    return { config }
  },
})

function EditPage() {
  const { config } = Route.useLoaderData()
  const { id } = Route.useParams()
  const nav = useNavigate()
  const [password, setPassword] = useState<string | null>(null)
  const [gateBusy, setGateBusy] = useState(false)
  const [gateError, setGateError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!config) {
    return (
      <div className="dark min-h-screen flex items-center justify-center bg-[#2a2e33] text-foreground p-6">
        <p>Not found.</p>
      </div>
    )
  }

  if (!password) {
    return (
      <div className="dark min-h-screen flex items-center justify-center bg-[#2a2e33] text-foreground">
        <PasswordGate
          busy={gateBusy}
          error={gateError}
          onSubmit={async (pw) => {
            setGateBusy(true)
            setGateError(null)
            try {
              const res = await verifyConfigPassword({ data: { id, password: pw } })
              if (res.ok) setPassword(pw)
              else setGateError('Invalid password')
            } catch (err) {
              setGateError(String((err as Error).message ?? err))
            } finally {
              setGateBusy(false)
            }
          }}
        />
      </div>
    )
  }

  return (
    <div className="dark min-h-screen bg-[#2a2e33] text-foreground">
      <ConfigForm
        defaultValues={config}
        passwordMode={{ mode: 'edit-optional' }}
        submitLabel="Save"
        submitting={busy}
        onSubmit={async ({ config: next, newPassword }) => {
          setBusy(true)
          try {
            await updateConfig({ data: { id, password, config: next, newPassword } })
            toast.success('Saved')
            nav({ to: '/$id', params: { id } })
          } catch (err) {
            toast.error(String((err as Error).message ?? err))
            setBusy(false)
          }
        }}
      />
    </div>
  )
}
