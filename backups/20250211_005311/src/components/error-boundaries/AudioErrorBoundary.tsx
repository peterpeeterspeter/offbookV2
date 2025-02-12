import { Component, type ErrorInfo } from "react";
import {
  AudioServiceState,
  AudioServiceEvent,
  AudioServiceError,
  AudioErrorCategory,
  type AudioServiceStateType,
  type AudioServiceEventType,
  type AudioServiceErrorType,
  type AudioErrorCategoryType,
  type AudioErrorDetails,
  ERROR_MESSAGES,
  ERROR_RECOVERY_HINTS,
} from "@/types/audio";
import { AudioStateManager } from "@/services/audio-state";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface Props {
  children: React.ReactNode;
  onRetry?: () => void;
  onError?: (error: Error) => void;
}

interface State {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  audioState: {
    error: AudioErrorDetails | null;
    state: AudioServiceStateType;
  };
}

export class AudioErrorBoundary extends Component<Props, State> {
  private stateManager: AudioStateManager;

  constructor(props: Props) {
    super(props);
    this.state = {
      error: null,
      errorInfo: null,
      audioState: {
        error: null,
        state: AudioServiceState.UNINITIALIZED,
      },
    };

    this.stateManager = AudioStateManager.getInstance();
    this.stateManager.subscribe((state) => {
      this.setState({
        audioState: {
          error: state.error,
          state: state.state,
        },
      });
    });
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });

    this.props.onError?.(error);
  }

  private getErrorMessage(): string {
    const { error, audioState } = this.state;

    if (audioState.error) {
      return (
        ERROR_MESSAGES[audioState.error.code] ||
        "An unknown audio error occurred"
      );
    }

    if (error?.message.includes("audio context")) {
      return ERROR_MESSAGES.INITIALIZATION_FAILED;
    }

    return "An unexpected audio error occurred. Please try again.";
  }

  private getRecoveryHint(code: AudioServiceErrorType): string | null {
    return ERROR_RECOVERY_HINTS[code] || null;
  }

  private getRecoveryActions(): Array<{
    label: string;
    action: () => void | Promise<void>;
    primary?: boolean;
  }> {
    const { audioState } = this.state;
    const actions: Array<{
      label: string;
      action: () => void | Promise<void>;
      primary?: boolean;
    }> = [];

    // Always add retry action for retryable errors
    if (!audioState.error || audioState.error.retryable) {
      actions.push({
        label: "Try Again",
        action: this.handleRetry,
        primary: true,
      });
    }

    // Add specific actions based on error category
    if (audioState.error?.category === AudioErrorCategory.DEVICE) {
      actions.push({
        label: "Check Devices",
        action: async () => {
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioDevices = devices.filter(
              (device) => device.kind === "audioinput"
            );

            if (audioDevices.length === 0) {
              throw new Error("No audio input devices found");
            }

            // Try to get user media to trigger permission prompt
            await navigator.mediaDevices.getUserMedia({ audio: true });
            // This triggers a devicechange event which will refresh the device list
            navigator.mediaDevices.dispatchEvent(new Event("devicechange"));
            void this.handleRetry();
          } catch (err) {
            console.error("Failed to refresh devices:", err);
          }
        },
      });
    }

    if (audioState.error?.category === AudioErrorCategory.PERMISSION) {
      actions.push({
        label: "Open Settings",
        action: () => {
          window.open("chrome://settings/content/microphone");
        },
      });
    }

    if (audioState.error?.category === AudioErrorCategory.BROWSER) {
      actions.push({
        label: "Browser Info",
        action: () => {
          window.open("chrome://version");
        },
      });
    }

    if (audioState.error?.category === AudioErrorCategory.NETWORK) {
      actions.push({
        label: "Check Connection",
        action: async () => {
          try {
            const response = await fetch("https://www.google.com/generate_204");
            if (!response.ok) {
              throw new Error("Network check failed");
            }
            this.handleRetry();
          } catch (err) {
            console.error("Network check failed:", err);
          }
        },
      });

      // Add action to retry with increased timeout
      if (audioState.error.code === AudioServiceError.NETWORK_TIMEOUT) {
        actions.push({
          label: "Retry (Slow Connection)",
          action: async () => {
            const stateManager = AudioStateManager.getInstance();
            const currentState = stateManager.getState();
            stateManager.transition(AudioServiceEvent.INITIALIZE, {
              context: {
                ...currentState.context,
                networkTimeout: 30000, // 30 seconds
              },
            });
            await this.handleRetry();
          },
        });
      }
    }

    if (audioState.error?.category === AudioErrorCategory.RESOURCE) {
      actions.push({
        label: "Clear Data",
        action: async () => {
          try {
            // Clear IndexedDB data
            const databases = await window.indexedDB.databases();
            databases.forEach((db) => {
              if (db.name) window.indexedDB.deleteDatabase(db.name);
            });

            // Clear cache
            if ("caches" in window) {
              const cacheKeys = await caches.keys();
              await Promise.all(cacheKeys.map((key) => caches.delete(key)));
            }

            // Reduce audio quality
            const stateManager = AudioStateManager.getInstance();
            const currentState = stateManager.getState();
            stateManager.transition(AudioServiceEvent.INITIALIZE, {
              context: {
                ...currentState.context,
                sampleRate: 22050, // Lower sample rate
                channels: 1, // Mono audio
              },
            });

            await this.handleRetry();
          } catch (err) {
            console.error("Failed to clear data:", err);
          }
        },
      });
    }

    if (audioState.error?.category === AudioErrorCategory.SYSTEM) {
      actions.push({
        label: "Run Diagnostics",
        action: async () => {
          try {
            // Check audio context
            const AudioContext =
              window.AudioContext || (window as any).webkitAudioContext;
            const context = new AudioContext();
            await context.resume();

            // Check media devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasAudioInput = devices.some(
              (device) => device.kind === "audioinput"
            );

            if (!hasAudioInput) {
              throw new Error("No audio input devices found");
            }

            // Check memory
            if (performance?.memory) {
              const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;
              if (usedJSHeapSize > jsHeapSizeLimit * 0.9) {
                throw new Error("High memory usage");
              }
            }

            await this.handleRetry();
          } catch (err) {
            console.error("Diagnostics failed:", err);
          }
        },
      });
    }

    // Add system reset for any error in ERROR state
    if (audioState.state === AudioServiceState.ERROR) {
      actions.push({
        label: "Reset Audio",
        action: async () => {
          try {
            // Close any existing audio contexts
            const AudioContext =
              window.AudioContext || (window as any).webkitAudioContext;
            const context = new AudioContext();
            await context.close();

            // Reset audio state
            this.stateManager.restore();

            await this.handleRetry();
          } catch (err) {
            console.error("Reset failed:", err);
          }
        },
      });
    }

    return actions;
  }

  private handleRetry = async (): Promise<void> => {
    try {
      this.setState({ error: null, errorInfo: null });
      this.stateManager.transition(AudioServiceEvent.INITIALIZE);
      this.props.onRetry?.();
    } catch (error) {
      console.error("Retry failed:", error);
      if (error instanceof Error) {
        this.setState({ error });
      }
    }
  };

  override render(): React.ReactNode {
    const { error, audioState } = this.state;

    if (
      error ||
      (audioState.error && audioState.state === AudioServiceState.ERROR)
    ) {
      const message = this.getErrorMessage();
      const hint = audioState.error
        ? this.getRecoveryHint(audioState.error.code)
        : null;
      const actions = this.getRecoveryActions();

      return <ErrorFallback message={message} hint={hint} actions={actions} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  message: string;
  hint: string | null;
  actions: Array<{
    label: string;
    action: () => void | Promise<void>;
    primary?: boolean;
  }>;
}

function ErrorFallback({
  message,
  hint,
  actions,
}: ErrorFallbackProps): JSX.Element {
  return (
    <Alert variant="destructive" className="my-4">
      <AlertTitle>{message}</AlertTitle>
      {hint && <AlertDescription>{hint}</AlertDescription>}
      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map(({ label, action, primary }) => (
          <Button
            key={label}
            variant={primary ? "default" : "outline"}
            onClick={() => void action()}
          >
            {label}
          </Button>
        ))}
      </div>
    </Alert>
  );
}
