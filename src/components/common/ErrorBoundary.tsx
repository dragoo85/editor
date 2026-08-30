import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Lumina Crash Protection] Uncaught component error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-dark-950 text-dark-100 p-6 select-none">
          <div className="max-w-md w-full bg-dark-900 border border-dark-700 rounded-xl p-6 shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="flex flex-col gap-1">
              <h2 className="text-base font-bold text-white">An unexpected interface error occurred</h2>
              <p className="text-xs text-dark-400">
                Your photograph edits and catalog remain safely stored. You can recover immediately by reloading or resetting the view.
              </p>
            </div>

            {this.state.error && (
              <div className="w-full bg-dark-950 p-2.5 rounded border border-dark-800 text-[11px] font-mono text-rose-400 text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center gap-3 w-full pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 py-2 px-3 rounded bg-dark-800 hover:bg-dark-750 text-dark-200 text-xs font-semibold transition-colors"
              >
                Dismiss & Resume
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 py-2 px-3 rounded bg-accent-blue hover:bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload Studio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
