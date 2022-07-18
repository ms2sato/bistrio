import { StaticProps } from '../lib/shared/static-props'

export {} // for ts2669
// @see https://stackoverflow.com/questions/57132428/augmentations-for-the-global-scope-can-only-be-directly-nested-in-external-modul

declare module 'express-session' {
  // @see https://stackoverflow.com/questions/38900537/typescript-extend-express-session-interface-with-own-class

  interface SessionData {
    bistrio: StaticProps
  }
}
