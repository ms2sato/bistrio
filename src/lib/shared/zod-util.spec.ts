import { object, string, array, number, date } from 'zod'
import { fillDefault, deepCast } from './zod-util.js'

const itemSchema = object({
  type: string().default('test'),
  number: number(),
  numbersHasDefault: array(number()).default([]),
})

const userSchema = object({
  name: string(),
  age: number().default(20),
  createdAt: date(),
  numbers: array(number()),
  hobbies: array(string()),
  item: itemSchema,
  items: array(itemSchema),
  numbersHasDefault: array(number()).default([]),
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
