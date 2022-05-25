import { Index as TaskIndex } from './tasks/index'
import { Build as TaskBuild } from './tasks/build'
import { Edit as TaskEdit } from './tasks/edit'

export const views = {
  '/tasks/': TaskIndex,
  '/tasks/build': TaskBuild,
  '/tasks/:id/edit': TaskEdit,
}
