import { defineResource } from 'bistrio'
import { CustomMethodOption } from '@server/customizers'

export type User = {
  id: number
  name: string
}

export default defineResource((_support, _options) => {
  const users: Map<number, User> = new Map([
    [1, { id: 1, name: 'test1' }],
    [2, { id: 2, name: 'test2' }],
  ])

  return {
    index: (option: CustomMethodOption) => {
      console.log(users)
      console.log(option)
      console.log(option.admin?.accessedAt)
      return Array.from(users, ([_id, data]) => data)
    },
  }
})
