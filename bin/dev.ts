import {setup} from '../server/app'
import { boot } from '../server/support/boot'
boot(await setup())
