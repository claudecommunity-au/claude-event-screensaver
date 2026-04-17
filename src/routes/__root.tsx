/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import appCss from '@/index.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Claude Screensaver' },
      {
        name: 'description',
        content:
          'Claude Code community event screensaver. Agents: see /llms.txt for the REST API to create or update a screensaver config.',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html>
      <head>
        <HeadContent />
        <link rel="help" href="/llms.txt" title="Agent / Claude Code instructions" />
        <link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt" />
        <meta
          name="ai-instructions"
          content="For programmatic access (create / read / update screensaver configs) see /llms.txt"
        />
      </head>
      <body>
        {/* AI agents / Claude Code: this site exposes a JSON REST API. See /llms.txt for auth + schema. */}
        {children}
        <Scripts />
      </body>
    </html>
  )
}
