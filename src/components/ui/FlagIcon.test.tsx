import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FlagIcon from './FlagIcon'

// All 32 known teams from ID_TO_ISO
const ALL_TEAMS = [
	{ id: 'mexico', iso: 'mx', tla: 'MEX', name: 'Mexico' },
	{ id: 'southafrica', iso: 'za', tla: 'RSA', name: 'South Africa' },
	{ id: 'southkorea', iso: 'kr', tla: 'KOR', name: 'South Korea' },
	{ id: 'czechia', iso: 'cz', tla: 'CZE', name: 'Czechia' },
	{ id: 'canada', iso: 'ca', tla: 'CAN', name: 'Canada' },
	{ id: 'bosnia', iso: 'ba', tla: 'BIH', name: 'Bosnia & Herz.' },
	{ id: 'qatar', iso: 'qa', tla: 'QAT', name: 'Qatar' },
	{ id: 'switzerland', iso: 'ch', tla: 'SUI', name: 'Switzerland' },
	{ id: 'brazil', iso: 'br', tla: 'BRA', name: 'Brazil' },
	{ id: 'morocco', iso: 'ma', tla: 'MAR', name: 'Morocco' },
	{ id: 'haiti', iso: 'ht', tla: 'HAI', name: 'Haiti' },
	{ id: 'scotland', iso: 'gb-sct', tla: 'SCO', name: 'Scotland' },
	{ id: 'usa', iso: 'us', tla: 'USA', name: 'USA' },
	{ id: 'paraguay', iso: 'py', tla: 'PAR', name: 'Paraguay' },
	{ id: 'australia', iso: 'au', tla: 'AUS', name: 'Australia' },
	{ id: 'turkey', iso: 'tr', tla: 'TUR', name: 'Türkiye' },
	{ id: 'germany', iso: 'de', tla: 'GER', name: 'Germany' },
	{ id: 'curacao', iso: 'cw', tla: 'CUW', name: 'Curaçao' },
	{ id: 'ivorycoast', iso: 'ci', tla: 'CIV', name: 'Ivory Coast' },
	{ id: 'ecuador', iso: 'ec', tla: 'ECU', name: 'Ecuador' },
	{ id: 'netherlands', iso: 'nl', tla: 'NED', name: 'Netherlands' },
	{ id: 'japan', iso: 'jp', tla: 'JPN', name: 'Japan' },
	{ id: 'sweden', iso: 'se', tla: 'SWE', name: 'Sweden' },
	{ id: 'tunisia', iso: 'tn', tla: 'TUN', name: 'Tunisia' },
	{ id: 'belgium', iso: 'be', tla: 'BEL', name: 'Belgium' },
	{ id: 'egypt', iso: 'eg', tla: 'EGY', name: 'Egypt' },
	{ id: 'iran', iso: 'ir', tla: 'IRN', name: 'Iran' },
	{ id: 'newzealand', iso: 'nz', tla: 'NZL', name: 'New Zealand' },
	{ id: 'spain', iso: 'es', tla: 'ESP', name: 'Spain' },
	{ id: 'capeverde', iso: 'cv', tla: 'CPV', name: 'Cape Verde' },
	{ id: 'saudiarabia', iso: 'sa', tla: 'KSA', name: 'Saudi Arabia' },
	{ id: 'uruguay', iso: 'uy', tla: 'URU', name: 'Uruguay' },
	{ id: 'france', iso: 'fr', tla: 'FRA', name: 'France' },
	{ id: 'senegal', iso: 'sn', tla: 'SEN', name: 'Senegal' },
	{ id: 'iraq', iso: 'iq', tla: 'IRQ', name: 'Iraq' },
	{ id: 'norway', iso: 'no', tla: 'NOR', name: 'Norway' },
	{ id: 'argentina', iso: 'ar', tla: 'ARG', name: 'Argentina' },
	{ id: 'algeria', iso: 'dz', tla: 'ALG', name: 'Algeria' },
	{ id: 'austria', iso: 'at', tla: 'AUT', name: 'Austria' },
	{ id: 'jordan', iso: 'jo', tla: 'JOR', name: 'Jordan' },
	{ id: 'portugal', iso: 'pt', tla: 'POR', name: 'Portugal' },
	{ id: 'drcongo', iso: 'cd', tla: 'COD', name: 'DR Congo' },
	{ id: 'uzbekistan', iso: 'uz', tla: 'UZB', name: 'Uzbekistan' },
	{ id: 'colombia', iso: 'co', tla: 'COL', name: 'Colombia' },
	{ id: 'england', iso: 'gb-eng', tla: 'ENG', name: 'England' },
	{ id: 'croatia', iso: 'hr', tla: 'CRO', name: 'Croatia' },
	{ id: 'ghana', iso: 'gh', tla: 'GHA', name: 'Ghana' },
	{ id: 'panama', iso: 'pa', tla: 'PAN', name: 'Panama' },
]

describe('FlagIcon', () => {
	it('renders CircleFlag for known team ID', () => {
		const { container } = render(<FlagIcon code="brazil" />)
		// CircleFlag renders <img data-testid="circle-country-flag">
		expect(container.querySelector('[data-testid="circle-country-flag"]')).toBeTruthy()
	})

	it('renders TLA code when small prop is true', () => {
		const { container } = render(<FlagIcon code="brazil" small />)
		expect(container.textContent).toContain('BRA')
	})

	it('falls back to emoji when no ISO match', () => {
		const { container } = render(<FlagIcon flag="🏴󠁧󠁢󠁥󠁮󠁧󠁿" />)
		expect(container.textContent).toContain('🏴')
	})

	it('resolves opponent name via NAME_TO_ID', () => {
		// 'Brazil' maps to 'brazil' -> ISO 'br' -> CircleFlag renders
		const { container } = render(<FlagIcon opponent="Brazil" />)
		expect(container.querySelector('[data-testid="circle-country-flag"]')).toBeTruthy()
	})

	it('aria-label includes team name when provided', () => {
		render(<FlagIcon code="brazil" name="Brazil" />)
		expect(screen.getByLabelText('Brazil flag')).toBeInTheDocument()
	})

	it('renders all 48 teams from ID_TO_ISO without throwing', () => {
		for (const team of ALL_TEAMS) {
			const { container } = render(<FlagIcon code={team.id} />)
			// Should render a CircleFlag or fallback without error
			expect(container.querySelector('span')).toBeTruthy()
		}
	})
})
