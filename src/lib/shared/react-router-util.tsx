import { Outlet, Route, RouteObject, Routes } from 'react-router-dom'

export const toRoutes = (routeObject: RouteObject) => <Routes>{getRouteFromRouteObject(routeObject)}</Routes>

const getRouteFromRouteObject = ({ path, element, Component, children }: RouteObject, parentPath = '') => {
  const currentPath = `${parentPath}-${path ?? 'layout'}`
  return (
    <Route path={path} element={element} Component={Component} key={currentPath}>
      {children && children.map((child) => getRouteFromRouteObject(child, currentPath))}
    </Route>
  )
}

export function NullLayout() {
  return (
    <div className="test">
      <Outlet />
    </div>
  )
}
