import { type Resource } from '../../client'

export type PathToResources = {
  [path: string]: Resource
}

export type NameToPath = {
  [name: string]: string
}

export type NameToResource<R extends PathToResources, NP extends NameToPath> = {
  [name in keyof NP as R[NP[name]] extends Resource ? name : never]: R[NP[name]];
};
