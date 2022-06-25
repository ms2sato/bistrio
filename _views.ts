import { Index as TaskIndex } from './views/tasks/index'
import { Build as TaskBuild } from './views/tasks/build'
import { Edit as TaskEdit } from './views/tasks/edit'

export const views = {
  '/tasks/': TaskIndex,
  '/tasks/build': TaskBuild,
  '/tasks/:id/edit': TaskEdit,
}
