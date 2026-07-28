import { useCallback, useEffect, useRef, useState, type DependencyList } from "react"

export function useDashboardQuery<T>(
  load: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefetching, setIsRefetching] = useState(false)

  const loadRef = useRef(load)
  loadRef.current = load
  const triggerRefetchRef = useRef<() => void>(() => {})

  useEffect(() => {
    let cancelled = false
    let activeController: AbortController | null = null

    // background=true (poll ou reload manual) nunca reativa o skeleton de carregamento
    // inicial -- só troca os dados quando a resposta chega, evitando o "piscar" da tela.
    function runLoad(background: boolean) {
      activeController?.abort()
      const controller = new AbortController()
      activeController = controller

      if (background) setIsRefetching(true)
      else {
        setLoading(true)
        setError(null)
      }

      loadRef
        .current(controller.signal)
        .then((nextData) => {
          if (cancelled || activeController !== controller) return
          setData(nextData)
          if (background) setError(null)
        })
        .catch((nextError) => {
          if (cancelled || activeController !== controller) return
          if (nextError instanceof DOMException && nextError.name === "AbortError") return
          setError(
            nextError instanceof Error ? nextError : new Error("Dashboard query failed.")
          )
        })
        .finally(() => {
          if (cancelled || activeController !== controller) return
          if (background) setIsRefetching(false)
          else setLoading(false)
        })
    }

    triggerRefetchRef.current = () => runLoad(true)

    runLoad(false)

    return () => {
      cancelled = true
      activeController?.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  const refetch = useCallback(() => {
    triggerRefetchRef.current()
  }, [])

  return { data, error, loading, isRefetching, refetch }
}
