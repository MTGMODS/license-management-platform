import { Component, type ErrorInfo, type ReactNode } from 'react'

import { ErrorState } from '@/shared/ui'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  failed: boolean
}

/** Keeps a crash in a page/widget from blanking the whole shell. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack)
    }
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <div className="shell py-16">
          <ErrorState onRetry={() => this.setState({ failed: false })} />
        </div>
      )
    }

    return this.props.children
  }
}
