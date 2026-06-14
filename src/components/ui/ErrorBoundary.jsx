import { Component } from 'react'
import styles from './ErrorBoundary.module.css'

/**
 * Top-level error boundary. Prevents a single bad render (e.g. malformed team
 * data) from blanking the whole page. Catches render-time errors only —
 * async/event-handler errors still need their own try/catch.
 */
export default class ErrorBoundary extends Component {
	constructor(props) {
		super(props)
		this.state = { error: null }
	}

	static getDerivedStateFromError(error) {
		return { error }
	}

	componentDidCatch(error, info) {
		// Surface for ops debugging — Sentry/etc would hook in here.
		console.error('[ErrorBoundary]', error, info)
	}

	handleReload = () => {
		window.location.reload()
	}

	handleReset = () => {
		// Strip query params and reload — recovers from a bad team/date/stage URL.
		window.history.replaceState({}, '', window.location.pathname)
		this.setState({ error: null })
		window.location.reload()
	}

	render() {
		if (!this.state.error) return this.props.children

		return (
			<div className={styles.container} role="alert">
				<span className={styles.icon} aria-hidden="true">⚠️</span>
				<h1 className={styles.title}>Something broke</h1>
				<p className={styles.message}>
					The app hit an unexpected error and couldn't render.
				</p>
				<div className={styles.actions}>
					<button type="button" className={styles.button} onClick={this.handleReload}>
						Reload
					</button>
					<button type="button" className={styles.buttonGhost} onClick={this.handleReset}>
						Reset URL &amp; reload
					</button>
				</div>
				{this.state.error?.message && (
					<pre className={styles.detail}>{this.state.error.message}</pre>
				)}
			</div>
		)
	}
}
