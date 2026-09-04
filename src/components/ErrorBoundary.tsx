import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[RaceWolf overlay]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="overlay-error">
          <strong>RaceWolf — erreur overlay</strong>
          <p>{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
