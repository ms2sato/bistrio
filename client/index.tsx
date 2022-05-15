import * as React from 'react'
import { hydrateRoot } from 'react-dom/client'
import { Build } from '../views/tasks/build'

const container = document.getElementById('app')
hydrateRoot(container, <Build task={{ title: '', description: '' }} />)
