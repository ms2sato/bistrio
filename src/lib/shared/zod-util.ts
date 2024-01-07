import {
  AnyZodObject,
  ZodObject,
  ZodArray,
  ZodDefault,
  ZodOptional,
  ZodNullable,
  ZodBoolean,
  ZodString,
  ZodBigInt,
  ZodNumber,
  ZodDate,
} from 'zod'

const isSchemaOf =
  (
    zodType: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  ) =>
  (schema: unknown): boolean =>
    schema instanceof zodType

export const isZodDefault = isSchemaOf(ZodDefault)
export const isZodOptional = isSchemaOf(ZodOptional)
export const isZodNullable = isSchemaOf(ZodNullable)
export const isZodBoolean = isSchemaOf(ZodBoolean)
export const isZodString = isSchemaOf(ZodString)
export const isZodBigInt = isSchemaOf(ZodBigInt)
export const isZodNumber = isSchemaOf(ZodNumber)
export const isZodDate = isSchemaOf(ZodDate)
export const isZodArray = isSchemaOf(ZodArray)

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
  innerType: AnyZodObject
}

export function strip(schema: AnyZodObject): AnyZodObject {
  if (isZodDefault(schema) || isZodOptional(schema) || isZodNullable(schema)) {
    const wrapType = schema?._def as unknown as WrapType
    return strip(wrapType.innerType)
  }
  return schema
}

export function cast(schema: AnyZodObject, value: unknown): ArrangeResult {
  try {
    if (isZodBigInt(schema) && typeof value !== 'bigint') {
      return { arranged: true, result: BigInt(value as number) }
    }
    if (isZodNumber(schema) && typeof value !== 'number') {
      const num = Number(value)
      if (Number.isNaN(num)) {
        return nullArrangeResult
      }
      return { arranged: true, result: num }
    }
    if (isZodBoolean(schema) && typeof value !== 'boolean') {
      return { arranged: true, result: Boolean(value) }
    }
    if (isZodDate(schema) && !(value?.constructor?.name === 'Date')) {
      return { arranged: true, result: new Date(value as number) }
    }
    if (isZodString(schema)) {
      return { arranged: true, result: (value as number).toString() }
    }
    return nullArrangeResult
  } catch (err) {
    console.warn(err)
    return nullArrangeResult
  }
}

type TraverseBlankValueCallback = {
  (schema: AnyZodObject, obj: Record<string, unknown>, key: string): void
}

// FIXME: draft implements
function traverseBlankValue<S extends AnyZodObject>(schema: S, obj: unknown, callback: TraverseBlankValueCallback) {
  const shape = schema.shape as Record<string, AnyZodObject>
  for (const [key, subSchema] of Object.entries(shape)) {
    const record = obj as Record<string, unknown>
    if (key in record) {
      if (record[key] instanceof Array) {
        if (isZodArray(subSchema)) {
          for (const item of record[key] as unknown[]) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            traverseBlankValue((subSchema as unknown as ZodArray<any>).element, item, callback)
          }
        }
      } else if (record[key] instanceof Object) {
        if (subSchema instanceof ZodObject) {
          traverseBlankValue(subSchema, record[key], callback)
        }
      }
      continue
    }

    // key not found in obj
    callback(subSchema, obj as Record<string, unknown>, key)
  }
}

export function fillDefault<S extends AnyZodObject>(schema: S, obj: unknown): unknown {
  traverseBlankValue(schema, obj, (schema, obj, key) => {
    if (isZodDefault(schema)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const defSchema = schema as unknown as ZodDefault<any>
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

export function deepCast<S extends AnyZodObject>(schema: S, obj: unknown): Zod.infer<S> {
  if (isValue(obj)) {
    const ret = cast(strip(schema), obj)
    return (ret.arranged ? ret.result : obj) as Zod.infer<S>
  }

  if (obj instanceof Array) {
    const array = obj as unknown[]
    const arraySchema = strip(schema)
    if (isZodArray(arraySchema)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const itemSchema = strip((arraySchema as unknown as ZodArray<any>).element as AnyZodObject)
      array.forEach((item, index) => {
        array[index] = deepCast(itemSchema, item)
      })
    }
    return array
  }

  const record = obj as Record<string, unknown>
  for (const [key, val] of Object.entries<unknown>(record)) {
    const shape = strip(schema).shape as Record<string, AnyZodObject>
    const itemSchema = shape[key]
    if (itemSchema) {
      record[key] = deepCast(itemSchema, val)
    }
  }
  return record
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export const isBlank = (schema: AnyZodObject) => Object.keys(schema.shape).length === 0
