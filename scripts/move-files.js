const fs = require("fs");
const path = require("path");

const sourceDir = path.join(__dirname, "../src/app/scripts/[id]");
const targetDir = path.join(__dirname, "../src/app/scripts/detail");

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy files
["page.tsx", "page.client.tsx"].forEach((file) => {
  const sourcePath = path.join(sourceDir, file);
  const targetPath = path.join(targetDir, file);

  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`Copied ${file} to new location`);
  }
});
