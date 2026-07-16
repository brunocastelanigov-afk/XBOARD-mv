import { useEffect, useState, type DependencyList } from "react"

export function useDashboardQuery<T>(
  load: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    load(controller.signal)
      .then((nextData) => {
        if (!controller.signal.aborted) setData(nextData)
      })
      .catch((nextError) => {
        if (!controller.signal.aborted) {
          setError(
            nextError instanceof Error
              ? nextError
              : new Error("Dashboard query failed.")
          )
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    // Cancels the in-flight Postgres query (not just the client-side
    // result) so changing filters/pages doesn't leave old queries running
    // to completion on the server and piling up under real usage.
    return () => {
      controller.abort()
    }
  }, deps)

  return { data, error, loading }
}
