import type { NcmApi } from '../shared/api'

export type { NcmApi, SearchArtist, SearchResult } from '../shared/api'

declare global {
  interface Window {
    ncm: NcmApi
  }
}

export {}
