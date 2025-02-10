import React from "react";
import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function RouteErrorBoundary() {
  const error = useRouteError();

  let errorMessage = "An unexpected error occurred";

  if (isRouteErrorResponse(error)) {
    errorMessage = error.data?.message || `${error.status} ${error.statusText}`;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Page Error</h1>
        <p className="text-muted-foreground mb-6">{errorMessage}</p>
        <div className="flex justify-center gap-4">
          <Button onClick={() => window.location.reload()}>Try Again</Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
