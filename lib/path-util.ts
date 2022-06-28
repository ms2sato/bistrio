// @see https://stackoverflow.com/questions/29855098/is-there-a-built-in-javascript-function-similar-to-os-path-join
export function pathJoin(...parts: string[]) {
  const separator = '/'
  parts = parts.map((part, index) => {
    if (index) {
      part = part.replace(new RegExp('^' + separator), '')
    }
    if (index !== parts.length - 1) {
      part = part.replace(new RegExp(separator + '$'), '')
    }
    return part
  })
  return parts.join(separator)
}

