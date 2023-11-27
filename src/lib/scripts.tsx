import { ScriptProps, generateScripts } from '../index.js'

const cacheScripts = `
const isClient = typeof window !== 'undefined'
if (isClient && !window.BISTRIO) {
  window.BISTRIO = {
    cache: {},
    addCache(record) {
      this.cache[record.key] = record.data
    },
  }
}
`

export function Scripts(props: ScriptProps): JSX.Element {
  if (!props.hydrate) {
    return <></>
  }

  const scripts = generateScripts(props)

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: cacheScripts,
        }}
      />
      {scripts.map((js) => {
        return <script key={js} src={js} defer></script>
      })}
    </>
  )
}
