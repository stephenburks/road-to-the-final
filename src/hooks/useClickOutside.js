import { useEffect } from 'react'

/**
 * Calls `callback` when a mousedown event occurs outside `ref`.
 * Used to close dropdowns when the user clicks away.
 */
export function useClickOutside(ref, callback) {
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        callback()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [ref, callback])
}
