/**
 * Shared HTTP helpers + logger for the data-fetching modules.
 *
 * tryFetch returns the parsed JSON on success, or the FETCH_ERROR sentinel
 * on any error (network, non-2xx, timeout, JSON parse). Callers distinguish
 * "API responded with bad data" from "we couldn't reach the API" via the
 * sentinel rather than throwing — useful for graceful carry-forward behavior.
 */

export const FETCH_ERROR = Symbol('fetch_error')

export function log(msg) {
	console.log(`[${new Date().toISOString()}] ${msg}`)
}

export async function tryFetch(url, { headers = {}, timeoutMs = 10000 } = {}) {
	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), timeoutMs)
	try {
		const res = await fetch(url, { headers, signal: controller.signal })
		if (!res.ok) throw new Error(`HTTP ${res.status}`)
		return await res.json()
	} catch (e) {
		log(`⚠  Fetch failed ${url}: ${e.message}`)
		return FETCH_ERROR
	} finally {
		clearTimeout(timer)
	}
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Like tryFetch but returns the response body as text and retries transient
 * failures with linear backoff. Used for scraping endpoints (e.g. ESPN's
 * HTML bracket page) where a single hiccup would otherwise collapse the
 * whole result to the FETCH_ERROR sentinel.
 */
export async function tryFetchText(url, { headers = {}, timeoutMs = 10000, retries = 2, retryDelayMs = 500 } = {}) {
	for (let attempt = 0; ; attempt++) {
		const controller = new AbortController()
		const timer = setTimeout(() => controller.abort(), timeoutMs)
		try {
			const res = await fetch(url, { headers, signal: controller.signal })
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			return await res.text()
		} catch (e) {
			if (attempt >= retries) {
				log(`⚠  Fetch failed ${url}: ${e.message} (after ${retries + 1} attempts)`)
				return FETCH_ERROR
			}
			log(`⚠  Fetch retry ${attempt + 1}/${retries} ${url}: ${e.message}`)
			await sleep(retryDelayMs * (attempt + 1))
		} finally {
			clearTimeout(timer)
		}
	}
}
