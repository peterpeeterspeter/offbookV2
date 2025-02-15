"use client";

import React, { createContext, useContext, useState } from "react";

interface Config {
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

const ConfigContext = createContext<ConfigContextType | null>(null);

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
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [errors, setErrors] = useState<
    Array<{ path: string; message: string }>
  >([]);

  const updateConfig = (newConfig: Partial<Config>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
    validateConfig({ ...config, ...newConfig });
  };

  const validateConfig = (configToValidate: Config) => {
    const newErrors: Array<{ path: string; message: string }> = [];

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

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}
