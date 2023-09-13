import { Link } from 'react-router-dom'
import { useNavigate } from 'bistrio/client.js'
import { Form, UseSubmitProps, formSchema } from '../../components/tasks/Form'
import { useRenderSupport } from '@bistrio/routes/main'

export function Build() {
  const navigate = useNavigate()
  const rs = useRenderSupport()

  const props: UseSubmitProps = {
    source: { title: '', description: '', tags: [] },
    action: {
      modifier: (params) => rs.resources().task.create(params),
      onSuccess: () => navigate(`/tasks`, { purge: true }),
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
      <Link to="/tasks">To Top</Link>
    </div>
  )
}

export { Build as Page }
