import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-6 text-center text-ink">
          <div className="max-w-md w-full bg-paper border border-rule rounded p-8 space-y-4">
            <div className="w-10 h-10 rounded border border-danger text-danger flex items-center justify-center mx-auto">
              <AlertTriangle className="w-4 h-4" />
            </div>

            <h2 className="font-bold text-xl text-ink">
              Something went wrong
            </h2>

            <p className="text-xs text-muted leading-relaxed font-body">
              An unexpected error occurred while rendering this view. Your session and drafts remain safe.
            </p>

            {this.state.error && (
              <div className="p-3 bg-paper border border-rule rounded text-left overflow-x-auto text-[11px] font-mono text-muted max-h-32">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-2 px-4 bg-ink text-paper rounded text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
              <a
                href="/"
                className="py-2 px-4 border border-rule hover:bg-rule/40 text-ink rounded text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Home className="w-4 h-4" />
                Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
