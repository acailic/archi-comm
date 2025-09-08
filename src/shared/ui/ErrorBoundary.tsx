import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; info?: string; stack?: string; componentStack?: string };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    // eslint-disable-next-line no-console
    console.error('UI ErrorBoundary caught error:', error, info);
    this.setState({ 
      info: String(error?.message || 'Unknown error'),
      stack: String(error?.stack || ''),
      componentStack: String(info?.componentStack || ''),
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-sm text-red-600">
          <div className="font-semibold mb-1">Something went wrong.</div>
          <div className="opacity-70 mb-2">{this.state.info}</div>
          {(this.state.stack || this.state.componentStack) && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-red-700">Technical details</summary>
              {this.state.componentStack && (
                <pre className="mt-2 text-xs overflow-auto max-h-48 p-2 bg-red-50 rounded text-red-800 whitespace-pre-wrap">
{this.state.componentStack}
                </pre>
              )}
              {this.state.stack && (
                <pre className="mt-2 text-xs overflow-auto max-h-64 p-2 bg-red-50 rounded text-red-800 whitespace-pre-wrap">
{this.state.stack}
                </pre>
              )}
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
