import { User as TUser } from '@universal/params'

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends TUser {}
  }
}
