import { Actions } from '../index.js'
import { CreateDefaultResponderFunc, ServerRouterConfig, ServerRouterConfigCustom } from './server-router-config.js'
import {
  createNullActionOption,
  createSmartInputArranger,
  formatPlaceholderForRouter,
  importLocal,
} from './server-router-config-defaults.js'
import { SmartResponder, StandardJsonResponder } from './smart-responder.js'

const createSmartResponder: CreateDefaultResponderFunc = () => {
  return new SmartResponder(() => {
    throw new Error('Unimplemented Fatal Handler')
  }, new StandardJsonResponder())
}

function defaultServerRouterConfig(): Omit<ServerRouterConfig, 'baseDir' | 'loadPage'> {
  return {
    actions: Actions.page(),
    inputArranger: createSmartInputArranger(),
    createActionOptions: createNullActionOption,
    createActionContext: () => {
      throw new Error('createActionContext should be override for server platform')
    },
    constructConfig: Actions.defaultConstructConfig(),
    createDefaultResponder: createSmartResponder,
    formatPlaceholderForRouter,
    adapterRoot: './resources',
    adapterFileName: 'adapter',
    resourceRoot: './resources',
    resourceFileName: 'resource',
    importLocal,
  }
}

export function initServerRouterConfig(serverRouterConfig: ServerRouterConfigCustom): ServerRouterConfig {
  return Object.assign(defaultServerRouterConfig(), serverRouterConfig)
}
