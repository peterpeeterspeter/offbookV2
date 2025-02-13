import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TestAuth from "../app/test-auth/page";
import { act } from "react-dom/test-utils";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("TestAuth Component", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("renders login form correctly", () => {
    render(<TestAuth />);

    expect(
      screen.getByRole("textbox", { name: /username/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /check auth status/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  it("handles successful login", async () => {
    const mockUser = {
      id: "1",
      username: "testuser",
      email: "test@example.com",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser }),
    });

    render(<TestAuth />);

    await act(async () => {
      await userEvent.type(
        screen.getByRole("textbox", { name: /username/i }),
        "testuser"
      );
      await userEvent.type(screen.getByLabelText(/password/i), "password123");
      await userEvent.click(screen.getByRole("button", { name: /login/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/login successful/i)).toBeInTheDocument();
      expect(
        screen.getByText(/"email": "test@example.com"/)
      ).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "testuser",
        password: "password123",
      }),
      credentials: "include",
    });
  });

  it("handles failed login", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid credentials" }),
    });

    render(<TestAuth />);

    await act(async () => {
      await userEvent.type(
        screen.getByRole("textbox", { name: /username/i }),
        "wronguser"
      );
      await userEvent.type(screen.getByLabelText(/password/i), "wrongpass");
      await userEvent.click(screen.getByRole("button", { name: /login/i }));
    });

    await waitFor(() => {
      expect(
        screen.getByText(/login failed: invalid credentials/i)
      ).toBeInTheDocument();
    });
  });

  it("handles auth status check", async () => {
    const mockUser = {
      id: "1",
      username: "testuser",
      email: "test@example.com",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser }),
    });

    render(<TestAuth />);

    await act(async () => {
      await userEvent.click(
        screen.getByRole("button", { name: /check auth status/i })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/authenticated/i)).toBeInTheDocument();
      expect(
        screen.getByText(/"email": "test@example.com"/)
      ).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/auth", {
      credentials: "include",
    });
  });

  it("handles logout", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Logged out successfully" }),
    });

    render(<TestAuth />);

    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: /logout/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/logged out/i)).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  });

  it("handles network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<TestAuth />);

    await act(async () => {
      await userEvent.type(
        screen.getByRole("textbox", { name: /username/i }),
        "testuser"
      );
      await userEvent.type(screen.getByLabelText(/password/i), "password123");
      await userEvent.click(screen.getByRole("button", { name: /login/i }));
    });

    await waitFor(() => {
      expect(
        screen.getByText(/error: cannot read properties of undefined/i)
      ).toBeInTheDocument();
    });
  });

  it("handles token refresh on 401 response", async () => {
    // First call fails with 401
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Token expired" }),
    });

    // Token refresh succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: "1", username: "testuser", email: "test@example.com" },
      }),
    });

    // Original request succeeds after refresh
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Success" }),
    });

    render(<TestAuth />);

    await act(async () => {
      await userEvent.click(
        screen.getByRole("button", { name: /check auth status/i })
      );
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(screen.getByText(/authenticated/i)).toBeInTheDocument();
    });
  });

  it("disables buttons during loading state", async () => {
    mockFetch.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<TestAuth />);

    const loginButton = screen.getByRole("button", { name: /login/i });

    await act(async () => {
      await userEvent.click(loginButton);
    });

    expect(loginButton).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /check auth status/i })
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /logout/i })).toBeDisabled();
  });
});
