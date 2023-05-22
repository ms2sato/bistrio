import { parseFormBody } from './parse-form-body'

describe('simple', () => {
  test('value', () => {
    expect(parseFormBody({ name: 'MyName', age: 20 })).toEqual({ name: 'MyName', age: 20 })
  })

  test('array', () => {
    expect(parseFormBody({ 'hobbies[]': ['guitar', 'piano'] })).toEqual({ hobbies: ['guitar', 'piano'] })
  })
})

describe('nested', () => {
  test('value', () => {
    expect(parseFormBody({ 'user.name': 'MyName', 'user.age': 20 })).toEqual({ user: { name: 'MyName', age: 20 } })
  })

  test('array', () => {
    expect(parseFormBody({ 'user.hobbies[]': ['guitar', 'piano'] })).toEqual({ user: { hobbies: ['guitar', 'piano'] } })
  })

  test('deep', () => {
    expect(parseFormBody({ 'group.user.name': 'MyName', 'group.user.hobbies[]': ['guitar', 'piano'] })).toEqual({
      group: { user: { name: 'MyName', hobbies: ['guitar', 'piano'] } },
    })
  })

  test('multiple root', () => {
    expect(parseFormBody({ 'member.user.name': 'MyName', 'group.user.hobbies[]': ['guitar', 'piano'] })).toEqual({
      member: { user: { name: 'MyName' } },
      group: { user: { hobbies: ['guitar', 'piano'] } },
    })
  })
})

describe('array node', () => {
  test('array straight', () => {
    expect(parseFormBody({ 'user.hobbies[0]': 'guitar', 'user.hobbies[1]': 'piano' })).toEqual({
      user: { hobbies: ['guitar', 'piano'] },
    })
  })

  test('array missing teeth', () => {
    expect(parseFormBody({ 'user.hobbies[1]': 'guitar', 'user.hobbies[5]': 'piano' })).toEqual({
      user: { hobbies: [undefined, 'guitar', undefined, undefined, undefined, 'piano'] },
    })
  })

  test('array blanks', () => {
    expect(parseFormBody({ 'user.hobbies[]': ['guitar', 'piano'] })).toEqual({
      user: { hobbies: ['guitar', 'piano'] },
    })
  })

  test('array blanks to empty array', () => {
    expect(parseFormBody({ 'user.hobbies[]': [] })).toEqual({
      user: { hobbies: [] },
    })
  })

  test('array blanks to undefined', () => {
    expect(parseFormBody({ 'user.hobbies[]': undefined })).toEqual({
      user: { hobbies: [] },
    })
  })

  test('array blanks to empty string', () => {
    expect(parseFormBody({ 'user.hobbies[]': '' })).toEqual({
      user: { hobbies: [''] },
    })
  })

  test('array blank but one value', () => {
    expect(parseFormBody({ 'user.hobbies[]': 'guitar' })).toEqual({
      user: { hobbies: ['guitar'] },
    })
  })

  test('array must have "[]"', () => {
    expect(() => parseFormBody({ 'user.hobbies': ['guitar', 'piano'] })).toThrow(Error) // TODO: ParseError
  })

  test('array blanks deep path', () => {
    // TODO: Unimplemented
    expect(() => parseFormBody({ 'user.hobbies[].name': ['guitar', 'piano'] })).toThrow(Error)
  })

  test('array deep path', () => {
    expect(
      parseFormBody({
        'user.hobbies[0].name': 'guitar',
        'user.hobbies[0].type': 'stringed',
        'user.hobbies[1].name': 'piano',
        'user.hobbies[1].type': 'keyboard',
      })
    ).toEqual({
      user: {
        hobbies: [
          { name: 'guitar', type: 'stringed' },
          { name: 'piano', type: 'keyboard' },
        ],
      },
    })
  })

  // half of node has index
  // error cases
})
