import { Navigate, useLocation } from '@solidjs/router'

/**
 * `/account` became `/settings/security`. Links already out there still land: `next=%2Faccount` in
 * emails and bookmarks, and Google linking that started before the move, coming back with `?error=`.
 * The query and the hash go along, and the old address leaves the history.
 */
export function AccountRedirect() {
  const location = useLocation()

  return <Navigate href={`/settings/security${location.search}${location.hash}`} />
}
