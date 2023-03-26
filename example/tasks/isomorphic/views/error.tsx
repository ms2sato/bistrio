import { HttpError } from 'http-errors'
import 'react'
import { Layout } from '../components/Layout'

export default function ({ err }: { err: HttpError }) {
  const props = { hydrate: false, script: 'error' }
  return (
    <Layout props={props}>
      <h1>{err.message}</h1>
      {err.status && <h2>err.status</h2>}
    </Layout>
  )
}
