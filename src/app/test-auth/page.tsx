"use client";

import { useState, useCallback } from "react";

const MAX_RETRIES = 1;

interface User {
  id: string;
  username: string;
  email: string;
}

export default function TestAuth() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchWithRetry = useCallback(
    async (
      url: string,
      options: RequestInit = {},
      retries = MAX_RETRIES
    ): Promise<Response> => {
      try {
        const response = await fetch(url, {
          ...options,
          credentials: "include",
        });

        // If unauthorized and we have retries left, try refreshing the token
        if (response.status === 401 && retries > 0) {
          try {
            const refreshResponse = await fetch("/api/auth", {
              credentials: "include",
            });

            if (refreshResponse.ok) {
              // Token refreshed successfully, retry the original request
              return fetchWithRetry(url, options, retries - 1);
            }

            // If refresh failed, throw an error to be caught by the caller
            throw new Error("Token refresh failed");
          } catch (error) {
            console.error("Token refresh error:", error);
            throw error;
          }
        }

        return response;
      } catch (error) {
        if (
          retries > 0 &&
          error instanceof Error &&
          error.message !== "Token refresh failed"
        ) {
          // Only retry on network errors, not auth errors
          return fetchWithRetry(url, options, retries - 1);
        }
        throw error;
      }
    },
    []
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetchWithRetry("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("Login successful");
        setUser(data.user);
      } else {
        setStatus(`Login failed: ${data.error}`);
        if (response.status === 401) {
          setUser(null);
        }
      }
    } catch (error) {
      setStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const checkAuthStatus = async () => {
    setLoading(true);
    try {
      const response = await fetchWithRetry("/api/auth");
      const data = await response.json();

      if (response.ok) {
        setStatus("Authenticated");
        setUser(data.user);
      } else {
        setStatus(`Not authenticated: ${data.error}`);
        setUser(null);
      }
    } catch (error) {
      setStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const response = await fetchWithRetry("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        setUser(null);
        setStatus("Logged out");
      } else {
        const data = await response.json();
        setStatus(`Logout failed: ${data.error}`);
      }
    } catch (error) {
      setStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>

      <div className="mb-4">
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="username" className="block mb-1">
              Username:
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="border p-2 rounded"
              disabled={loading}
              autoComplete="username"
              aria-label="Username"
            />
          </div>
          <div>
            <label htmlFor="password" className="block mb-1">
              Password:
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border p-2 rounded"
              disabled={loading}
              autoComplete="current-password"
              aria-label="Password"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={loading}
            aria-label="Login"
          >
            {loading ? "Loading..." : "Login"}
          </button>
        </form>
      </div>

      <div className="space-x-4">
        <button
          onClick={checkAuthStatus}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading}
          aria-label="Check Auth Status"
        >
          {loading ? "Checking..." : "Check Auth Status"}
        </button>
        <button
          onClick={logout}
          className="bg-red-500 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading}
          aria-label="Logout"
        >
          {loading ? "Logging out..." : "Logout"}
        </button>
      </div>

      <div className="mt-4">
        <h2 className="text-xl font-bold">Status:</h2>
        <p className={loading ? "opacity-50" : ""}>{status}</p>
      </div>

      {user && (
        <div className="mt-4">
          <h2 className="text-xl font-bold">User Info:</h2>
          <pre className="bg-gray-100 p-4 rounded mt-2">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
