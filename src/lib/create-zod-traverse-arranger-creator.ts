import { AnyZodObject, z } from 'zod'
import { strip, cast, ArrangeResult, nullArrangeResult } from './shared/zod-util.js'
import { NextRet, TraverseArranger, TraverseArrangerCreator } from './parse-form-body.js'

type ShapedSchema = {
  shape: Record<string, AnyZodObject>
}

type ParentSchema = {
  element: AnyZodObject
}

function isShapedSchema(schema: unknown): schema is ShapedSchema {
  return (schema as ShapedSchema).shape !== undefined && typeof (schema as ShapedSchema).shape === 'object'
}

function isParentSchema(schema: unknown): schema is ParentSchema {
  return (schema as ParentSchema).element !== undefined && typeof (schema as ParentSchema).element === 'object'
}

export function createZodTraverseArrangerCreator(schema: z.AnyZodObject): TraverseArrangerCreator {
  return () => new ZodArranger(schema)
}

export class ZodArranger implements TraverseArranger {
  private topSchema: z.AnyZodObject
  private schema: z.AnyZodObject

  constructor(schema: z.AnyZodObject) {
    this.topSchema = schema
    this.schema = schema
  }

  next(path: string, _node: unknown, _value: unknown, _pathIndex: number): NextRet | void {
    const schema = this.schema as unknown
    if (isShapedSchema(schema)) {
      const pathSchema = schema.shape[path]
      if (!pathSchema) {
        throw new Error(`Unexpected path: ${path}`)
      }

      this.schema = strip(pathSchema)

      if (pathSchema instanceof z.ZodDefault) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { type: 'default', value: (pathSchema as z.ZodDefault<any>)._def.defaultValue() }
      }
    } else {
      throw new Error(`Unexpected Type: ${this.schema.toString()}`)
    }
  }

  nextItem(name: string, _node: unknown, _value: unknown, _pathIndex: number): void {
    const schema = this.schema as unknown
    if (isShapedSchema(schema)) {
      const parentSchema = strip(schema.shape[name])
      if (isParentSchema(parentSchema)) {
        this.schema = strip(parentSchema.element)
        return
      }
    }

    throw new Error(`Unexpected Type: ${this.schema.toString()}`)
  }

  arrangeIndexedArrayItemOnLast(_name: string, _node: unknown, value: unknown, _pathIndex: number): ArrangeResult {
    if (this.isArraySchema()) {
      const arraySchema = this.schema
      if (isParentSchema(arraySchema)) {
        return cast(arraySchema.element, value)
      }
      throw new Error(`Unexpected Type: ${this.schema.toString()}`)
    }
    return nullArrangeResult
  }

  arrangeUnindexedArrayOnLast(_name: string, _node: unknown, value: unknown[], _pathIndex: number): ArrangeResult {
    if (this.isArraySchema()) {
      const arraySchema = this.schema
      if (isParentSchema(arraySchema)) {
        return this.castArray(arraySchema.element, value)
      }
    }

    if (this.schema) {
      throw new Error(`Unexpected Type: name=${_name}, ${this.schema.toString()}`)
    } else {
      throw new Error(`Unexpected Type: name=${_name}, without schema`)
    }
  }

  arrangePropertyOnLast(_path: string, _node: unknown, value: unknown, _pathIndex: number): ArrangeResult {
    const result = cast(this.schema, value)
    if (result.arranged) {
      return result
    }
    return nullArrangeResult
  }

  normalize(value: unknown): unknown {
    return this.topSchema.parse(value)
  }

  private isArraySchema() {
    return this.schema.constructor.name === 'ZodArray'
  }

  private castArray(elementSchema: z.AnyZodObject, value: unknown[]): ArrangeResult {
    return {
      arranged: true,
      result: value.map((item: unknown) => {
        const { result } = cast(elementSchema, item)
        return result
      }),
    }
  }
}
