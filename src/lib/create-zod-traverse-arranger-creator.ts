import { AnyZodObject, z } from 'zod'
import { strip, cast, ArrangeResult, nullArrangeResult } from './shared/zod-util'
import { TraverseArranger, TraverseArrangerCreator } from './parse-form-body'

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
  constructor(private schema: z.AnyZodObject) {}

  next(path: string, _node: unknown, _value: unknown, _pathIndex: number): void {
    const schema = this.schema as unknown
    if (isShapedSchema(schema)) {
      this.schema = strip(schema.shape[path])
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

    throw new Error(`Unexpected Type: ${this.schema.toString()}`)
  }

  arrangePropertyOnLast(_path: string, _node: unknown, value: unknown, _pathIndex: number): ArrangeResult {
    const result = cast(this.schema, value)
    if (result.arranged) {
      return result
    }
    return nullArrangeResult
  }

  private isArraySchema() {
    return this.schema instanceof z.ZodArray
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
