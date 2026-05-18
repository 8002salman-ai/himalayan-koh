import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application error:', error, errorInfo);
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
