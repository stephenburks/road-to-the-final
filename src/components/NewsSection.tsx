import { useQuery } from '@tanstack/react-query'
import { ESPN_NEWS_URL } from '../constants'
import styles from './NewsSection.module.css'

interface ESPNArticle {
	headline: string
	description: string
	byline: string
	published: string
	type: string
	premium: boolean
	images: { url: string; width: number; height: number }[]
	links: { web: { href: string } }
}

function timeAgo(isoStr: string): string {
	const diff = Date.now() - new Date(isoStr).getTime()
	const mins = Math.floor(diff / 60000)
	if (mins < 60) return `${mins}m ago`
	const hours = Math.floor(mins / 60)
	if (hours < 24) return `${hours}h ago`
	const days = Math.floor(hours / 24)
	return `${days}d ago`
}

export default function NewsSection() {
	const { data: articles = [], isLoading, isError } = useQuery({
		queryKey: ['news'],
		queryFn: async ({ signal }) => {
			const r = await fetch(ESPN_NEWS_URL, { signal })
			if (!r.ok) throw new Error(`HTTP ${r.status}`)
			const j = await r.json()
			return (j.articles ?? []).filter((a: ESPNArticle) => !a.premium).slice(0, 5) as ESPNArticle[]
		},
		staleTime: 5 * 60 * 1000,
	})

	if (isError) {
		return (
			<section className={styles.section} aria-label="FIFA World Cup News">
				<h2 className={styles.heading}>FIFA World Cup News</h2>
				<p className={styles.error}>Could not load news.</p>
			</section>
		)
	}

	if (isLoading) {
		return (
			<section className={styles.section} aria-label="FIFA World Cup News">
				<h2 className={styles.heading}>FIFA World Cup News</h2>
				<p className={styles.loading}>Loading news…</p>
			</section>
		)
	}

	if (articles.length === 0) {
		return (
			<section className={styles.section} aria-label="FIFA World Cup News">
				<h2 className={styles.heading}>FIFA World Cup News</h2>
				<p className={styles.empty}>No news articles available.</p>
			</section>
		)
	}

	return (
		<section className={styles.section} aria-label="FIFA World Cup News">
			<div className={styles.headerRow}>
				<h2 className={styles.heading}>FIFA World Cup News</h2>
				<span className={styles.disclaimer}>News provided by ESPN</span>
			</div>

			<div className={styles.grid}>
				{articles.map((article, i) => {
					const img = article.images?.[0]
					return (
						<a
							key={i}
							href={article.links?.web?.href ?? '#'}
							target="_blank"
							rel="noopener noreferrer"
							className={styles.card}
						>
							{img && (
								<div className={styles.thumbnail}>
									<img
										src={img.url}
										alt=""
										loading="lazy"
										width={img.width}
										height={img.height}
									/>
								</div>
							)}
							<div className={styles.body}>
								<h3 className={styles.headline}>{article.headline}</h3>
								{article.description && (
									<p className={styles.description}>{article.description}</p>
								)}
								<div className={styles.meta}>
									{article.byline && <span className={styles.byline}>{article.byline}</span>}
									{article.published && (
										<span className={styles.timestamp}>{timeAgo(article.published)}</span>
									)}
								</div>
							</div>
						</a>
					)
				})}
			</div>
		</section>
	)
}
