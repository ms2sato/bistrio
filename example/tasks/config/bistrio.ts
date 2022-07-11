export type BistrioConfig = {
  getContainerElement: (entryName: string) => HTMLElement;
}

export const bistrioConfig: BistrioConfig = {
  getContainerElement: (_entryName) => {
    const el = document.getElementById('app')
    if(!el) {
      throw new Error('No container element found')
    }
    return el
  }
}