"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface Config {
  daily: {
    apiKey: string;
    domain: string;
    roomUrl?: string;
  };
  audio: {
    sampleRate: number;
    enableEchoCancellation: boolean;
    enableNoiseSuppression: boolean;
    enableAutoGain: boolean;
  };
  webrtc: {
    enableMetrics: boolean;
  };
}

interface ConfigContextType {
  config: Config;
  isValid: boolean;
  errors: Array<{ path: string; message: string }>;
  updateConfig: (newConfig: Partial<Config>) => void;
}

const defaultConfig: Config = {
  daily: {
    apiKey: process.env.NEXT_PUBLIC_DAILY_API_KEY || "",
    domain: process.env.NEXT_PUBLIC_DAILY_DOMAIN || "",
    roomUrl: process.env.NEXT_PUBLIC_DAILY_ROOM_URL,
  },
  audio: {
    sampleRate: 48000,
    enableEchoCancellation: true,
    enableNoiseSuppression: true,
    enableAutoGain: true,
  },
  webrtc: {
    enableMetrics: true,
  },
};

const ConfigContext = createContext<ConfigContextType>({
  config: defaultConfig,
  isValid: true,
  errors: [],
  updateConfig: () => {},
});

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return context;
}

interface ConfigProviderProps {
  children: React.ReactNode;
}

export function ConfigProvider({ children }: ConfigProviderProps) {
  const [mounted, setMounted] = useState(false);
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [errors, setErrors] = useState<
    Array<{ path: string; message: string }>
  >([]);

  useEffect(() => {
    setMounted(true);
    validateConfig(config);
  }, []);

  const updateConfig = (newConfig: Partial<Config>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
    validateConfig({ ...config, ...newConfig });
  };

  const validateConfig = (configToValidate: Config) => {
    const newErrors: Array<{ path: string; message: string }> = [];

    // Validate Daily config
    if (!configToValidate.daily.apiKey) {
      newErrors.push({
        path: "daily.apiKey",
        message: "NEXT_PUBLIC_DAILY_API_KEY is required",
      });
    }
    if (!configToValidate.daily.domain) {
      newErrors.push({
        path: "daily.domain",
        message: "NEXT_PUBLIC_DAILY_DOMAIN is required",
      });
    }

    // Validate audio config
    if (
      configToValidate.audio.sampleRate < 8000 ||
      configToValidate.audio.sampleRate > 96000
    ) {
      newErrors.push({
        path: "audio.sampleRate",
        message: "Sample rate must be between 8000 and 96000",
      });
    }

    setErrors(newErrors);
  };

  const value = {
    config,
    isValid: errors.length === 0,
    errors,
    updateConfig,
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}
