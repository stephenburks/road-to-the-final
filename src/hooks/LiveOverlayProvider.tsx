import type { ReactNode } from 'react'
import { LiveOverlayContext } from './liveOverlayContext'
import type { LiveOverlay } from './useLiveOverlay'

interface ProviderProps {
	value: LiveOverlay
	children: ReactNode
}

export function LiveOverlayProvider({ value, children }: ProviderProps) {
	return <LiveOverlayContext.Provider value={value}>{children}</LiveOverlayContext.Provider>
}

