import React from 'react'
import { isError, isValidationError } from 'bistrio/client'

export function ErrorPanel({ err }: { err: unknown }) {
  if (err === undefined || err === null) {
    return <></>
  }

  if (isValidationError(err)) {
    return (
      <>
        <div>error</div>
        <ul>
          {err.issues.map((er, i) => (
            <li key={i}>
              {er.path.join('.')}: {er.message}
            </li>
          ))}
        </ul>
      </>
    )
  }

  if (isError(err)) {
    return (
      <>
        <div>error</div>
        <div>{err.message}</div>
      </>
    )
  }
}
