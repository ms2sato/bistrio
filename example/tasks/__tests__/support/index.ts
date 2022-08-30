import { HTTPRequest, Page } from 'puppeteer'

const HOST = process.env.HOST || 'http://localhost'
const URL = `${HOST}:${process.env.PORT ? Number(process.env.PORT) : 4569}`

export function asURL(httpPath: string) {
  return `${URL}/${httpPath}` // TODO: normalize URL
}

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

export function matchCriteria(request: HTTPRequest, criteria: Criteria) {
  return (
    (criteria.url === undefined || request.url() === criteria.url) &&
    (criteria.method === undefined || request.method() === criteria.method) &&
    (criteria.resourceType === undefined ||
      request.resourceType() === criteria.resourceType ||
      (criteria.resourceType === 'ajax' && ['xhr', 'fetch'].includes(request.resourceType())))
  )
}

export function match(criterias: Criteria[], request: HTTPRequest): boolean {
  return criterias.find((criteria) => matchCriteria(request, criteria)) !== undefined
}

export class RequestMap {
  private map = new Map<RequestId, HTTPRequest>()

  public set: Map<RequestId, HTTPRequest>['set']
  public has: Map<RequestId, HTTPRequest>['has']

  constructor() {
    this.set = this.map.set.bind(this.map)
    this.has = this.map.has.bind(this.map)
  }

  asArray() {
    return Array.from(this.map.values())
  }

  where(criteria: Criteria) {
    const ret: HTTPRequest[] = []

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
  waitForResponses(count: number): Promise<void>
  waitForResponses(count: number, criterias: Criteria | Criteria[]): Promise<void>
  clear(): void
}

function requestHoldable(page: Page): RequestHolder {
  const getRequestId = (request: HTTPRequest) => (request as HttpRequestImpl)._requestId

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
  }
}

export function extend(page: Page) {
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
