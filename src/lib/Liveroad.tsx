export function Livereload() {
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
    return <></>
  }

  const port = process.env.LIVERELOAD_PORT || 35729
  const origin = process.env.LIVERELOAD_ORIGIN || `http://' + (location.host || 'localhost').split(':')[0] + ':${port}`
  const src = `${origin}/livereload.js?snipver=1`
  const livereloadScript = `document.write('<script src="${src}" defer></' + 'script>')`

  return (
    <script
      defer
      dangerouslySetInnerHTML={{
        __html: livereloadScript,
      }}
    />
  )
}
