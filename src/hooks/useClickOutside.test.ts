import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { createRef } from 'react'
import { fireEvent } from '@testing-library/react'
import { useClickOutside } from './useClickOutside'

afterEach(() => {
	vi.restoreAllMocks()
})

describe('useClickOutside', () => {
	// ── Callback fires outside ────────────────────────────────────────────

	it('calls the callback when a mousedown event fires on document.body (outside the ref)', () => {
		const callback = vi.fn()
		const ref = createRef<HTMLDivElement>()

		// Attach a real div to the document so ref.current.contains() works
		const div = document.createElement('div')
		document.body.appendChild(div)
		;(ref as React.MutableRefObject<HTMLDivElement>).current = div

		renderHook(() => useClickOutside(ref, callback))

		fireEvent.mouseDown(document.body)

		expect(callback).toHaveBeenCalledTimes(1)

		document.body.removeChild(div)
	})

	it('calls the callback when a mousedown event fires on a sibling element outside the ref', () => {
		const callback = vi.fn()
		const ref = createRef<HTMLDivElement>()

		const div = document.createElement('div')
		const sibling = document.createElement('button')
		document.body.appendChild(div)
		document.body.appendChild(sibling)
		;(ref as React.MutableRefObject<HTMLDivElement>).current = div

		renderHook(() => useClickOutside(ref, callback))

		fireEvent.mouseDown(sibling)

		expect(callback).toHaveBeenCalledTimes(1)

		document.body.removeChild(div)
		document.body.removeChild(sibling)
	})

	// ── Callback does NOT fire inside ─────────────────────────────────────

	it('does not call the callback when clicking inside the ref element', () => {
		const callback = vi.fn()
		const ref = createRef<HTMLDivElement>()

		const div = document.createElement('div')
		const child = document.createElement('span')
		div.appendChild(child)
		document.body.appendChild(div)
		;(ref as React.MutableRefObject<HTMLDivElement>).current = div

		renderHook(() => useClickOutside(ref, callback))

		fireEvent.mouseDown(child)

		expect(callback).not.toHaveBeenCalled()

		document.body.removeChild(div)
	})

	it('does not call the callback when clicking on the ref element itself', () => {
		const callback = vi.fn()
		const ref = createRef<HTMLDivElement>()

		const div = document.createElement('div')
		document.body.appendChild(div)
		;(ref as React.MutableRefObject<HTMLDivElement>).current = div

		renderHook(() => useClickOutside(ref, callback))

		fireEvent.mouseDown(div)

		expect(callback).not.toHaveBeenCalled()

		document.body.removeChild(div)
	})

	// ── Callback not called when ref.current is null ──────────────────────

	it('does not call the callback when ref.current is null', () => {
		const callback = vi.fn()
		const ref = createRef<HTMLDivElement>()
		// ref.current stays null — no element attached

		renderHook(() => useClickOutside(ref, callback))

		fireEvent.mouseDown(document.body)

		expect(callback).not.toHaveBeenCalled()
	})

	// ── Cleanup ───────────────────────────────────────────────────────────

	it('removes the event listener when the component unmounts', () => {
		const callback = vi.fn()
		const ref = createRef<HTMLDivElement>()

		const div = document.createElement('div')
		document.body.appendChild(div)
		;(ref as React.MutableRefObject<HTMLDivElement>).current = div

		const { unmount } = renderHook(() => useClickOutside(ref, callback))

		unmount()

		// After unmount the listener should be gone — mousedown should not trigger callback
		fireEvent.mouseDown(document.body)

		expect(callback).not.toHaveBeenCalled()

		document.body.removeChild(div)
	})

	it('does not fire the callback multiple times after remount when previous instance was unmounted', () => {
		const callback = vi.fn()
		const ref = createRef<HTMLDivElement>()

		const div = document.createElement('div')
		document.body.appendChild(div)
		;(ref as React.MutableRefObject<HTMLDivElement>).current = div

		const { unmount } = renderHook(() => useClickOutside(ref, callback))
		unmount()

		// Re-render a fresh instance
		renderHook(() => useClickOutside(ref, callback))

		fireEvent.mouseDown(document.body)

		// Only the new instance's listener should fire — once, not twice
		expect(callback).toHaveBeenCalledTimes(1)

		document.body.removeChild(div)
	})
})
