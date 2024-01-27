import { apply } from './express-util.js'
import { MockExpressResponse } from '../misc/spec-util.js'

describe('apply', () => {
  let mockExpressResponse: MockExpressResponse
  let mockResponse: Partial<Response>

  beforeEach(() => {
    mockExpressResponse = new MockExpressResponse()

    mockResponse = {
      headers: new Headers([]),
      status: 200,
      redirected: false,
      url: '',
    }
  })

  it('should apply headers and status', async () => {
    await apply(Response.json({ test: '123' }), mockExpressResponse.forExpress())

    expect(mockExpressResponse.headers).toEqual({ 'content-type': 'application/json' })
    expect(mockExpressResponse.statusCode).toEqual(200)
    expect(mockExpressResponse.dataAsString()).toEqual('{"test":"123"}')
  })

  it('should redirect if response is redirected', async () => {
    await apply({ ...mockResponse, url: 'http://example.com' } as Response, mockExpressResponse.forExpress())
    expect(mockExpressResponse.redirectUrl).toEqual('http://example.com')
  })
})
