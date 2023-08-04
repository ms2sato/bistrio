import { User as TUser } from '@isomorphic/params'

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends TUser {}
  }
}
