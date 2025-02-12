#!/usr/bin/env node

const requiredEnvVars = [
  "REACT_APP_DEEPSEEK_API_KEY",
  "REACT_APP_ELEVENLABS_API_KEY",
  "VITE_DAILY_API_KEY",
];

const optionalEnvVars = ["NODE_ENV", "PORT", "HOST"];

console.log("Checking environment variables...\n");

let hasError = false;

// Check required variables
console.log("Required variables:");
requiredEnvVars.forEach((envVar) => {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar} is set`);
  } else {
    console.log(`❌ ${envVar} is not set`);
    hasError = true;
  }
});

// Check optional variables
console.log("\nOptional variables:");
optionalEnvVars.forEach((envVar) => {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar} is set to: ${process.env[envVar]}`);
  } else {
    console.log(`⚠️  ${envVar} is not set (optional)`);
  }
});

// Validate API key formats
if (process.env.REACT_APP_DEEPSEEK_API_KEY) {
  if (!process.env.REACT_APP_DEEPSEEK_API_KEY.startsWith("ds_")) {
    console.log("\n❌ REACT_APP_DEEPSEEK_API_KEY format is invalid");
    hasError = true;
  }
}

if (process.env.REACT_APP_ELEVENLABS_API_KEY) {
  if (!process.env.REACT_APP_ELEVENLABS_API_KEY.match(/^[a-f0-9]{32}$/i)) {
    console.log("\n❌ REACT_APP_ELEVENLABS_API_KEY format is invalid");
    hasError = true;
  }
}

if (process.env.VITE_DAILY_API_KEY) {
  if (!process.env.VITE_DAILY_API_KEY.startsWith("daily_")) {
    console.log("\n❌ VITE_DAILY_API_KEY format is invalid");
    hasError = true;
  }
}

if (hasError) {
  console.log("\n❌ Environment validation failed");
  process.exit(1);
} else {
  console.log(
    "\n✅ All required environment variables are properly configured"
  );
  process.exit(0);
}
