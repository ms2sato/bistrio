import express from 'express'
import { NamedResources, ActionContext, ActionDescriptor, RouterCore } from '../index.js'

export class NullActionContext implements ActionContext {
  private errorMessage = 'Cannot access this ActionContext(May not request context)'

  render() {
    throw new Error(this.errorMessage)
  }
  redirect() {
    throw new Error(this.errorMessage)
  }
  get params(): express.Request['params'] {
    throw new Error(this.errorMessage)
  }
  get body(): express.Request['body'] {
    throw new Error(this.errorMessage)
  }
  get query(): express.Request['query'] {
    throw new Error(this.errorMessage)
  }
  get format(): string {
    throw new Error(this.errorMessage)
  }
  get input(): unknown {
    throw new Error(this.errorMessage)
  }
  get req(): express.Request {
    throw new Error(this.errorMessage)
  }
  get res(): express.Response {
    throw new Error(this.errorMessage)
  }
  get httpPath(): string {
    throw new Error(this.errorMessage)
  }
  get httpFilePath(): string {
    throw new Error(this.errorMessage)
  }
  get routePath(): string {
    throw new Error(this.errorMessage)
  }
  get descriptor(): ActionDescriptor {
    throw new Error(this.errorMessage)
  }
  willRespondJson(): boolean {
    throw new Error(this.errorMessage)
  }
  resources(): NamedResources {
    throw new Error(this.errorMessage)
  }
  getCore(): RouterCore {
    throw new Error(this.errorMessage)
  }
}
