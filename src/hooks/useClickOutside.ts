import { useEffect, type RefObject } from 'react'

/**
 * Calls `callback` when a mousedown event occurs outside `ref`.
 * Used to close dropdowns when the user clicks away.
 */
export function useClickOutside(ref: RefObject<HTMLElement | null>, callback: () => void) {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        callback()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [ref, callback])
}