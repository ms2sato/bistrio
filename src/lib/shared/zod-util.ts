import { z } from 'zod'

export type ArrangeResult =
  | {
      arranged: true
      result: unknown
    }
  | {
      arranged: false
      result: undefined
    }

const nullArrangeResult = { arranged: false, result: undefined }
export { nullArrangeResult }

type WrapType = {
  innerType: z.AnyZodObject
}

export function strip(schema: z.AnyZodObject): z.AnyZodObject {
  if (schema instanceof z.ZodDefault || schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    const wrapType = schema._def as WrapType
    return strip(wrapType.innerType)
  }
  return schema
}

export function cast(schema: z.AnyZodObject, value: unknown): ArrangeResult {
  try {
    if (schema instanceof z.ZodBigInt && typeof value !== 'bigint') {
      return { arranged: true, result: BigInt(value as number) }
    }
    if (schema instanceof z.ZodNumber && typeof value !== 'number') {
      const num = Number(value)
      if (Number.isNaN(num)) {
        return nullArrangeResult
      }
      return { arranged: true, result: num }
    }
    if (schema instanceof z.ZodBoolean && typeof value !== 'boolean') {
      return { arranged: true, result: Boolean(value) }
    }
    if (schema instanceof z.ZodDate && !(value instanceof Date)) {
      return { arranged: true, result: new Date(value as number) }
    }
    if (schema instanceof z.ZodString) {
      return { arranged: true, result: (value as number).toString() }
    }
    return nullArrangeResult
  } catch (err) {
    console.warn(err)
    return nullArrangeResult
  }
}

type TraverseBlankValueCallback = {
  (schema: z.AnyZodObject, obj: Record<string, unknown>, key: string): void
}

// FIXME: draft implements
function traverseBlankValue<S extends z.AnyZodObject>(schema: S, obj: unknown, callback: TraverseBlankValueCallback) {
  const shape = schema.shape as Record<string, z.AnyZodObject>
  for (const [key, subSchema] of Object.entries(shape)) {
    const record = obj as Record<string, unknown>
    if (key in record) {
      if (record[key] instanceof Array) {
        if (subSchema instanceof z.ZodArray) {
          for (const item of record[key] as unknown[]) {
            traverseBlankValue(subSchema.element, item, callback)
          }
        }
      } else if (record[key] instanceof Object) {
        if (subSchema instanceof z.ZodObject) {
          traverseBlankValue(subSchema, record[key], callback)
        }
      }
      continue
    }

    // key not found in obj
    callback(subSchema, obj as Record<string, unknown>, key)
  }
}

export function fillDefault<S extends z.AnyZodObject>(schema: S, obj: unknown): unknown {
  traverseBlankValue(schema, obj, (schema, obj, key) => {
    if (schema instanceof z.ZodDefault) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const defSchema = schema as z.ZodDefault<any>
      obj[key] = defSchema._def.defaultValue()
    }
  })
  return obj
}

export function isValue(obj: unknown): boolean {
  return (
    typeof obj === 'string' ||
    typeof obj === 'number' ||
    typeof obj === 'boolean' ||
    typeof obj === 'bigint' ||
    obj instanceof Date
  )
}

export function deepCast<S extends z.AnyZodObject>(schema: S, obj: unknown): z.infer<S> {
  if (isValue(obj)) {
    const ret = cast(strip(schema), obj)
    return (ret.arranged ? ret.result : obj) as z.infer<S>
  }

  if (obj instanceof Array) {
    const array = obj as unknown[]
    const arraySchema = strip(schema)
    if (arraySchema instanceof z.ZodArray) {
      const itemSchema = strip(arraySchema.element as z.AnyZodObject)
      array.forEach((item, index) => {
        array[index] = deepCast(itemSchema, item)
      })
    }
    return array
  }

  const record = obj as Record<string, unknown>
  for (const [key, val] of Object.entries<unknown>(record)) {
    const shape = strip(schema).shape as Record<string, z.AnyZodObject>
    const itemSchema = shape[key]
    if (itemSchema) {
      record[key] = deepCast(itemSchema, val)
    }
  }
  return record
}
