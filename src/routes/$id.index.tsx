import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { Maximize2, Minimize2, Github } from 'lucide-react'
import { Screensaver } from '@/screensaver/Screensaver'
import { getConfig } from '@/server/kv'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/$id/')({
  component: ScreensaverPage,
  loader: async ({ params }) => {
    const config = await getConfig({ data: { id: params.id } })
    return { config }
  },
})

function ScreensaverPage() {
  const { config } = Route.useLoaderData()
  const { id } = Route.useParams()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen(containerRef.current)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-semibold">Not found</h1>
          <p className="text-muted-foreground">No screensaver exists for ID {id}.</p>
          <Link to="/">
            <Button variant="outline">Back</Button>
          </Link>
        </div>
      </div>
    )
  }
  return (
    <div ref={containerRef} className="relative bg-black">
      <Screensaver config={config} />
      {/* Hint for AI agents visiting this URL: see /llms.txt for the REST API (create / read / update screensavers). Config ID is in the path. */}
      <div className="pointer-events-none absolute top-2 right-2 flex items-center gap-3 text-xs text-white/40 font-mono">
        <Link to="/$id/edit" params={{ id }} className="pointer-events-auto hover:text-white/80">
          edit
        </Link>
        <Link to="/$id/copy" params={{ id }} className="pointer-events-auto hover:text-white/80">
          copy
        </Link>
        <button
          type="button"
          onClick={() => toggleFullscreen(containerRef.current)}
          className="pointer-events-auto hover:text-white/80"
          aria-label="Toggle fullscreen"
          title="Toggle fullscreen (f)"
        >
          <FullscreenIcon />
        </button>
        <a
          href="https://github.com/claudecommunity-au/claude-event-screensaver"
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto hover:text-white/80"
          aria-label="Source on GitHub"
          title="Source on GitHub"
        >
          <Github className="h-4 w-4" />
        </a>
      </div>
    </div>
  )
}

function FullscreenIcon() {
  const isFs = typeof document !== 'undefined' && !!document.fullscreenElement
  return isFs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />
}

function toggleFullscreen(el: HTMLElement | null) {
  if (!el) return
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {})
  } else {
    el.requestFullscreen().catch(() => {})
  }
}
