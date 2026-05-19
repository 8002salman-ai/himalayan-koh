import { Component, ErrorInfo, ReactNode } from 'react';
import { reportClientError } from '../lib/monitoring';

interface ErrorBoundaryState {
  hasError: boolean;
  errorId: string | null;
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorId: null };

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = reportClientError(error, {
      componentStack: errorInfo.componentStack?.slice(0, 500) ?? '',
      boundary: 'root',
    });
    this.setState({ errorId });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-warm-white flex items-center justify-center p-4">
          <div className="max-w-md text-center bg-white rounded-2xl shadow-md p-8">
            <h1 className="font-serif text-2xl font-bold text-charcoal mb-3">
              Something went wrong
            </h1>
            <p className="text-charcoal-light mb-6">
              Please refresh the page or contact support if the issue continues.
              {this.state.errorId && (
                <span className="block mt-2 text-xs text-charcoal-light/80">
                  Reference: {this.state.errorId}
                </span>
              )}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
