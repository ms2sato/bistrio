import { HttpError } from 'http-errors'
import 'react'
import { Layout } from './_layout'

export default function ({ err }: { err: HttpError }) {
  const props = { hydrate: false }
  return (
    <Layout props={props}>
      <h1>{err.message}</h1>
      {err.status && <h2>err.status</h2>}
    </Layout>
  )
}
