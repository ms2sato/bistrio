import { type Resource } from 'restrant2/client'

export type PathToResources = {
  [path: string]: Resource
}

export type NameToPath = {
  [name: string]: string
}

export type NameToResource<R extends PathToResources, NP extends NameToPath> = {
  [name in keyof NP]: R[NP[name]]
}
