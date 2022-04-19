import { defineResource } from 'restrant2'
import { CustomMethodOption } from '../../../../customizers'

export type User = {
  id: number
  name: string
}

export default defineResource((support, options) => {
  const users: Map<number, User> = new Map([
    [1, { id: 1, name: 'test1' }],
    [2, { id: 2, name: 'test2' }],
  ])

  return {
    index: (option: CustomMethodOption) => {
      console.log(users)
      console.log(option)
      console.log(option.admin?.accessedAt)
      return Array.from(users, ([id, data]) => data)
    },
  }
})
