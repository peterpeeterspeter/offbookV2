import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import ScriptUpload, { ScriptUploadProps } from "../ScriptUpload";

vi.setConfig({ testTimeout: 10000 });

describe("ScriptUpload", () => {
  const mockOnUpload = vi.fn().mockImplementation(() => Promise.resolve());

  const defaultProps: ScriptUploadProps = {
    onUpload: mockOnUpload,
    supportedFormats: [".txt"],
    maxSize: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders upload button", () => {
    const onUpload = vi.fn();
    render(<ScriptUpload onUpload={onUpload} />);
    expect(screen.getByTestId("upload-input")).toBeInTheDocument();
  });

  it("handles file upload", async () => {
    const onUpload = vi.fn();
    render(<ScriptUpload onUpload={onUpload} />);

    const file = new File(["test content"], "test.txt", { type: "text/plain" });
    const input = screen.getByTestId("upload-input");

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
      // Fast-forward through all timers
      await vi.runAllTimersAsync();
    });

    expect(onUpload).toHaveBeenCalledWith(file);
  });

  it("shows error for invalid file type", async () => {
    const onUpload = vi.fn();
    render(<ScriptUpload onUpload={onUpload} />);

    const file = new File(["test content"], "test.jpg", { type: "image/jpeg" });
    const input = screen.getByTestId("upload-input");

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    expect(screen.getByTestId("upload-error")).toBeInTheDocument();
    expect(onUpload).not.toHaveBeenCalled();
  });
});
