import { ActionContext, Responder } from './action-context'
import { ServerRouter } from './server-router'
import { JsonFormatter, StandardJsonFormatter, ValidationError } from './shared'

type ContextHolder = {
  ctx: ActionContext
}

function isContextHolder(obj: unknown): obj is ContextHolder {
  return (obj as ContextHolder).ctx !== undefined && typeof (obj as ContextHolder).ctx === 'object'
}

// FIXME: @see https://google.github.io/styleguide/jsoncstyleguide.xml
export class StandardJsonResponder<Opt = undefined, Out = unknown, Src = unknown> implements Responder<Opt, Out, Src> {
  constructor(private jsonFormatter: JsonFormatter = new StandardJsonFormatter()) {}

  success(ctx: ActionContext, output: Out): void | Promise<void> {
    let ret
    if (output === undefined || output === null) {
      ret = this.jsonFormatter.success(output)
    } else if (isContextHolder(output)) {
      const data = { ...output }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ctx, ...dataWithoutCtx } = data
      ret = this.jsonFormatter.success(dataWithoutCtx)
    } else {
      ret = this.jsonFormatter.success(output)
    }
    ctx.res.status(ret.status)
    ctx.res.json(ret.json)
  }

  invalid(ctx: ActionContext, validationError: ValidationError, _source: Src): void | Promise<void> {
    const ret = this.jsonFormatter.invalid(validationError)
    ctx.res.status(ret.status)
    ctx.res.json(ret.json)
  }

  fatal(ctx: ActionContext, err: Error): void | Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      const ret = this.jsonFormatter.fatal(err)
      ctx.res.status(ret.status)
      ctx.res.json(ret.json)
    } else {
      throw err
    }
  }
}

type FatalHandler = (ctx: ActionContext, err: Error) => void

export class SmartResponder<Opt = undefined, Out = unknown, Src = unknown> implements Responder<Opt, Out, Src> {
  constructor(
    private router: ServerRouter,
    private fatalHandler: FatalHandler,
    private jsonResonder = new StandardJsonResponder(),
  ) {}

  success(ctx: ActionContext, output: Out): void | Promise<void> {
    if (ctx.willRespondJson()) {
      return this.jsonResonder.success(ctx, output)
    }

    if (this.router.serverRouterConfig.renderDefault(ctx, output) === false) {
      return this.jsonResonder.success(ctx, output)
    }
  }

  invalid(ctx: ActionContext, validationError: ValidationError, source: Src): void | Promise<void> {
    return this.jsonResonder.invalid(ctx, validationError, source)
  }

  fatal(ctx: ActionContext, err: Error): void | Promise<void> {
    console.error('fatal', err)
    if (ctx.willRespondJson()) {
      return this.jsonResonder.fatal(ctx, err)
    }

    this.fatalHandler(ctx, err)
  }
}
