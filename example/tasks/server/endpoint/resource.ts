import { defineResource} from 'restrant2'

export default defineResource((_support, _options) => ({
  index: () => {
    return { name: 'test' }
  },
}))
