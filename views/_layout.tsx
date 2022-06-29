import { ReactNode } from 'react'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html>
      <head>
        <link type="text/css" rel="stylesheet" href="/stylesheets/style.css"></link>
        <script src="/main.js" defer></script>
      </head>
      <body>
        <div id="app">{children}</div>
      </body>
    </html>
  )
}
