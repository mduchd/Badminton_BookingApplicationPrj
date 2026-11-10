import { useEffect } from 'react'
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { toast } from 'sonner'
import { errorMessage } from '../lib/errors'

/** Keep stale responses scoped to their query key and surface failed requests. */
export function useApiQuery<T>(options: UseQueryOptions<T>) {
  const query = useQuery(options)
  useEffect(() => {
    if (query.error) toast.error(errorMessage(query.error))
  }, [query.error])
  return query
}
