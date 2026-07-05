import React from 'react';

interface VisibleErrorBoundaryProps {
  children: React.ReactNode;
  label?: string;
  resetKey?: string;
}

interface VisibleErrorBoundaryState {
  error: Error | null;
}

export class VisibleErrorBoundary extends React.Component<VisibleErrorBoundaryProps, VisibleErrorBoundaryState> {
  state: VisibleErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): VisibleErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[VisibleErrorBoundary]', this.props.label ?? 'Application section', error, errorInfo);
  }

  componentDidUpdate(prevProps: VisibleErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive">
          <div className="text-sm font-semibold">{this.props.label ?? 'This section'} failed to render.</div>
          <pre className="mt-3 whitespace-pre-wrap break-words rounded-md border border-destructive/20 bg-background/80 p-3 text-xs text-foreground">
            {this.state.error.name}: {this.state.error.message}
          </pre>
        </div>
      </div>
    );
  }
}