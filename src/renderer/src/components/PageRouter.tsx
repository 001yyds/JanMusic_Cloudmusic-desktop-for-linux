import { DailyPage } from '../pages/DailyPage'
import { DownloadsPage } from '../pages/DownloadsPage'
import { Home } from '../pages/Home'
import { Library } from '../pages/Library'
import { PlaylistPage } from '../pages/PlaylistPage'
import { SearchPage } from '../pages/SearchPage'
import { SettingsPage } from '../pages/SettingsPage'
import type { Route } from '../store/ui'

export function PageRouter({ route }: { route: Route }): React.JSX.Element {
  switch (route.page) {
    case 'library':
      return <Library />
    case 'playlist':
      return <PlaylistPage id={route.id} />
    case 'search':
      return <SearchPage initialKeyword={route.keyword} />
    case 'downloads':
      return <DownloadsPage />
    case 'daily':
      return <DailyPage />
    case 'settings':
      return <SettingsPage />
    default:
      return <Home />
  }
}
