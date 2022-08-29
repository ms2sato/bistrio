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
  // console.log('criterias:', criterias)
  // console.log(
  //   'criteria.find',
  //   criterias.find((criteria) => matchCriteria(request, criteria))
  // )

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
  promises: Promise<void>[]
  requested: RequestMap
  failed: RequestMap
  finished: RequestMap
  errors: Error[]
  waitForAllResponses(): Promise<void>
  waitForResponses(criteria: Criteria[], count: number): Promise<void>
  clear(): void
}

function requestHoldable(page: Page): RequestHolder {
  const requested: RequestMap = new RequestMap()
  const failed: RequestMap = new RequestMap()
  const finished: RequestMap = new RequestMap()
  const errors: Error[] = []

  const promises: Promise<void>[] = []
  let waitingCriterias: Criteria[] = []
  let matchingCriteriaCount: number
  let criteriaPromiseResolver: () => void
  const requestIdToResolver: Map<RequestId, () => void> = new Map()

  page.on('pageerror', (error) => {
    errors.push(error)
  })

  page.on('request', (request) => {
    const requestId: string = (request as HttpRequestImpl)._requestId
    requested.set(requestId, request)

    // request and requestfinishe is random order
    if (finished.has(requestId)) {
      // request already finished
      // console.debug('request already finished')
    } else {
      promises.push(
        new Promise<void>((resolve) => {
          requestIdToResolver.set(requestId, resolve)
        })
      )
    }
  })

  page.on('requestfinished', (request) => {
    const requestId: string = (request as HttpRequestImpl)._requestId
    finished.set(requestId, request)

    // console.log('matchCriteria', matchCriteria(request, { resourceType: 'ajax' }))

    if (match(waitingCriterias, request)) {
      // console.debug('match!', matchingCriteriaCount)
      if (--matchingCriteriaCount === 0) {
        criteriaPromiseResolver()
      }
    }

    const resolver = requestIdToResolver.get(requestId)
    if (resolver === undefined) {
      // console.debug(`resolver is undefined; requestId: ${requestId}`)

      // request and requestfinished is random order
    } else {
      resolver()
    }
  })

  page.on('requestfailed', (request) => {
    const requestId: string = (request as HttpRequestImpl)._requestId
    failed.set(requestId, request)
  })

  return {
    promises,
    requested,
    failed,
    finished,
    errors,
    async waitForAllResponses() {
      await Promise.all(promises)
    },
    async waitForResponses(criterias: Criteria[], count: number = criterias.length) {
      waitingCriterias = criterias
      const criteriadPromise = new Promise<void>((resolve) => {
        criteriaPromiseResolver = resolve
      })
      matchingCriteriaCount = count
      await criteriadPromise
    },
    clear() {
      // console.log('clear')

      this.promises.length = 0
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
