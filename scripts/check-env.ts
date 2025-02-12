#!/usr/bin/env node

interface EnvConfig {
  name: string;
  required: boolean;
  validator?: (value: string) => boolean;
  validationMessage?: string;
}

const envConfigs: EnvConfig[] = [
  {
    name: "REACT_APP_DEEPSEEK_API_KEY",
    required: true,
    validator: (value) => value.startsWith("ds_"),
    validationMessage: "DEEPSEEK_API_KEY must start with 'ds_'"
  },
  {
    name: "REACT_APP_ELEVENLABS_API_KEY",
    required: true,
    validator: (value) => /^[a-f0-9]{32}$/i.test(value),
    validationMessage: "ELEVENLABS_API_KEY must be a 32-character hex string"
  },
  {
    name: "VITE_DAILY_API_KEY",
    required: true,
    validator: (value) => value.startsWith("daily_"),
    validationMessage: "DAILY_API_KEY must start with 'daily_'"
  },
  {
    name: "NODE_ENV",
    required: false,
    validator: (value) => ["development", "production", "test"].includes(value),
    validationMessage: "NODE_ENV must be one of: development, production, test"
  },
  { name: "PORT", required: false },
  { name: "HOST", required: false }
];

console.log("Checking environment variables...\n");

let hasError = false;

// Check required variables
console.log("Required variables:");
envConfigs
  .filter(config => config.required)
  .forEach(config => {
    const value = process.env[config.name];
    if (!value) {
      console.log(`❌ ${config.name} is not set`);
      hasError = true;
      return;
    }

    if (config.validator && !config.validator(value)) {
      console.log(`❌ ${config.name}: ${config.validationMessage}`);
      hasError = true;
      return;
    }

    console.log(`✅ ${config.name} is set and valid`);
  });

// Check optional variables
console.log("\nOptional variables:");
envConfigs
  .filter(config => !config.required)
  .forEach(config => {
    const value = process.env[config.name];
    if (!value) {
      console.log(`⚠️  ${config.name} is not set (optional)`);
      return;
    }

    if (config.validator && !config.validator(value)) {
      console.log(`⚠️  ${config.name}: ${config.validationMessage} (optional)`);
      return;
    }

    console.log(`✅ ${config.name} is set to: ${value}`);
  });

if (hasError) {
  console.log("\n❌ Environment validation failed");
  process.exit(1);
} else {
  console.log("\n✅ All required environment variables are properly configured");
  process.exit(0);
}
