import { ArrangeResult, nullArrangeResult } from './shared/zod-util.js'

export interface NextRet {
  type: 'default'
  value: unknown
}

export type TraverseArranger = {
  next: (path: string, node: unknown, value: unknown, pathIndex: number) => NextRet | void
  nextItem: (name: string, node: unknown, value: unknown, pathIndex: number) => void
  arrangeIndexedArrayItemOnLast: (name: string, node: unknown, value: unknown, pathIndex: number) => ArrangeResult
  arrangeUnindexedArrayOnLast: (name: string, node: unknown, value: unknown[], pathIndex: number) => ArrangeResult
  arrangePropertyOnLast: (path: string, node: unknown, value: unknown, pathIndex: number) => ArrangeResult
  normalize(value: unknown): unknown
}

export type TraverseArrangerCreator = {
  (): TraverseArranger
}

export function nullTraverseArranger(): TraverseArranger {
  return {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    next(): NextRet | void {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    nextItem() {},
    arrangeIndexedArrayItemOnLast() {
      return nullArrangeResult
    },
    arrangeUnindexedArrayOnLast() {
      return nullArrangeResult
    },
    arrangePropertyOnLast() {
      return nullArrangeResult
    },
    normalize(value: unknown) {
      return value
    },
  }
}

function arrangedResultOrRaw({ arranged, result }: ArrangeResult, value: unknown) {
  return arranged ? result : value
}

function createTraverser(arranger: TraverseArranger, key: string) {
  function traversePath(paths: string[], node: unknown, value: unknown, pathIndex = 0) {
    if (paths.length === 0) return

    const path = paths.shift()
    if (!path) {
      throw new Error('path is empty')
    }

    const arrayFirst = path.indexOf('[')
    const arrayLast = path.indexOf(']')

    if (arrayFirst !== -1) {
      if (arrayFirst === 0) {
        throw new Error(`'[' must not be first character in path: ${path}`)
      }

      if (arrayLast === -1) {
        throw new Error(`'[' and ']' must be provide in pairs : ${path}`)
      }

      if (arrayLast !== path.length - 1) {
        throw new Error(`']' must be last character in path: ${path}`)
      }

      const name = path.substring(0, arrayFirst)
      const indexStr = path.substring(arrayFirst + 1, arrayLast)

      const recordNode = node as Record<string, unknown>
      if (indexStr.length !== 0) {
        // format: name[index]

        const index = Number(indexStr)
        if (isNaN(index)) {
          throw new Error(`index must be number : ${path}`)
        }

        let arrayNodeItem = recordNode[name] as unknown[]
        if (arrayNodeItem === undefined) {
          recordNode[name] = arrayNodeItem = []
        }

        if (paths.length === pathIndex) {
          arranger.next(name, recordNode, value, pathIndex)
          arrayNodeItem[index] = arrangedResultOrRaw(
            arranger.arrangeIndexedArrayItemOnLast(name, recordNode, value, pathIndex),
            value,
          )
        } else {
          if (arrayNodeItem[index] === undefined) {
            arrayNodeItem[index] = {}
          }
          arranger.nextItem(name, recordNode, value, pathIndex)
          traversePath(paths, arrayNodeItem[index], value, pathIndex++)
        }
      } else {
        // format: name[]

        const ret = arranger.next(name, recordNode, value, pathIndex)
        // TODO: FIX! ここで valueがundefinedなら値をbodyから受け取っていない。
        // その場合、default が指定されていたらその値をセットして終われる。

        console.log(name, ret, value)

        if (value === undefined && ret && ret.type === 'default') {
          recordNode[name] = ret.value
          return
        }

        if (paths.length === pathIndex) {
          const array = value === undefined ? [] : value instanceof Array ? value : [value]
          recordNode[name] = arrangedResultOrRaw(
            arranger.arrangeUnindexedArrayOnLast(name, recordNode, array, pathIndex),
            array,
          )
        } else {
          throw new Error('Unimplemented')
        }
      }

      return
    } else if (arrayLast !== -1) {
      throw new Error(`'[' and ']' must be provide in pairs : ${path}`)
    }

    arranger.next(path, node, value, pathIndex)
    const recordNode = node as Record<string, unknown>
    if (recordNode[path] === undefined) {
      recordNode[path] = {}
    }
    if (paths.length === pathIndex) {
      if (value instanceof Array) {
        throw new Error(`Unexpected array input for single property name[${key}]: proposal '${path}[]'?`)
      }

      recordNode[path] = arrangedResultOrRaw(arranger.arrangePropertyOnLast(path, recordNode, value, pathIndex), value)
    } else {
      traversePath(paths, recordNode[path], value, pathIndex++)
    }
  }

  return traversePath
}

export function parseFormBody(
  body: Record<string, unknown>,
  arrangerCreator: TraverseArrangerCreator = nullTraverseArranger,
): Record<string, unknown> {
  const ret: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    createTraverser(arrangerCreator(), key)(key.split('.'), ret, value)
  }
  return arrangerCreator().normalize(ret) as Record<string, unknown>
}
