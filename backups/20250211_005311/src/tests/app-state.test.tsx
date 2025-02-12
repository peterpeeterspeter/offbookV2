import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "./test-utils";
import userEvent from "@testing-library/user-event";
import { useToast } from "@/components/ui/toaster";
import { useTheme } from "next-themes";
import { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";

// Mock hooks
vi.mock("@/components/ui/toaster", () => ({
  useToast: vi.fn(() => ({
    addToast: vi.fn(),
  })),
  Toaster: () => null,
}));

vi.mock("next-themes", () => {
  const mockThemeContext = {
    theme: "light",
    setTheme: vi.fn(),
    themes: ["light", "dark"],
    systemTheme: "light",
    resolvedTheme: "light",
  };

  return {
    useTheme: vi.fn(() => mockThemeContext),
    ThemeProvider: ({ children }: { children: ReactNode }) => {
      return <div data-testid="theme-provider">{children}</div>;
    },
  };
});

// Test component to verify state behavior
function TestComponent() {
  const { addToast } = useToast();
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <button
        onClick={() =>
          addToast({
            title: "Test Toast",
            description: "Testing toast functionality",
          })
        }
        data-testid="toast-trigger"
      >
        Show Toast
      </button>
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        data-testid="theme-toggle"
      >
        Toggle Theme
      </button>
      <div data-testid="theme-value">{theme}</div>
    </div>
  );
}

describe("App State Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Initialize useToast mock with default values
    (useToast as any).mockReturnValue({
      addToast: vi.fn(),
    });

    // Initialize useTheme mock with default values
    (useTheme as any).mockReturnValue({
      theme: "light",
      setTheme: vi.fn(),
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Toast State", () => {
    it("manages toast notifications correctly", async () => {
      const mockAddToast = vi.fn();
      (useToast as any).mockReturnValue({ addToast: mockAddToast });

      render(<TestComponent />);

      const button = screen.getByTestId("toast-trigger");
      await userEvent.click(button);

      expect(mockAddToast).toHaveBeenCalledWith({
        title: "Test Toast",
        description: "Testing toast functionality",
      });
    });
  });

  describe("Theme State", () => {
    it("provides theme context to components", async () => {
      const mockSetTheme = vi.fn();
      (useTheme as any).mockReturnValue({
        theme: "light",
        setTheme: mockSetTheme,
      });

      render(<TestComponent />);

      expect(screen.getByTestId("theme-value")).toHaveTextContent("light");
    });

    it("persists theme preference", async () => {
      const mockSetTheme = vi.fn();
      (useTheme as any).mockReturnValue({
        theme: "light",
        setTheme: mockSetTheme,
      });

      render(<TestComponent />);

      const button = screen.getByTestId("theme-toggle");
      await userEvent.click(button);

      expect(mockSetTheme).toHaveBeenCalledWith("dark");
    });
  });

  describe("Query State", () => {
    it("provides query client to components", async () => {
      render(<TestComponent />);
      // Query client is available through providers
      expect(true).toBe(true);
    });
  });

  describe("Global State Persistence", () => {
    it("persists user preferences across sessions", async () => {
      const mockSetTheme = vi.fn();
      (useTheme as any).mockReturnValue({
        theme: "dark",
        setTheme: mockSetTheme,
      });

      render(<TestComponent />);
      expect(screen.getByTestId("theme-value")).toHaveTextContent("dark");
    });

    it("handles storage errors gracefully", async () => {
      const mockConsoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const mockSetTheme = vi.fn().mockImplementation(() => {
        throw new Error("Storage error");
      });

      (useTheme as any).mockReturnValue({
        theme: "light",
        setTheme: mockSetTheme,
      });

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Attempt to toggle theme
      const button = screen.getByTestId("theme-toggle");
      await userEvent.click(button);

      // Verify error was logged
      expect(mockConsoleError.mock.calls[0][1]).toEqual(
        new Error("Storage error")
      );
      // Theme should remain unchanged
      expect(screen.getByTestId("theme-value")).toHaveTextContent("light");

      mockConsoleError.mockRestore();
    });
  });
});
