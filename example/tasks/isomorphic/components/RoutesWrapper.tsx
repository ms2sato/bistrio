import { Suspense, ReactNode } from 'react'

export function RoutesWrapper({ children }: { children: ReactNode }) {
  return <Suspense fallback="<p>Loading...</p>">{children}</Suspense>
}
