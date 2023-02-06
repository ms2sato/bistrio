import { defineResource} from 'bistrio'

export default defineResource((_support, _options) => ({
  index: () => {
    return { name: 'test' }
  },
}))
