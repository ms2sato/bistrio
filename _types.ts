import { type Resource } from 'restrant2/client'
import { PageProps as TPageProps } from './lib/render-support'
import { type NameToPath } from './_routes'
import { type Resources } from './_resources'

export type ResourcesT = {
  [path: string]: Resource
}

export type NameToPathT = {
  [name: string]: string
}

type NameToResource<R extends ResourcesT, NP extends NameToPathT> = {
  [name in keyof NP]: R[NP[name]]
}

export type N2R = NameToResource<Resources, NameToPath>
export type PageProps = TPageProps<N2R>
