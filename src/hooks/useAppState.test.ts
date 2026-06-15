import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAppState } from './useAppState'

describe('useAppState', () => {
	beforeEach(() => {
		// Clear localStorage
		localStorage.clear()
		// Reset URL to clean state
		history.replaceState(null, '', '/')
		vi.stubGlobal('localStorage', {
			getItem: vi.fn(() => null),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
		})
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('initializes from URL params when present', () => {
		// Simulate URL with params
		const originalSearch = window.location.search
		Object.defineProperty(window, 'location', {
			value: {
				...window.location,
				search: '?team=brazil&date=2026-06-01&stage=r32',
				pathname: '/',
			},
			writable: true,
			configurable: true,
		})

		const { result } = renderHook(() => useAppState())

		expect(result.current.selectedTeamId).toBe('brazil')
		expect(result.current.selectedDate).toBe('2026-06-01')
		expect(result.current.selectedStage).toBe('r32')
		expect(result.current.isHistorical).toBe(true)

		// Restore
		Object.defineProperty(window, 'location', {
			value: { ...window.location, search: originalSearch },
			writable: true,
			configurable: true,
		})
	})

	it('falls back to localStorage, then DEFAULT_TEAM when URL params are absent', () => {
		const mockGetItem = vi.fn(key => key === 'wc26_team' ? 'germany' : null)
		const mockSetItem = vi.fn()

		vi.stubGlobal('localStorage', {
			getItem: mockGetItem,
			setItem: mockSetItem,
			removeItem: vi.fn(),
			clear: vi.fn(),
		})

		// Ensure no URL params
		Object.defineProperty(window, 'location', {
			value: { ...window.location, search: '', pathname: '/' },
			writable: true,
			configurable: true,
		})

		const { result } = renderHook(() => useAppState())

		expect(result.current.selectedTeamId).toBe('germany')
	})

	it('handleTeamChange resets stage to auto', () => {
		const { result } = renderHook(() => useAppState())

		act(() => {
			result.current.handleTeamChange('brazil')
		})

		expect(result.current.selectedTeamId).toBe('brazil')
		expect(result.current.selectedStage).toBe('auto')
	})

	it('writeURLParams is called on state change', () => {
		const replaceStateSpy = vi.spyOn(window.history, 'replaceState')
		const mockSetItem = vi.fn()

		vi.stubGlobal('localStorage', {
			getItem: vi.fn(() => null),
			setItem: mockSetItem,
			removeItem: vi.fn(),
			clear: vi.fn(),
		})

		const { result } = renderHook(() => useAppState())

		act(() => {
			result.current.handleTeamChange('brazil')
		})

		expect(replaceStateSpy).toHaveBeenCalled()
		replaceStateSpy.mockRestore()
	})

	it('lsSet is called on state change', () => {
		const mockSetItem = vi.fn()

		vi.stubGlobal('localStorage', {
			getItem: vi.fn(() => null),
			setItem: mockSetItem,
			removeItem: vi.fn(),
			clear: vi.fn(),
		})

		const { result } = renderHook(() => useAppState())

		act(() => {
			result.current.handleTeamChange('brazil')
		})

		expect(mockSetItem).toHaveBeenCalledWith('wc26_team', 'brazil')
	})
})
