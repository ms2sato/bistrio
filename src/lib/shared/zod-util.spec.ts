import { z } from 'zod'
import { fillDefault, deepCast } from './zod-util.js'

const itemSchema = z.object({
  type: z.string().default('test'),
  number: z.number(),
  numbersHasDefault: z.array(z.number()).default([]),
})

const userSchema = z.object({
  name: z.string(),
  age: z.number().default(20),
  createdAt: z.date(),
  numbers: z.array(z.number()),
  hobbies: z.array(z.string()),
  item: itemSchema,
  items: z.array(itemSchema),
  numbersHasDefault: z.array(z.number()).default([]),
})

describe('fillDefault', () => {
  test('simple', () => {
    expect(fillDefault(userSchema, {})).toEqual({ age: 20, numbersHasDefault: [] })
  })

  test('not overwite', () => {
    expect(fillDefault(userSchema, { age: 10, numbersHasDefault: [1] })).toEqual({ age: 10, numbersHasDefault: [1] })
  })

  test('nested object', () => {
    expect(fillDefault(userSchema, { item: {} })).toEqual({
      age: 20,
      numbersHasDefault: [],

      item: { type: 'test', numbersHasDefault: [] },
    })
  })

  test('nested array', () => {
    expect(fillDefault(userSchema, { items: [{}] })).toEqual({
      age: 20,
      numbersHasDefault: [],
      items: [{ type: 'test', numbersHasDefault: [] }],
    })
  })
})

describe('deepCast', () => {
  test('simple', () => {
    const ret = deepCast(userSchema, { age: '20', numbers: ['1', '2'] })
    expect(ret).toEqual({ age: 20, numbers: [1, 2] })
  })
})
