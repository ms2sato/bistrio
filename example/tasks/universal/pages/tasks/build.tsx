import { Link } from 'react-router-dom'
import { useNavigate } from 'bistrio/client'
import { Form, UseSubmitProps, formSchema } from '../../components/tasks/Form'
import { useRenderSupport } from '@bistrio/routes/main'
import { __tasks } from '@bistrio/routes/main/endpoints'

export function Build() {
  const navigate = useNavigate()
  const rs = useRenderSupport()

  const props: UseSubmitProps = {
    source: { title: '', description: '', tags: [] },
    action: {
      modifier: (params) => rs.resources().task.create(params),
      onSuccess: () => navigate(__tasks.path(), { purge: true }),
    },
    schema: formSchema,
  }

  const handleClick = () => {
    alert('Test!')
  }

  const l = rs.getLocalizer()

  return (
    <div>
      <h2>{l.t`Create new task`}</h2>
      <Form {...props}></Form>
      <button onClick={handleClick}>This is test button</button>
      <Link to={__tasks.path()}>To Top</Link>
    </div>
  )
}

export { Build as Page }
