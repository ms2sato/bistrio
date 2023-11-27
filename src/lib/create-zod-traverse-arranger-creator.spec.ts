import { parseFormBody } from './parse-form-body.js'
import { createZodTraverseArrangerCreator } from './create-zod-traverse-arranger-creator.js'
import { z } from 'zod'

const itemSchema = z.object({
  type: z.string(),
  number: z.number(),
})

const nameSchema = z.object({
  name: z.string(),
})

const numberSchema = z.object({
  age: z.number(),
})

const dateSchema = z.object({
  createdAt: z.date(),
})

const stringArraySchema = z.object({
  hobbies: z.array(z.string()),
})

const numberArraySchema = z.object({
  numbers: z.array(z.number()),
})

const itemArraySchema = z.object({
  items: z.array(itemSchema),
})

const defaultArraySchema = z.object({
  numbersHasDefault: z.array(z.number()).default([]),
})

const userSchema = z.object({
  name: z.string(),
  age: z.number(),
  createdAt: z.date(),
  numbers: z.array(z.number()),
  hobbies: z.array(z.string()),
  items: z.array(itemSchema),
  numbersHasDefault: z.array(z.number()).default([]),
})

const arrangerCreator = createZodTraverseArrangerCreator(userSchema)

test('value number', () => {
  expect(parseFormBody({ age: '20' }, createZodTraverseArrangerCreator(numberSchema))).toEqual({ age: 20 })
})

test('value date', () => {
  expect(parseFormBody({ createdAt: '2022/4/13 10:10:10' }, createZodTraverseArrangerCreator(dateSchema))).toEqual({
    createdAt: new Date(2022, 3, 13, 10, 10, 10),
  })
})

test('value string[]', () => {
  expect(
    parseFormBody({ 'hobbies[]': ['guitar', 'piano'] }, createZodTraverseArrangerCreator(stringArraySchema)),
  ).toEqual({
    hobbies: ['guitar', 'piano'],
  })
})

test('cast array string to number', () => {
  expect(parseFormBody({ 'numbers[]': ['12', '23'] }, createZodTraverseArrangerCreator(numberArraySchema))).toEqual({
    numbers: [12, 23],
  })
})

test('value number[index]=value', () => {
  expect(
    parseFormBody({ 'numbers[0]': '12', 'numbers[1]': '23' }, createZodTraverseArrangerCreator(numberArraySchema)),
  ).toEqual({
    numbers: [12, 23],
  })
})

test('value items[index].number', () => {
  expect(
    parseFormBody(
      { 'items[0].number': '12', 'items[0].type': 'type1', 'items[1].number': '23', 'items[1].type': 'type2' },
      createZodTraverseArrangerCreator(itemArraySchema),
    ),
  ).toEqual({
    items: [
      {
        type: 'type1',
        number: 12,
      },
      {
        type: 'type2',
        number: 23,
      },
    ],
  })
})

test('default array', () => {
  expect(parseFormBody({}, createZodTraverseArrangerCreator(defaultArraySchema))).toEqual({
    numbersHasDefault: [],
  })
})

test('default arrayoverride', () => {
  expect(
    parseFormBody({ 'numbersHasDefault[]': ['12', '23'] }, createZodTraverseArrangerCreator(defaultArraySchema)),
  ).toEqual({
    numbersHasDefault: [12, 23],
  })
})

test('blank string to null', () => {
  expect(parseFormBody({ name: '' }, createZodTraverseArrangerCreator(nameSchema))).toEqual({ name: '' })
})

test('unkown property', () => {
  expect(() => parseFormBody({ unknown: '', age: '20' }, arrangerCreator)).toThrow(`Unexpected path: unknown`)
})

test('unkown array property', () => {
  expect(() => parseFormBody({ 'tags[]': ['test1'], age: '20' }, arrangerCreator)).toThrow(`Unexpected path: tags`)
})
