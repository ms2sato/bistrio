export const nullMiddlewares = new Proxy(
  {},
  {
    get(_target) {
      // return function which return null ReqeustHandler
      return () => {
        return () => {}
      }
    },
  },
)
