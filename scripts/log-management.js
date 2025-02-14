const fs = require("fs").promises;
const path = require("path");
const { monitoringConfig } = require("../src/config/monitoring");

const LOG_DIR = path.join(process.cwd(), "logs");
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB
const RETENTION_DAYS = monitoringConfig.logging.retention;

async function ensureLogDirectory() {
  try {
    await fs.access(LOG_DIR);
  } catch {
    await fs.mkdir(LOG_DIR, { recursive: true });
  }
}

async function getLogFiles() {
  const files = await fs.readdir(LOG_DIR);
  return files.filter((file) => file.endsWith(".log"));
}

async function getFileStats(filename) {
  const filePath = path.join(LOG_DIR, filename);
  const stats = await fs.stat(filePath);
  return {
    name: filename,
    path: filePath,
    size: stats.size,
    created: stats.birthtime,
    modified: stats.mtime,
  };
}

async function rotateLog(filePath) {
  const stats = await fs.stat(filePath);
  if (stats.size >= MAX_LOG_SIZE) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const rotatedPath = `${filePath}.${timestamp}`;
    await fs.rename(filePath, rotatedPath);
    await fs.writeFile(filePath, ""); // Create new empty log file
    console.log(`Rotated log file: ${filePath} -> ${rotatedPath}`);
  }
}

async function cleanupOldLogs() {
  const files = await getLogFiles();
  const now = new Date();
  const retentionMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;

  for (const file of files) {
    const stats = await getFileStats(file);
    const ageMs = now - stats.modified;

    if (ageMs > retentionMs) {
      await fs.unlink(stats.path);
      console.log(`Deleted old log file: ${file}`);
    }
  }
}

async function compressOldLogs() {
  const { createGzip } = require("zlib");
  const { createReadStream, createWriteStream } = require("fs");
  const { promisify } = require("util");
  const pipeline = promisify(require("stream").pipeline);

  const files = await getLogFiles();
  const now = new Date();
  const compressionThresholdMs = 24 * 60 * 60 * 1000; // 1 day

  for (const file of files) {
    const stats = await getFileStats(file);
    const ageMs = now - stats.modified;

    if (ageMs > compressionThresholdMs && !file.endsWith(".gz")) {
      const gzipPath = `${stats.path}.gz`;

      await pipeline(
        createReadStream(stats.path),
        createGzip(),
        createWriteStream(gzipPath)
      );

      await fs.unlink(stats.path);
      console.log(`Compressed log file: ${file} -> ${file}.gz`);
    }
  }
}

async function main() {
  try {
    await ensureLogDirectory();

    // Rotate current log files if they exceed size limit
    const currentLogs = ["error.log", "combined.log"];
    for (const log of currentLogs) {
      const logPath = path.join(LOG_DIR, log);
      try {
        await rotateLog(logPath);
      } catch (error) {
        if (error.code !== "ENOENT") {
          console.error(`Error rotating ${log}:`, error);
        }
      }
    }

    // Compress logs older than 1 day
    await compressOldLogs();

    // Delete logs older than retention period
    await cleanupOldLogs();
  } catch (error) {
    console.error("Error in log management:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  ensureLogDirectory,
  rotateLog,
  cleanupOldLogs,
  compressOldLogs,
};
