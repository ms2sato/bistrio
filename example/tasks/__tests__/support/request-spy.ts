import { HTTPRequest } from 'puppeteer'
import { Page, Request } from 'expect-puppeteer/node_modules/@types/puppeteer'

type HttpRequestImpl = HTTPRequest & {
  _requestId: string
}

type RequestId = string

type Criteria = {
  url?: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
  resourceType?:
    | 'document'
    | 'stylesheet'
    | 'script'
    | 'image'
    | 'media'
    | 'font'
    | 'texttrack'
    | 'xhr'
    | 'fetch'
    | 'eventsource'
    | 'websocket'
    | 'manifest'
    | 'other'
    | 'ajax'
}

export function matchCriteria(request: Request, criteria: Criteria) {
  return (
    (criteria.url === undefined || request.url() === criteria.url) &&
    (criteria.method === undefined || request.method() === criteria.method) &&
    (criteria.resourceType === undefined ||
      request.resourceType() === criteria.resourceType ||
      (criteria.resourceType === 'ajax' && ['xhr', 'fetch'].includes(request.resourceType())))
  )
}

export function match(criterias: Criteria[], request: Request): boolean {
  return criterias.find((criteria) => matchCriteria(request, criteria)) !== undefined
}

export class RequestMap {
  private map = new Map<RequestId, Request>()

  public set: Map<RequestId, Request>['set']
  public has: Map<RequestId, Request>['has']

  constructor() {
    this.set = this.map.set.bind(this.map)
    this.has = this.map.has.bind(this.map)
  }

  get length() {
    return this.map.size
  }

  asArray() {
    return Array.from(this.map.values()).map((req) => ({
      url: req.url(),
      method: req.method(),
      resourceType: req.resourceType(),
    }))
  }

  where(criteria: Criteria) {
    const ret: Request[] = []

    for (const request of this.map.values()) {
      if (matchCriteria(request, criteria)) {
        ret.push(request)
      }
    }
    return ret
  }

  clear() {
    this.map.clear()
  }
}

export type RequestHolder = {
  requested: RequestMap
  failed: RequestMap
  finished: RequestMap
  errors: Error[]
  ok: boolean
  waitForResponses(count: number): Promise<void>
  waitForResponses(count: number, criterias: Criteria | Criteria[]): Promise<void>
  clear(): void
  clearAndWaitForResponses(count: number): Promise<void>
  clearAndWaitForResponses(count: number, criterias: Criteria | Criteria[]): Promise<void>
}

function requestHoldable(page: Page): RequestHolder {
  const getRequestId = (request: Request) => (request as unknown as HttpRequestImpl)._requestId

  const requested: RequestMap = new RequestMap()
  const failed: RequestMap = new RequestMap()
  const finished: RequestMap = new RequestMap()
  const errors: Error[] = []

  let waitingCriterias: Criteria[] = []
  let matchingCriteriaCount: number
  let criteriaPromiseResolver: () => void

  page.on('pageerror', (error) => {
    errors.push(error)
  })

  page.on('request', (request) => {
    requested.set(getRequestId(request), request)
  })

  page.on('requestfinished', (request) => {
    finished.set(getRequestId(request), request)

    // console.log('matchCriteria', matchCriteria(request, { resourceType: 'ajax' }))

    if (match(waitingCriterias, request)) {
      // console.debug('match!', matchingCriteriaCount)
      if (--matchingCriteriaCount === 0) {
        criteriaPromiseResolver()
      }
    }
  })

  page.on('requestfailed', (request) => {
    failed.set(getRequestId(request), request)
  })

  return {
    requested,
    failed,
    finished,
    errors,
    get ok() {
      return failed.length === 0 && errors.length === 0
    },
    async waitForResponses(count: number, criterias: Criteria | Criteria[] = []) {
      if (Array.isArray(criterias)) {
        waitingCriterias = criterias
      } else {
        waitingCriterias = [criterias]
      }

      const criteriadPromise = new Promise<void>((resolve) => {
        criteriaPromiseResolver = resolve
      })
      matchingCriteriaCount = count
      await criteriadPromise
    },
    clear() {
      // console.log('clear')
      this.requested.clear()
      this.failed.clear()
      this.finished.clear()
      this.errors.length = 0

      waitingCriterias = []
      matchingCriteriaCount = 0
    },
    async clearAndWaitForResponses(count: number, criterias: Criteria | Criteria[] = []) {
      this.clear()
      return this.waitForResponses(count, criterias)
    },
  }
}

export function spy(page: Page) {
  page.on('pageerror', (error) => {
    console.error('[Error]pageerror', error)
  })

  // page.on('request', (request) => {
  //   console.debug('request', request.url(), request.resourceType())
  // })

  // page.on('requestfinished', (request) => {
  //   console.debug('requestfinished', request)
  // })

  page.on('requestfailed', (request) => {
    console.error('[Error]requestfailed', request.url(), request)
  })

  return requestHoldable(page)
}

export const waitForAnyInnerText = (page: Page, selector: string, text: string) => {
  return page.waitForFunction(
    `Array.from(document.querySelectorAll("${selector}")).some((node)=> node.innerText == "${text}")`,
  )
}

export const waitForNotAnyInnerText = (page: Page, selector: string, text: string) => {
  return page.waitForFunction(
    `Array.from(document.querySelectorAll("${selector}")).every((node) => node.innerText != "${text}")`,
  )
}
