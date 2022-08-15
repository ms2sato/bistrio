import { ReactNode } from 'react'

type GlobalProps = {
  hydrate: boolean
}

export function Layout({ children, props }: { children: ReactNode; props: GlobalProps }) {
  return (
    <html>
      <head>
        <title>Tasks</title>
        <link type="text/css" rel="stylesheet" href="/stylesheets/style.css"></link>
        {props.hydrate && <script src="/main.js" defer></script>}
      </head>
      <body>
        <div id="app">{children}</div>
      </body>
    </html>
  )
}
