import React, { useEffect, useState } from "react";
import {
  VADPerformanceMetrics,
  VADService,
  DeviceCapabilities,
} from "../services/vad-service";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MetricsCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status?: "success" | "warning" | "error";
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  unit,
  status = "success",
}) => (
  <div
    style={{
      background: "#fff",
      borderRadius: "8px",
      padding: "16px",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
      minWidth: "200px",
      borderLeft: `4px solid ${
        status === "success"
          ? "#4caf50"
          : status === "warning"
          ? "#ff9800"
          : "#f44336"
      }`,
    }}
  >
    <h3
      style={{
        margin: "0 0 8px",
        color: "#666",
        fontSize: "14px",
      }}
    >
      {title}
    </h3>
    <div
      style={{
        fontSize: "24px",
        fontWeight: "bold",
        color: "#333",
      }}
    >
      {value}
      {unit && (
        <span
          style={{
            fontSize: "14px",
            color: "#666",
            marginLeft: "4px",
          }}
        >
          {unit}
        </span>
      )}
    </div>
  </div>
);

interface DeviceInfoProps {
  capabilities: DeviceCapabilities;
}

const DeviceInfo: React.FC<DeviceInfoProps> = ({ capabilities }) => (
  <div
    style={{
      background: "#f5f5f5",
      borderRadius: "8px",
      padding: "16px",
      marginTop: "24px",
    }}
  >
    <h3
      style={{
        margin: "0 0 16px",
        color: "#333",
      }}
    >
      Device Capabilities
    </h3>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "8px",
          background: "#fff",
          borderRadius: "4px",
        }}
      >
        <span>Platform:</span>
        <span>{capabilities.isMobile ? "Mobile" : "Desktop"}</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "8px",
          background: "#fff",
          borderRadius: "4px",
        }}
      >
        <span>CPU Cores:</span>
        <span>{capabilities.cpuCores}</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "8px",
          background: "#fff",
          borderRadius: "4px",
        }}
      >
        <span>Battery API:</span>
        <span>{capabilities.hasBatteryAPI ? "Yes" : "No"}</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "8px",
          background: "#fff",
          borderRadius: "4px",
        }}
      >
        <span>Low Latency:</span>
        <span>{capabilities.hasLowLatencyAudio ? "Yes" : "No"}</span>
      </div>
    </div>
  </div>
);

interface MetricsHistoryChart {
  timestamp: number;
  processingTime: number;
  memoryUsage: number;
  noiseLevel: number;
}

interface VADMetricsDashboardProps {
  vadService: VADService;
  maxHistoryPoints?: number;
}

export const VADMetricsDashboard: React.FC<VADMetricsDashboardProps> = ({
  vadService,
  maxHistoryPoints = 100,
}) => {
  const [currentMetrics, setCurrentMetrics] =
    useState<VADPerformanceMetrics | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<MetricsHistoryChart[]>(
    []
  );

  useEffect(() => {
    const unsubscribe = vadService.addMetricsListener((metrics) => {
      setCurrentMetrics(metrics);

      setMetricsHistory((prev) => {
        const timestamp = Date.now();
        const newPoint = {
          timestamp,
          processingTime: metrics.averageProcessingTime,
          memoryUsage: metrics.peakMemoryUsage / 1024 / 1024, // Convert to MB
          noiseLevel: metrics.totalSamplesProcessed,
        };

        const updated = [...prev, newPoint];
        if (updated.length > maxHistoryPoints) {
          updated.shift();
        }
        return updated;
      });
    });

    return () => unsubscribe();
  }, [vadService, maxHistoryPoints]);

  if (!currentMetrics) {
    return <div>Loading metrics...</div>;
  }

  const getProcessingTimeStatus = (time: number) => {
    if (time < 5) return "success";
    if (time < 10) return "warning";
    return "error";
  };

  const getMemoryStatus = (usage: number) => {
    const usageMB = usage / 1024 / 1024;
    if (usageMB < 50) return "success";
    if (usageMB < 100) return "warning";
    return "error";
  };

  return (
    <div
      style={{
        padding: "24px",
        background: "#fafafa",
        borderRadius: "12px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <MetricsCard
          title="Processing Time"
          value={currentMetrics.averageProcessingTime.toFixed(2)}
          unit="ms"
          status={getProcessingTimeStatus(currentMetrics.averageProcessingTime)}
        />
        <MetricsCard
          title="Memory Usage"
          value={(currentMetrics.peakMemoryUsage / 1024 / 1024).toFixed(1)}
          unit="MB"
          status={getMemoryStatus(currentMetrics.peakMemoryUsage)}
        />
        <MetricsCard
          title="State Transitions"
          value={currentMetrics.stateTransitions}
        />
        <MetricsCard
          title="Error Count"
          value={currentMetrics.errorCount}
          status={currentMetrics.errorCount > 0 ? "error" : "success"}
        />
        {currentMetrics.batteryLevel !== undefined && (
          <MetricsCard
            title="Battery Level"
            value={Math.round(currentMetrics.batteryLevel * 100)}
            unit="%"
            status={currentMetrics.batteryLevel < 0.2 ? "warning" : "success"}
          />
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: "24px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "8px",
            padding: "16px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
        >
          <h3
            style={{
              margin: "0 0 16px",
              color: "#333",
            }}
          >
            Processing Time History
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metricsHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(tick: number) =>
                  new Date(tick).toLocaleTimeString()
                }
              />
              <YAxis />
              <Tooltip
                labelFormatter={(label: number) =>
                  new Date(label).toLocaleTimeString()
                }
              />
              <Line
                type="monotone"
                dataKey="processingTime"
                stroke="#2196f3"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "8px",
            padding: "16px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
        >
          <h3
            style={{
              margin: "0 0 16px",
              color: "#333",
            }}
          >
            Memory Usage History
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metricsHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(tick: number) =>
                  new Date(tick).toLocaleTimeString()
                }
              />
              <YAxis />
              <Tooltip
                labelFormatter={(label: number) =>
                  new Date(label).toLocaleTimeString()
                }
              />
              <Line
                type="monotone"
                dataKey="memoryUsage"
                stroke="#4caf50"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <DeviceInfo capabilities={currentMetrics.deviceCapabilities} />
    </div>
  );
};
