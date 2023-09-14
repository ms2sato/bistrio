const HOST = process.env.HOST || 'http://localhost'
const URL = `${HOST}:${process.env.PORT ? Number(process.env.PORT) : 4569}`

export function asURL(httpPath: string) {
  return `${URL}/${httpPath}` // TODO: normalize URL
}
