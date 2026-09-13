export const ROUTES = {
  HOME: '/',
  PLAYGROUND: '/playground',
  TOPICS: '/topics',
  HISTORY: '/history',
  POST_DETAIL: '/post/:id',
  CODE_IMAGE: '/code-image',
  EDITOR: '/editor',
  EDITOR_DETAIL: '/editor/:id',
  SETTINGS: '/settings',
} as const

export function postDetailRoute(id: number | string) {
  return `/post/${id}`
}

export function postEditorRoute(id?: number | string) {
  return id ? `/editor/${id}` : '/editor'
}
