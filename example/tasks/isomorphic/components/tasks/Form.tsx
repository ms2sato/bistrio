import z from 'zod'
import { UseSubmitProps as TUseSubmitProps, useSubmit } from 'bistrio/client'

import { taskCreateSchema } from '@/isomorphic/params'
import { Task } from '@prisma/client'
import { ErrorPanel } from '../ErrorPanel'

export const formSchema = taskCreateSchema.extend({
  done: z.coerce.boolean().optional(),
})

export type FormAttrs = typeof formSchema

export type UseSubmitProps = TUseSubmitProps<FormAttrs, Task>

export function Form(props: UseSubmitProps) {
  const { handleSubmit, params, invalid, pending } = useSubmit<FormAttrs, Task>(props)

  return (
    <>
      {invalid && <ErrorPanel err={invalid}></ErrorPanel>}
      <form onSubmit={handleSubmit}>
        <fieldset disabled={pending}>
          {'done' in params && (
            <div>
              <input name="done" type="checkbox" value="true" defaultChecked={params.done || false}></input>
            </div>
          )}

          <div>
            <input name="title" defaultValue={params.title}></input>
          </div>
          <div>
            <textarea name="description" defaultValue={params.description}></textarea>
          </div>
          <input type="submit"></input>
        </fieldset>
      </form>
    </>
  )
}
