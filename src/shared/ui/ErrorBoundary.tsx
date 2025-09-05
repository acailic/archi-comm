import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; info?: string };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    // eslint-disable-next-line no-console
    console.error('UI ErrorBoundary caught error:', error, info);
    this.setState({ info: String(error?.message || 'Unknown error') });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-sm text-red-600">
          <div className="font-semibold">Something went wrong.</div>
          <div className="opacity-70">{this.state.info}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

