import { ScriptProps, generateScripts } from '..'

export function Scripts(props: ScriptProps): JSX.Element {
  if (!props.hydrate) {
    return <></>
  }

  const scripts = generateScripts(props)

  return (
    <>
      {scripts.map((js) => {
        return <script key={js} src={js} defer></script>
      })}
    </>
  )
}
