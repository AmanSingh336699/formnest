import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Send to Sentry if configured
    if (typeof window !== 'undefined') {
      const sentry = (window as unknown as { Sentry?: { captureException: (e: unknown, c: unknown) => void } }).Sentry;
      sentry?.captureException(error, { extra: info });
    }
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center dark:bg-slate-950">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Something went wrong</h1>
          <p className="mt-2 max-w-md text-gray-500 dark:text-slate-400">
            An unexpected error occurred. Our team has been notified. Please try again or go home.
          </p>
          <div className="mt-6 flex gap-2">
            <Button onClick={this.reset}>Go home</Button>
            <Button variant="outline" onClick={() => window.location.reload()}>Reload page</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
