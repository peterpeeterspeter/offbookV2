import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Dialog } from "../components/a11y/Dialog";
import "@testing-library/jest-dom/extend-expect";

const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe("Dialog Responsive Design", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: "Test Dialog",
    children: <div>Dialog content</div>,
  };

  beforeEach(() => {
    // Reset viewport and orientation
    global.innerWidth = 1024;
    global.innerHeight = 768;
  });

  describe("Mobile Layout", () => {
    beforeEach(() => {
      global.innerWidth = 375; // iPhone SE width
      global.innerHeight = 667;
      mockMatchMedia(true); // Mock mobile device media query
    });

    it("renders full-width dialog on mobile", () => {
      render(<Dialog {...defaultProps} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("w-full");
    });

    it("handles touch gestures for closing", () => {
      render(<Dialog {...defaultProps} />);
      const overlay = screen.getByTestId("dialog-overlay");

      fireEvent.touchStart(overlay, { touches: [{ clientY: 0 }] });
      fireEvent.touchMove(overlay, { touches: [{ clientY: 300 }] });
      fireEvent.touchEnd(overlay);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("adjusts for mobile keyboard", async () => {
      render(<Dialog {...defaultProps} />);
      const input = screen.getByRole("textbox");

      // Simulate keyboard opening
      const originalHeight = window.innerHeight;
      window.innerHeight = originalHeight / 2;
      fireEvent.focus(input);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveStyle({ maxHeight: `${window.innerHeight}px` });
    });
  });

  describe("Tablet Layout", () => {
    beforeEach(() => {
      global.innerWidth = 768; // iPad mini width
      global.innerHeight = 1024;
      mockMatchMedia(false);
    });

    it("centers dialog with max-width on tablet", () => {
      render(<Dialog {...defaultProps} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("max-w-md", "mx-auto");
    });

    it("handles orientation change", () => {
      render(<Dialog {...defaultProps} />);

      // Simulate orientation change
      global.innerWidth = 1024;
      global.innerHeight = 768;
      fireEvent(window, new Event("orientationchange"));

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveStyle({ maxHeight: `${window.innerHeight}px` });
    });
  });

  describe("Desktop Layout", () => {
    beforeEach(() => {
      global.innerWidth = 1920;
      global.innerHeight = 1080;
      mockMatchMedia(false);
    });

    it("maintains max-width and centered position on desktop", () => {
      render(<Dialog {...defaultProps} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("max-w-md", "mx-auto");
    });

    it("supports multiple monitors", () => {
      // Mock multiple monitors using Object.defineProperty
      Object.defineProperty(window.screen, "width", {
        writable: true,
        configurable: true,
        value: 3840, // Dual 1920px monitors
      });

      render(<Dialog {...defaultProps} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveStyle({
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
      });
    });
  });

  describe("Cross-device State Sync", () => {
    it("persists dialog state across screen sizes", async () => {
      const { rerender } = render(<Dialog {...defaultProps} />);

      // Start with desktop
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Switch to mobile
      global.innerWidth = 375;
      mockMatchMedia(true);
      rerender(<Dialog {...defaultProps} />);

      // Dialog should maintain its state
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it("maintains focus state across viewport changes", async () => {
      render(<Dialog {...defaultProps} />);
      const button = screen.getByRole("button", { name: /close/i });
      button.focus();

      // Change viewport
      global.innerWidth = 375;
      fireEvent(window, new Event("resize"));

      expect(document.activeElement).toBe(button);
    });
  });

  describe("Edge Cases", () => {
    it("handles rapid viewport changes without layout shifts", async () => {
      const { rerender } = render(<Dialog {...defaultProps} />);
      const dialog = screen.getByRole("dialog");
      const initialRect = dialog.getBoundingClientRect();

      // Simulate rapid viewport changes
      for (let i = 0; i < 5; i++) {
        global.innerWidth = 375 + i * 100;
        fireEvent(window, new Event("resize"));
        rerender(<Dialog {...defaultProps} />);
      }

      const finalRect = dialog.getBoundingClientRect();
      // Center position should remain stable
      expect(finalRect.x + finalRect.width / 2).toBeCloseTo(
        initialRect.x + initialRect.width / 2,
        0
      );
    });

    it("handles extreme screen sizes", () => {
      // Ultra-wide monitor
      global.innerWidth = 5120; // 5K ultra-wide
      global.innerHeight = 1440;
      const { rerender } = render(<Dialog {...defaultProps} />);
      expect(screen.getByRole("dialog")).toHaveClass("max-w-md");

      // Very small screen
      global.innerWidth = 280; // Small feature phone
      global.innerHeight = 653;
      rerender(<Dialog {...defaultProps} />);
      expect(screen.getByRole("dialog")).toHaveClass("w-full");
    });

    it("supports high DPI displays", () => {
      Object.defineProperty(window, "devicePixelRatio", {
        get: () => 3, // Retina display
      });
      render(<Dialog {...defaultProps} />);
      const dialog = screen.getByRole("dialog");
      // Should use physical pixels for smooth rendering
      expect(dialog).toHaveStyle({
        transform: "translateX(-50%) translateZ(0)",
      });
    });
  });

  describe("Advanced User Interactions", () => {
    it("handles pinch-to-zoom gestures", () => {
      render(<Dialog {...defaultProps} />);
      const dialog = screen.getByRole("dialog");

      fireEvent.touchStart(dialog, {
        touches: [
          { clientX: 0, clientY: 0 },
          { clientX: 10, clientY: 0 },
        ],
      });

      fireEvent.touchMove(dialog, {
        touches: [
          { clientX: 0, clientY: 0 },
          { clientX: 50, clientY: 0 },
        ],
      });

      // Dialog should prevent zooming
      expect(dialog).toHaveStyle({ touchAction: "none" });
    });

    it("maintains usability with long content", () => {
      const longContent = (
        <div style={{ height: "200vh" }}>Very long content</div>
      );
      render(<Dialog {...defaultProps} children={longContent} />);
      const dialog = screen.getByRole("dialog");

      // Should have scroll capability
      expect(dialog).toHaveClass("overflow-y-auto");
      // Should maintain max height
      expect(dialog).toHaveStyle({ maxHeight: `${window.innerHeight - 32}px` });
    });

    it("handles nested dialogs correctly", () => {
      render(
        <Dialog {...defaultProps}>
          <Dialog isOpen={true} onClose={() => {}} title="Nested Dialog">
            Nested content
          </Dialog>
        </Dialog>
      );

      const dialogs = screen.getAllByRole("dialog");
      expect(dialogs).toHaveLength(2);
      // Nested dialog should have higher z-index
      expect(dialogs[1]).toHaveStyle({ zIndex: expect.any(Number) });
      expect(Number(getComputedStyle(dialogs[1]).zIndex)).toBeGreaterThan(
        Number(getComputedStyle(dialogs[0]).zIndex)
      );
    });
  });

  describe("Accessibility Edge Cases", () => {
    it("handles font scaling", () => {
      // Mock large font size
      Object.defineProperty(document.documentElement, "style", {
        value: { fontSize: "24px" },
        writable: true,
      });

      render(<Dialog {...defaultProps} />);
      const dialog = screen.getByRole("dialog");
      // Should adjust padding and sizing for larger text
      expect(dialog).toHaveClass("p-4 md:p-6");
    });

    it("supports high contrast mode", () => {
      mockMatchMedia(true); // Mock high contrast mode
      render(<Dialog {...defaultProps} />);
      const dialog = screen.getByRole("dialog");
      const overlay = screen.getByTestId("dialog-overlay");

      // Should have sufficient contrast
      expect(dialog).toHaveClass("border-2");
      expect(overlay).toHaveStyle({
        backgroundColor: "rgba(0, 0, 0, 0.8)",
      });
    });

    it("works with screen magnification", () => {
      // Mock magnified view
      global.innerWidth = 1920;
      global.innerHeight = 1080;
      Object.defineProperty(window, "devicePixelRatio", {
        get: () => 1.5,
      });

      render(<Dialog {...defaultProps} />);
      const dialog = screen.getByRole("dialog");

      // Should remain centered and readable
      expect(dialog).toHaveStyle({
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        minWidth: "320px",
      });
    });
  });

  describe("Performance", () => {
    it("minimizes layout shifts during animations", async () => {
      const { rerender } = render(<Dialog {...defaultProps} />);
      const dialog = screen.getByRole("dialog");

      // Get initial position
      const initialRect = dialog.getBoundingClientRect();

      // Simulate animation frame
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Position should remain stable
      const finalRect = dialog.getBoundingClientRect();
      expect(finalRect).toEqual(initialRect);
    });

    it("optimizes render performance with many state updates", () => {
      const { rerender } = render(<Dialog {...defaultProps} />);

      // Simulate rapid state updates
      for (let i = 0; i < 100; i++) {
        rerender(<Dialog {...defaultProps} title={`Title ${i}`} />);
      }

      // Dialog should maintain its core structure
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByRole("heading")).toHaveTextContent("Title 99");
    });
  });
});
