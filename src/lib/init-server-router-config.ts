import { Actions } from '../index.js'
import { ResourceMethodHandlerParams, ServerRouterConfig, ServerRouterConfigCustom } from './server-router-config.js'
import {
  createDefaultActionContext,
  createNullActionOption,
  createSmartInputArranger,
  formatPlaceholderForRouter,
  importLocal,
  renderDefault,
} from './server-router-config-defaults.js'
import { SmartResponder, StandardJsonResponder } from './smart-responder.js'

const createSmartResponder = ({ router }: ResourceMethodHandlerParams) => {
  return new SmartResponder(
    router,
    () => {
      throw new Error('Unimplemented Fatal Handler')
    },
    new StandardJsonResponder(),
  )
}

function defaultServerRouterConfig(): Omit<ServerRouterConfig, 'baseDir' | 'pageLoadFunc'> {
  return {
    actions: Actions.page(),
    inputArranger: createSmartInputArranger(),
    createActionOptions: createNullActionOption,
    createActionContext: createDefaultActionContext,
    constructConfig: Actions.defaultConstructConfig(),
    createDefaultResponder: createSmartResponder,
    renderDefault: renderDefault,
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
