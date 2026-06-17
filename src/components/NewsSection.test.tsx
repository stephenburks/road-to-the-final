import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithQuery } from '../test-utils'
import NewsSection from './NewsSection'

const mockArticles = [
	{
		headline: 'Test Headline 1',
		description: 'Test description for article 1',
		byline: 'Test Author',
		published: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
		type: 'Story',
		premium: false,
		images: [{ url: 'https://example.com/img1.jpg', width: 1296, height: 729 }],
		links: { web: { href: 'https://espn.com/article/1' } },
	},
	{
		headline: 'Test Headline 2',
		description: 'Test description for article 2',
		byline: 'Test Author 2',
		published: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
		type: 'Story',
		premium: false,
		images: [],
		links: { web: { href: 'https://espn.com/article/2' } },
	},
]

describe('NewsSection', () => {
	beforeEach(() => {
		vi.spyOn(globalThis, 'fetch')
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('renders section heading', async () => {
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ header: 'FIFA World Cup News', articles: mockArticles }),
		} as Response)

		renderWithQuery(<NewsSection />)
		await waitFor(() => {
			expect(screen.getByText('FIFA World Cup News')).toBeInTheDocument()
		})
	})

	it('renders ESPN disclaimer', async () => {
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ header: 'FIFA World Cup News', articles: mockArticles }),
		} as Response)

		renderWithQuery(<NewsSection />)
		await waitFor(() => {
			expect(screen.getByText('News provided by ESPN')).toBeInTheDocument()
		})
	})

	it('renders article headlines', async () => {
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ header: 'FIFA World Cup News', articles: mockArticles }),
		} as Response)

		renderWithQuery(<NewsSection />)
		await waitFor(() => {
			expect(screen.getByText('Test Headline 1')).toBeInTheDocument()
			expect(screen.getByText('Test Headline 2')).toBeInTheDocument()
		})
	})

	it('renders byline and timestamp', async () => {
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ header: 'FIFA World Cup News', articles: mockArticles }),
		} as Response)

		renderWithQuery(<NewsSection />)
		await waitFor(() => {
			expect(screen.getByText('Test Author')).toBeInTheDocument()
			expect(screen.getByText('2h ago')).toBeInTheDocument()
		})
	})

	it('links to ESPN article page', async () => {
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ header: 'FIFA World Cup News', articles: mockArticles }),
		} as Response)

		renderWithQuery(<NewsSection />)
		await waitFor(() => {
			const links = screen.getAllByRole('link')
			expect(links[0]).toHaveAttribute('href', 'https://espn.com/article/1')
		})
	})

	it('shows error state on fetch failure', async () => {
		vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

		renderWithQuery(<NewsSection />)
		await waitFor(() => {
			expect(screen.getByText('Could not load news.')).toBeInTheDocument()
		})
	})

	it('shows empty state when no articles', async () => {
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ header: 'FIFA World Cup News', articles: [] }),
		} as Response)

		renderWithQuery(<NewsSection />)
		await waitFor(() => {
			expect(screen.getByText('No news articles available.')).toBeInTheDocument()
		})
	})
})
