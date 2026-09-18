export function createEventBus() {
  const listeners = new Map()

  return {
    on(eventName, listener) {
      if (!listeners.has(eventName)) listeners.set(eventName, new Set())
      listeners.get(eventName).add(listener)
      return () => listeners.get(eventName)?.delete(listener)
    },
    emit(eventName, payload) {
      listeners.get(eventName)?.forEach((listener) => listener(payload))
    },
    clear() {
      listeners.clear()
    },
  }
}

export const gameBus = createEventBus()
