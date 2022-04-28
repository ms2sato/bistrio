import { ReactNode } from 'react'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html>
      <head>
        <link type="text/css" rel="stylesheet" href="/stylesheets/style.css"></link>
      </head>
      <body>{children}</body>
    </html>
  )
}
