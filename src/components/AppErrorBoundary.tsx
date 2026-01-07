import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  errorMessage?: string;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // Important: keep this visible so we can debug "blank page" issues.
    console.error("App crashed:", error, info);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>
              The app failed to load. Please reload the page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {this.state.errorMessage ? (
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap break-words rounded-md border border-border bg-muted/40 p-3">
                {this.state.errorMessage}
              </pre>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button onClick={this.handleReload}>Reload</Button>
              <Button variant="secondary" onClick={this.handleGoHome}>
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }
}
