import { Link } from 'react-router-dom'
import { useNavigate } from 'bistrio/client'
import { Form, UseSubmitProps, formSchema } from '../../components/tasks/Form'
import { useRenderSupport } from '@bistrio/routes/main'
import { tasks$index } from '@/.bistrio/routes/main/named_endpoints'

export function Build() {
  const navigate = useNavigate()
  const rs = useRenderSupport()

  const props: UseSubmitProps = {
    source: { title: '', description: '', tags: [] },
    action: {
      modifier: (params) => rs.resources().tasks.create(params),
      onSuccess: (result) =>
        navigate(tasks$index.path(), {
          purge: true,
          flashMessage: { text: `Task created '${result.title}'`, type: 'info' },
        }),
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
      <Link to={tasks$index.path()}>To Top</Link>
    </div>
  )
}

export { Build as Page }
