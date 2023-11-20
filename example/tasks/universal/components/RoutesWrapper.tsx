import { Suspense, ReactNode } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

function PageNotFound() {
  return (
    <div>
      <h2>Page chunk not found</h2>
      <p>Reload please.</p>
    </div>
  )
}

export function RoutesWrapper({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary fallback={<PageNotFound></PageNotFound>}>
      <Suspense fallback={<p>Loading...</p>}>{children}</Suspense>
    </ErrorBoundary>
  )
}
