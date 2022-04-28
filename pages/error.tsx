import { HttpError } from 'http-errors'
import 'react'
import { Layout } from './_layout'

export function Page({ err }: { err: HttpError }) {
  return (
    <Layout>
      <h1>{err.message}</h1>
      {err.status && <h2>err.status</h2>}
    </Layout>
  )
}
