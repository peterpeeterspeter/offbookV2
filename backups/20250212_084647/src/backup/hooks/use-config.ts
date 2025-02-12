import { useEffect, useState } from 'react';
import { config, Config } from '@/lib/config';
import { validateConfig } from '@/lib/config/validate';

interface UseConfigResult {
  config: Config;
  isValid: boolean;
  errors: Array<{
    path: string;
    message: string;
  }>;
  getFeatureFlag: (flag: keyof Config['features']) => boolean;
  isDebugEnabled: (debugType: keyof Config['debug']) => boolean;
}

export function useConfig(): UseConfigResult {
  const [validationErrors, setValidationErrors] = useState<Array<{ path: string; message: string }>>([]);

  useEffect(() => {
    // Validate configuration on mount and when config changes
    const errors = validateConfig(config);
    setValidationErrors(errors);

    if (errors.length > 0 && config.debug.debugMode) {
      console.warn('Configuration validation errors:', errors);
    }
  }, []);

  const getFeatureFlag = (flag: keyof Config['features']): boolean => {
    return config.features[flag];
  };

  const isDebugEnabled = (debugType: keyof Config['debug']): boolean => {
    return config.debug[debugType];
  };

  return {
    config,
    isValid: validationErrors.length === 0,
    errors: validationErrors,
    getFeatureFlag,
    isDebugEnabled,
  };
} 