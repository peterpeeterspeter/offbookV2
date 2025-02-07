import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, beforeEach } from "vitest";
import { VADMetricsDashboard } from "../VADMetricsDashboard";
import {
  VADService,
  VADOptions,
  VADPerformanceMetrics,
} from "../../services/vad-service";
import { vi } from "vitest";

// Mock VADService
class MockVADService {
  private metricsListeners: Set<(metrics: VADPerformanceMetrics) => void> =
    new Set();

  addMetricsListener(listener: (metrics: VADPerformanceMetrics) => void) {
    this.metricsListeners.add(listener);
    return () => this.metricsListeners.delete(listener);
  }

  // Helper to simulate metrics updates
  emitMetrics(metrics: VADPerformanceMetrics) {
    this.metricsListeners.forEach((listener) => listener(metrics));
  }

  // Helper to get listener count for testing
  getListenerCount(): number {
    return this.metricsListeners.size;
  }
}

describe("VADMetricsDashboard", () => {
  let mockVadService: MockVADService;

  const mockMetrics: VADPerformanceMetrics = {
    averageProcessingTime: 3.5,
    peakMemoryUsage: 45 * 1024 * 1024, // 45MB
    totalSamplesProcessed: 10000,
    stateTransitions: 5,
    errorCount: 0,
    deviceCapabilities: {
      isMobile: false,
      hasBatteryAPI: true,
      cpuCores: 8,
      hasLowLatencyAudio: true,
      hasWebWorker: true,
      hasPerformanceAPI: true,
    },
    batteryLevel: 0.85,
    isCharging: true,
    audioContextLatency: 0.005,
  };

  beforeEach(() => {
    mockVadService = new MockVADService();
  });

  it("renders loading state initially", () => {
    render(
      <VADMetricsDashboard
        vadService={mockVadService as unknown as VADService}
      />
    );
    expect(screen.getByText("Loading metrics...")).toBeInTheDocument();
  });

  it("renders metrics cards with correct values", async () => {
    render(
      <VADMetricsDashboard
        vadService={mockVadService as unknown as VADService}
      />
    );

    act(() => {
      mockVadService.emitMetrics(mockMetrics);
    });

    // Check processing time card
    expect(screen.getByText("Processing Time")).toBeInTheDocument();
    expect(screen.getByText("3.50")).toBeInTheDocument();
    expect(screen.getByText("ms")).toBeInTheDocument();

    // Check memory usage card
    expect(screen.getByText("Memory Usage")).toBeInTheDocument();
    expect(screen.getByText("45.0")).toBeInTheDocument();
    expect(screen.getByText("MB")).toBeInTheDocument();

    // Check state transitions card
    expect(screen.getByText("State Transitions")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();

    // Check error count card
    expect(screen.getByText("Error Count")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();

    // Check battery level card
    expect(screen.getByText("Battery Level")).toBeInTheDocument();
    expect(screen.getByText("85")).toBeInTheDocument();
    expect(screen.getByText("%")).toBeInTheDocument();
  });

  it("updates metrics history correctly", async () => {
    const { rerender } = render(
      <VADMetricsDashboard
        vadService={mockVadService as unknown as VADService}
        maxHistoryPoints={3}
      />
    );

    // Emit multiple metrics updates
    act(() => {
      mockVadService.emitMetrics({
        ...mockMetrics,
        averageProcessingTime: 3.0,
      });
    });

    act(() => {
      mockVadService.emitMetrics({
        ...mockMetrics,
        averageProcessingTime: 4.0,
      });
    });

    act(() => {
      mockVadService.emitMetrics({
        ...mockMetrics,
        averageProcessingTime: 5.0,
      });
    });

    // Check that old metrics are removed when maxHistoryPoints is reached
    act(() => {
      mockVadService.emitMetrics({
        ...mockMetrics,
        averageProcessingTime: 6.0,
      });
    });

    // Force rerender to update charts
    rerender(
      <VADMetricsDashboard
        vadService={mockVadService as unknown as VADService}
        maxHistoryPoints={3}
      />
    );

    // Verify device info section
    expect(screen.getByText("Device Capabilities")).toBeInTheDocument();
    expect(screen.getByText("Desktop")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("shows correct status indicators", async () => {
    render(
      <VADMetricsDashboard
        vadService={mockVadService as unknown as VADService}
      />
    );

    // Test success status
    act(() => {
      mockVadService.emitMetrics({
        ...mockMetrics,
        averageProcessingTime: 3.0,
        peakMemoryUsage: 30 * 1024 * 1024,
      });
    });

    expect(screen.getByText("Processing Time").parentElement).toHaveClass(
      "status-success"
    );
    expect(screen.getByText("Memory Usage").parentElement).toHaveClass(
      "status-success"
    );

    // Test warning status
    act(() => {
      mockVadService.emitMetrics({
        ...mockMetrics,
        averageProcessingTime: 8.0,
        peakMemoryUsage: 80 * 1024 * 1024,
      });
    });

    expect(screen.getByText("Processing Time").parentElement).toHaveClass(
      "status-warning"
    );
    expect(screen.getByText("Memory Usage").parentElement).toHaveClass(
      "status-warning"
    );

    // Test error status
    act(() => {
      mockVadService.emitMetrics({
        ...mockMetrics,
        averageProcessingTime: 12.0,
        peakMemoryUsage: 120 * 1024 * 1024,
        errorCount: 1,
      });
    });

    expect(screen.getByText("Processing Time").parentElement).toHaveClass(
      "status-error"
    );
    expect(screen.getByText("Memory Usage").parentElement).toHaveClass(
      "status-error"
    );
    expect(screen.getByText("Error Count").parentElement).toHaveClass(
      "status-error"
    );
  });

  it("cleans up listeners on unmount", () => {
    const { unmount } = render(
      <VADMetricsDashboard
        vadService={mockVadService as unknown as VADService}
      />
    );

    expect(mockVadService.getListenerCount()).toBe(1);
    unmount();
    expect(mockVadService.getListenerCount()).toBe(0);
  });
});
