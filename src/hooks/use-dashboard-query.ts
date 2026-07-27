import { useCallback, useEffect, useRef, useState, type DependencyList } from "react"

// Problema 03: dashboard não tinha nenhuma forma de saber que os dados na tela ficaram
// desatualizados. Poll silencioso de 1 minuto (sem websocket, pra não arriscar a experiência
// em tempo real) + um refetch manual que o botão de reload dispara e que reinicia o timer do
// poll (clicar reload não deve deixar um segundo fetch disparando logo em seguida).
const DEFAULT_POLL_INTERVAL_MS = 60_000

interface UseDashboardQueryOptions {
  pollIntervalMs?: number
}

export function useDashboardQuery<T>(
  load: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
  options?: UseDashboardQueryOptions
) {
  const pollIntervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS
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

    let timerId = setInterval(() => runLoad(true), pollIntervalMs)

    triggerRefetchRef.current = () => {
      runLoad(true)
      clearInterval(timerId)
      timerId = setInterval(() => runLoad(true), pollIntervalMs)
    }

    runLoad(false)

    return () => {
      cancelled = true
      activeController?.abort()
      clearInterval(timerId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, pollIntervalMs])

  const refetch = useCallback(() => {
    triggerRefetchRef.current()
  }, [])

  return { data, error, loading, isRefetching, refetch }
}
