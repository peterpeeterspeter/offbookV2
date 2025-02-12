import React from "react";
import {
  AudioServiceError,
  AudioErrorCategory,
  type AudioErrorDetails,
} from "@/types/audio";

interface Props {
  children: React.ReactNode;
  onReset?: () => void;
}

interface State {
  error: AudioErrorDetails | null;
  hasError: boolean;
}

export class AudioErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      error: null,
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      error: {
        code: AudioServiceError.SYSTEM_ERROR,
        message: error.message,
        category: AudioErrorCategory.SYSTEM,
        name: "AudioSystemError",
        retryable: false,
        details: { originalError: error },
      },
      hasError: true,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("Audio Error:", error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ error: null, hasError: false });
    this.props.onReset?.();
  };

  render(): React.ReactElement {
    if (this.state.hasError) {
      return (
        <div className="audio-error">
          <h2>Audio Error</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={this.handleReset}>Try Again</button>
        </div>
      );
    }

    return <>{this.props.children}</>;
  }
}
