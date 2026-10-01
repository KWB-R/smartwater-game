import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppErrorFallback } from "@/components/errors/AppErrorFallback";

type Props = {
  children: ReactNode;
};

type State = {
  error: unknown;
  hasError: boolean;
};

/** Fängt Darstellungsfehler außerhalb von React Routers errorElement ab, etwa in Providern. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error("AppErrorBoundary", error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return <AppErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
