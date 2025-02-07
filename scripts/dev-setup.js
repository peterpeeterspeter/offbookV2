#!/usr/bin/env node

import { execSync } from "child_process";
import { existsSync, rmSync, unlinkSync, lstatSync } from "fs";
import { join, dirname } from "path";
import { createServer } from "net";
import { fileURLToPath } from "url";

// Configuration
const VITE_PORT = 3000;
const API_PORT = 3001;
const CLEANUP_PATHS = ["dist", "node_modules/.vite", ".env.local"];

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(true));
    server.once("listening", () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

async function killProcessOnPort(port) {
  try {
    if (process.platform === "win32") {
      execSync(`netstat -ano | findstr :${port}`);
    } else {
      execSync(
        `lsof -i :${port} | grep LISTEN | awk '{print $2}' | xargs kill -9`
      );
    }
  } catch (error) {
    // No process found on port
  }
}

function cleanup() {
  CLEANUP_PATHS.forEach((cleanupPath) => {
    const fullPath = join(process.cwd(), cleanupPath);
    if (existsSync(fullPath)) {
      if (lstatSync(fullPath).isDirectory()) {
        rmSync(fullPath, { recursive: true, force: true });
      } else {
        unlinkSync(fullPath);
      }
    }
  });
}

function validateEnvironment() {
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    console.error("Missing .env file");
    process.exit(1);
  }

  // Check required environment variables
  const requiredVars = ["VITE_DAILY_API_KEY", "VITE_DAILY_DOMAIN"];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error(
      "Missing required environment variables:",
      missingVars.join(", ")
    );
    process.exit(1);
  }
}

async function startServer(name, command, port) {
  console.log(`\n🚀 Starting ${name} server on port ${port}...`);

  if (await isPortInUse(port)) {
    console.log(`Port ${port} in use, attempting to free...`);
    await killProcessOnPort(port);
  }

  try {
    execSync(command, {
      stdio: "inherit",
      env: { ...process.env, PORT: port },
    });
  } catch (error) {
    console.error(`Failed to start ${name} server:`, error);
    process.exit(1);
  }
}

async function main() {
  console.log("🚀 Setting up development environment...");

  // Cleanup
  console.log("\n🧹 Cleaning up...");
  cleanup();

  // Validate environment
  console.log("\n✨ Validating environment...");
  validateEnvironment();

  // Install dependencies
  console.log("\n📦 Installing dependencies...");
  execSync("npm install", { stdio: "inherit" });

  // Start API server
  await startServer(
    "API",
    "node --loader ts-node/esm server/index.ts",
    API_PORT
  );

  // Start Vite dev server
  await startServer("Vite", "npm run dev", VITE_PORT);
}

main().catch((error) => {
  console.error("Setup failed:", error);
  process.exit(1);
});
