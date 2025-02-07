"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { ApiError } from "@/lib/api"

interface ApiErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ApiErrorBoundaryState {
  hasError: boolean
  error?: ApiError
}

export class ApiErrorBoundary extends React.Component<
  ApiErrorBoundaryProps,
  ApiErrorBoundaryState
> {
  constructor(props: ApiErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ApiErrorBoundaryState {
    if (error instanceof ApiError) {
      return { hasError: true, error }
    }
    // Re-throw non-API errors to be caught by the parent error boundary
    throw error
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (error instanceof ApiError) {
      console.error("API Error:", {
        status: error.status,
        message: error.message,
        ...errorInfo,
      })
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <div className="text-center">
            <h2 className="text-lg font-semibold">API Error</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {this.state.error?.message || "Failed to communicate with the server"}
            </p>
            {this.state.error?.status && (
              <p className="mt-1 text-sm text-muted-foreground">
                Status: {this.state.error.status}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => {
              this.setState({ hasError: false })
              window.location.reload()
            }}
          >
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

export function ApiErrorBoundaryWrapper({
  children,
  fallback,
}: ApiErrorBoundaryProps) {
  return (
    <ApiErrorBoundary fallback={fallback}>
      {children}
    </ApiErrorBoundary>
  )
} 