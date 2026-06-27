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
