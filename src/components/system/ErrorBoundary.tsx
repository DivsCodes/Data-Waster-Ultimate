import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps { children: ReactNode }
interface ErrorBoundaryState { hasError: boolean }

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep diagnostics local. No error telemetry or user data is transmitted.
    if (import.meta.env.DEV) console.error('Data Waster UI error:', error, info.componentStack);
  }

  private recover = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error" role="alert" aria-labelledby="app-error-title">
          <div className="app-error__card">
            <span className="app-error__icon"><AlertTriangle size={22} aria-hidden="true" /></span>
            <p className="eyebrow">WORKSPACE RECOVERY</p>
            <h1 id="app-error-title">Something went wrong.</h1>
            <p>The current screen could not be displayed. Your locally saved sessions and settings have not been intentionally cleared.</p>
            <div className="app-error__actions">
              <button type="button" className="button button--primary" onClick={this.recover}><RefreshCw size={14} /> Reload application</button>
              <a className="button button--quiet" href="#/">Return to dashboard</a>
            </div>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
