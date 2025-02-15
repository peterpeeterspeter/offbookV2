const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

// Ensure we're in production mode
process.env.NODE_ENV = "production";

function runCommand(command) {
  try {
    execSync(command, { stdio: "inherit" });
  } catch (error) {
    console.error(`Failed to execute ${command}`);
    process.exit(1);
  }
}

// Clean previous builds
console.log("🧹 Cleaning previous builds...");
runCommand("rm -rf .next out");

// Skip type checking and linting since they're disabled in next.config.js
console.log(
  "⏩ Skipping type check and lint as they're disabled in next.config.js"
);

// Build
console.log("🏗️ Building for production...");
runCommand("next build");

// Post-build optimizations
console.log("✨ Running post-build optimizations...");

// Create out directory if it doesn't exist
if (!fs.existsSync("out")) {
  fs.mkdirSync("out");
}

// Copy necessary files
const filesToCopy = [
  ".env.production",
  "package.json",
  "package-lock.json",
  "next.config.js",
];

filesToCopy.forEach((file) => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join("out", file));
  }
});

// Create production .env if it doesn't exist
const envPath = path.join(process.cwd(), ".env.production");
if (!fs.existsSync(envPath)) {
  console.log("⚠️ No .env.production found, creating from .env.example...");
  if (fs.existsSync(".env.example")) {
    fs.copyFileSync(".env.example", envPath);
  }
}

// Verify build
console.log("✅ Verifying build...");
if (fs.existsSync(".next") && fs.existsSync("out")) {
  console.log("✅ Build completed successfully!");
  console.log(`
Production build is ready in the 'out' directory.
To start the production server:
1. cd out
2. npm install --production
3. npm start
`);
} else {
  console.error("❌ Build failed - output directories not found");
  process.exit(1);
}
