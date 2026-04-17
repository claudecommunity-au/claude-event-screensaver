import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/')({
  component: Landing,
})

function Landing() {
  const nav = useNavigate()
  const [id, setId] = useState('')
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Claude Screensaver</h1>
          <p className="text-muted-foreground">
            Build a custom event screensaver and share it with a short link.
          </p>
        </div>
        <Link to="/new" className="block">
          <Button className="w-full" size="lg">
            Create new
          </Button>
        </Link>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            const v = id.trim().toUpperCase()
            if (v) nav({ to: '/$id', params: { id: v } })
          }}
        >
          <Label htmlFor="open">Or open by ID</Label>
          <div className="flex gap-2">
            <Input
              id="open"
              placeholder="A7K3QZ"
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="uppercase"
            />
            <Button type="submit" variant="outline">
              Open
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
