import { Suspense, ReactNode } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

function PageLoadFailed() {
  return (
    <div>
      <h2>Page load failed</h2>
      <p>Reload please.</p>
    </div>
  )
}

export function RoutesWrapper({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary fallback={<PageLoadFailed />}>
      <Suspense fallback={<p>Loading...</p>}>{children}</Suspense>
    </ErrorBoundary>
  )
}
