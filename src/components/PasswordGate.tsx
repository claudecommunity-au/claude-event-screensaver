import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function PasswordGate({
  onSubmit,
  busy,
  error,
}: {
  onSubmit: (password: string) => void
  busy?: boolean
  error?: string | null
}) {
  const [pw, setPw] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (pw) onSubmit(pw)
      }}
      className="mx-auto max-w-sm space-y-4 p-8"
    >
      <h1 className="text-xl font-semibold">Enter password</h1>
      <div className="space-y-2">
        <Label htmlFor="pw">Password</Label>
        <Input
          id="pw"
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <Button type="submit" disabled={busy || !pw} className="w-full">
        {busy ? 'Checking...' : 'Unlock'}
      </Button>
    </form>
  )
}
