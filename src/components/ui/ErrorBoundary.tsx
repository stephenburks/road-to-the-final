import { Component, type ReactNode, type ErrorInfo } from 'react'
import styles from './ErrorBoundary.module.css'

interface ErrorBoundaryProps {
	children: ReactNode
}

interface ErrorBoundaryState {
	error: Error | null
}

/**
 * Top-level error boundary. Prevents a single bad render (e.g. malformed team
 * data) from blanking the whole page.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props)
		this.state = { error: null }
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { error }
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error('[ErrorBoundary]', error, info)
	}

	handleReload = () => {
		window.location.reload()
	}

	handleReset = () => {
		window.history.replaceState({}, '', window.location.pathname)
		this.setState({ error: null })
		window.location.reload()
	}

	render() {
		if (!this.state.error) return this.props.children

		return (
			<div className={styles.container} role="alert">
				<span className={styles.icon} aria-hidden="true" />
				<h1 className={styles.title}>Something broke</h1>
				<p className={styles.message}>
					The app hit an unexpected error and couldn&apos;t render.
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