import { coerce } from 'zod'
import { UseSubmitProps as TUseSubmitProps, useSubmit } from 'bistrio/client'

import { taskCreateWithTagsSchema } from '@/universal/params'
import { ErrorPanel } from '../ErrorPanel'
import { Task } from '@prisma/client'
import { useRef, useState } from 'react'

export const formSchema = taskCreateWithTagsSchema.extend({
  done: coerce.boolean().optional(),
})

export type FormAttrs = typeof formSchema

export type UseSubmitProps = TUseSubmitProps<FormAttrs, Task>

export function Form({ source = {title: '', description: '', tags: []}, ...props }: UseSubmitProps) {
  const { handleSubmit, invalid, pending } = useSubmit<FormAttrs, Task>(props)
  const [tags, setTags] = useState(source.tags)
  const tagInputRef = useRef<HTMLInputElement>(null)

  const handleClickTag: React.MouseEventHandler<HTMLAnchorElement> = () => {
    const tagLabel = tagInputRef.current?.value?.trim()
    if (tagLabel && tagLabel !== '') {
      setTags([...tags, tagLabel])
    }
  }

  return (
    <>
      {invalid && <ErrorPanel err={invalid}></ErrorPanel>}
      <form onSubmit={handleSubmit}>
        <fieldset disabled={pending}>
          {source && 'done' in source && (
            <div>
              <input name="done" type="checkbox" value="true" defaultChecked={source.done || false}></input>
            </div>
          )}

          <div>
            <input name="title" defaultValue={source.title}></input>
          </div>
          <div>
            <textarea name="description" defaultValue={source.description}></textarea>
          </div>
          <div>
            tags:
            {tags.map((tag) => (
              <span key={tag} style={{ padding: '0 4px' }}>
                {tag}
                <input type="hidden" name="tags[]" value={tag} />
              </span>
            ))}
            <div>
              <input type="text" ref={tagInputRef}></input>
              <a href="#" onClick={handleClickTag}>
                +
              </a>
            </div>
          </div>
          <input type="submit"></input>
        </fieldset>
      </form>
    </>
  )
}
