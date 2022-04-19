// for bin/console
// add modules for REPL
import { routes } from '../../routes'
import path from 'path'
import { setup } from '../router-factory'

const router = setup().getResourceHolderCreateRouter(global, path.join(__dirname, '..'))
routes(router)
router.build() // TODO: await
