export const nullMiddlewares = new Proxy(
  {},
  {
    get(_target) {
      // return function which return null ReqeustHandler
      return () => {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        return () => {}
      }
    },
  },
)
