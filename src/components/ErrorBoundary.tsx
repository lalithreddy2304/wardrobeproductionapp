import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[color:var(--color-bg)] px-6 text-[color:var(--color-ink)]">
          <section className="max-w-md text-center">
            <p className="font-serif text-lg text-[color:var(--color-gold)]">My Wardrobe</p>
            <h1 className="mt-4 font-serif text-3xl leading-tight md:text-4xl">Something went wrong.</h1>
            <p className="mt-3 text-sm leading-6 text-[color:var(--color-ink-muted)]">
              The app hit an unexpected error. Reloading usually gets you back on track.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 h-11 w-full rounded-full bg-[color:var(--color-gold)] px-5 text-sm font-medium text-[color:var(--color-bg)] sm:w-auto"
            >
              Reload page
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
