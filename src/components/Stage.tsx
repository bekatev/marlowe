import { useEffect, useRef } from 'react'
import { createTable, type TableHandlers, type TableView } from '../game/tableView.ts'

type StageProps = {
  handlersRef: { current: TableHandlers }
  onReady: (view: TableView | null) => void
}

export function Stage({ handlersRef, onReady }: StageProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const onReadyRef = useRef(onReady)

  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let cancelled = false
    let destroy = () => {}

    createTable(host, handlersRef)
      .then((view) => {
        if (cancelled) {
          view.destroy()
          return
        }
        destroy = () => view.destroy()
        onReadyRef.current(view)
      })
      .catch((error: unknown) => {
        console.error(error)
      })

    return () => {
      cancelled = true
      destroy()
      onReadyRef.current(null)
    }
  }, [handlersRef])

  return <div ref={hostRef} className="stage" />
}
