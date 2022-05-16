import * as React from 'react'
import { hydrateRoot } from 'react-dom/client'
import { Build } from '../views/tasks/build'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

const root = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/tasks/build" element={<Build task={{ title: '', description: '' }} />}></Route>
      </Routes>
    </BrowserRouter>
  )
}

const container = document.getElementById('app')
hydrateRoot(container, root())
