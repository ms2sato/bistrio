import React from 'react'
import { ValidationError } from 'bistrio/client'

export function ErrorPanel({ err }: { err: ValidationError }) {
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
