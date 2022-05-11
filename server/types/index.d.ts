import { LocaleTagFunc } from '../lib/locale'

declare global {
  namespace Express {
    interface Request {
      locale: LocaleTagFunc
    }
  }
}
