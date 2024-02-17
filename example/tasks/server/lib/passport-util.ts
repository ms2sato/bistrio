import passport, { type AuthenticateCallback } from 'passport'
import { type Express, type NextFunction } from 'express'
import { IVerifyOptions, Strategy, VerifyFunction } from 'passport-local'
import { ActionContext } from 'bistrio'
import { compare } from './crypter'
import { getPrismaClient } from './prisma-util'
import { User, userSchema } from '@universal/params'

// @see https://www.passportjs.org/tutorials/password/

const prisma = getPrismaClient()

const verify: VerifyFunction = (username, password, done) => {
  ;(async () => {
    const user = await prisma.user.findFirst({ where: { username } })
    if (!user || !(await compare(password, user.hashedPassword))) {
      return done(null, false, { message: 'Incorrect username or password.' })
    }

    done(null, userSchema.parse(user))
  })().catch((err) => {
    done(err, false)
  })
}

type PartialUser = { id: number; username: string }

export const init = (app: Express) => {
  app.use(passport.initialize())
  app.use(passport.session())
  passport.use(new Strategy(verify))

  passport.serializeUser<PartialUser>(function (u, done) {
    console.log('serializeUser', u)
    const { id, username } = u as User
    done(null, { id, username })
  })

  passport.deserializeUser<PartialUser>(function (u, done) {
    ;(async () => {
      const user = await prisma.user.findUniqueOrThrow({ where: { id: u.id } })
      done(null, userSchema.parse(user))
    })().catch((err) => {
      done(err, false)
    })
  })
}

export const authenticate = (ctx: ActionContext, next?: NextFunction) => {
  return new Promise<{ user?: User | false; info?: IVerifyOptions }>((resolve, reject) => {
    if (!next) {
      next = (err) => reject(err)
    }

    const handler: AuthenticateCallback = (err, user, info) => {
      if (err) {
        reject(err)
        return
      }

      if (!user) {
        resolve({ user: false, info: info as IVerifyOptions })
        return
      }

      ctx.req.session.regenerate(function (err) {
        if (err) {
          reject(err)
          return
        }

        ctx.req.login(user, function (err) {
          if (err) {
            reject(err)
            return
          }
          resolve({ user: user as User, info: info as IVerifyOptions })
        })
      })
    }

    // TODO: typesafe
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    passport.authenticate('local', handler)(ctx.req, ctx.res, next)
  })
}

export { passport }
