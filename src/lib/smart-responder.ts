import { NextFunction } from 'express'
import { ActionContext, FilledResponder } from './action-context.js'
import { JsonFormatter, StandardJsonFormatter, ValidationError } from './shared/index.js'

type ContextHolder = {
  ctx: ActionContext
}

function isContextHolder(obj: unknown): obj is ContextHolder {
  return (obj as ContextHolder).ctx !== undefined && typeof (obj as ContextHolder).ctx === 'object'
}

// FIXME: @see https://google.github.io/styleguide/jsoncstyleguide.xml
export class StandardJsonResponder<Opt = unknown, Out = unknown, Src = unknown>
  implements FilledResponder<Opt, Out, Src>
{
  constructor(private jsonFormatter: JsonFormatter = new StandardJsonFormatter()) {}

  success(_ctx: ActionContext, output: Out) {
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
    return Response.json(ret.json, { status: ret.status })
  }

  invalid(_ctx: ActionContext, validationError: ValidationError, _source: Src) {
    const ret = this.jsonFormatter.invalid(validationError)
    return Response.json(ret.json, { status: ret.status })
  }

  fatal(_ctx: ActionContext, err: Error) {
    if (process.env.NODE_ENV === 'production') {
      const ret = this.jsonFormatter.fatal(err)
      return Response.json(ret.json, { status: ret.status })
    } else {
      throw err
    }
  }
}

/**
 * Fatal handler is called when the error is not handled by the responder.
 * Throw error or Response object to respond.
 * @returns Response object
 */
export type RespondFatalHandler = <Opt>(
  ctx: ActionContext,
  err: Error,
  options?: Opt,
  next?: NextFunction,
) => false | undefined | Response | Promise<Response | undefined>

export class SmartResponder<Opt = unknown, Out = unknown, Src = unknown> implements FilledResponder<Opt, Out, Src> {
  constructor(
    private fatalHandler: RespondFatalHandler,
    private jsonResonder: FilledResponder<Opt, Out, Src> = new StandardJsonResponder(),
  ) {}

  async success(ctx: ActionContext, output: Out) {
    if (output instanceof Response) {
      return output
    }

    if (ctx.willRespondJson()) {
      return await this.jsonResonder.success(ctx, output)
    }

    if (!ctx.descriptor.page) {
      return await this.jsonResonder.success(ctx, output)
    } else {
      await ctx.renderRequestedView()
    }
  }

  async invalid(ctx: ActionContext, validationError: ValidationError, source: Src) {
    return await this.jsonResonder.invalid(ctx, validationError, source)
  }

  async fatal(ctx: ActionContext, err: Error, option?: Opt, next?: NextFunction) {
    console.error('fatal', err)
    if (ctx.willRespondJson()) {
      return await this.jsonResonder.fatal(ctx, err, option)
    }

    return await this.fatalHandler(ctx, err, option, next)
  }
}
