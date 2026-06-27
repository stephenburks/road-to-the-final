import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LiveOverlayProvider } from './hooks/LiveOverlayProvider'
import type { LiveOverlay } from './hooks/useLiveOverlay'
import type { AppData } from './types'

const EMPTY_APPDATA: AppData = {
	lastUpdated: '',
	snapshotDate: '',
	isHistorical: false,
	tournament: { name: '', currentStage: 'group_stage', stages: {
		group_stage: { status: 'active', label: '', date: '' },
		r32: { status: 'upcoming', label: '', date: '' },
		r16: { status: 'future', label: '', date: '' },
		qf:  { status: 'future', label: '', date: '' },
		sf:  { status: 'future', label: '', date: '' },
		final: { status: 'future', label: '', date: '' },
	}},
	groups: {},
	teams: [],
	dailyMatches: {},
}

// Default overlay: no live patches, no live odds, no live probs. Sufficient
// for component tests that don't exercise live behavior; tests that need
// overlay state can pass a custom `overlay` value.
const EMPTY_OVERLAY: LiveOverlay = {
	data: EMPTY_APPDATA,
	patches: null,
	odds: null,
	probs: null,
}

export function renderWithQuery(ui: ReactElement, overlay: LiveOverlay = EMPTY_OVERLAY) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	})
	return render(
		<QueryClientProvider client={client}>
			<LiveOverlayProvider value={overlay}>{ui}</LiveOverlayProvider>
		</QueryClientProvider>
	)
}
