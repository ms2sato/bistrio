import { ActionContext, Responder } from './action-context.js'
import { ServerRouterImpl } from './server-router-impl.js'
import { JsonFormatter, StandardJsonFormatter, ValidationError } from './shared/index.js'

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

type RespondFatalHandler = (ctx: ActionContext, err: Error) => Promise<void>

export class SmartResponder<Opt = undefined, Out = unknown, Src = unknown> implements Responder<Opt, Out, Src> {
  constructor(
    private router: ServerRouterImpl,
    private fatalHandler: RespondFatalHandler,
    private jsonResonder = new StandardJsonResponder(),
  ) {}

  async success(ctx: ActionContext, output: Out): Promise<void> {
    if (ctx.willRespondJson()) {
      return await this.jsonResonder.success(ctx, output)
    }

    if (this.router.serverRouterConfig.renderDefault(ctx, output) === false) {
      return await this.jsonResonder.success(ctx, output)
    }
  }

  async invalid(ctx: ActionContext, validationError: ValidationError, source: Src): Promise<void> {
    return await this.jsonResonder.invalid(ctx, validationError, source)
  }

  async fatal(ctx: ActionContext, err: Error): Promise<void> {
    console.error('fatal', err)
    if (ctx.willRespondJson()) {
      return await this.jsonResonder.fatal(ctx, err)
    }

    await this.fatalHandler(ctx, err)
  }
}
