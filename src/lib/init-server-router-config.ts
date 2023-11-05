import { Actions } from '..'
import { ResourceMethodHandlerParams, ServerRouterConfig, ServerRouterConfigCustom } from './server-router-config'
import {
  createDefaultActionContext,
  createNullActionOption,
  createSmartInputArranger,
  formatPlaceholderForRouter,
  renderDefault,
} from './server-router-config-defaults'
import { SmartResponder, StandardJsonResponder } from './smart-responder'

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
    adapterRoot: './endpoint',
    adapterFileName: 'adapter',
    resourceRoot: './endpoint',
    resourceFileName: 'resource',
  }
}

export function initServerRouterConfig(serverRouterConfig: ServerRouterConfigCustom): ServerRouterConfig {
  return Object.assign(defaultServerRouterConfig(), serverRouterConfig)
}
