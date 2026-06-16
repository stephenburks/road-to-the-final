import { useState, useEffect } from 'react'
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

interface ESPNNewsResponse {
	header: string
	articles: ESPNArticle[]
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
	const [articles, setArticles] = useState<ESPNArticle[]>([])
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const controller = new AbortController()

		fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/news', {
			signal: controller.signal,
		})
			.then(res => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`)
				return res.json() as Promise<ESPNNewsResponse>
			})
			.then(data => {
				const filtered = (data.articles ?? [])
					.filter(a => !a.premium)
					.slice(0, 5)
				setArticles(filtered)
				setLoading(false)
			})
			.catch(err => {
				if (err.name !== 'AbortError') {
					console.error('[NewsSection] fetch failed:', err)
					setError('Could not load news.')
				}
				setLoading(false)
			})

		return () => controller.abort()
	}, [])

	if (error) {
		return (
			<section className={styles.section} aria-label="FIFA World Cup News">
				<h2 className={styles.heading}>FIFA World Cup News</h2>
				<p className={styles.error}>{error}</p>
			</section>
		)
	}

	if (loading) {
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