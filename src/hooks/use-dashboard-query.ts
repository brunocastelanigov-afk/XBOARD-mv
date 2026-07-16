import { useEffect, useState, type DependencyList } from "react"

export function useDashboardQuery<T>(load: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    load()
      .then((nextData) => {
        if (active) setData(nextData)
      })
      .catch((nextError) => {
        if (active) {
          setError(
            nextError instanceof Error
              ? nextError
              : new Error("Dashboard query failed.")
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, deps)

  return { data, error, loading }
}
