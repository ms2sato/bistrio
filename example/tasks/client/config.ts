import { Actions, ClientRouterConfig } from "bistrio"

export const config = ():Partial<ClientRouterConfig> => {
  return {
    host: window.location.origin,
    constructConfig: Actions.defaultConstructConfig(),
  }
}