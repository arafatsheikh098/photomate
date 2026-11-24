import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Alert, Button } from './ui'

/**
 * Keeps one tool's failure from blanking the whole app: shows the error and a way to start over.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Tool crashed:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="space-y-4">
        <Alert>
          <p className="font-medium">Something went wrong with this image.</p>
          <p className="mt-1">{this.state.error.message}</p>
        </Alert>
        <Button onClick={() => this.setState({ error: null })}>Start over</Button>
      </div>
    )
  }
}
