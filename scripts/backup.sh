#!/bin/bash

# Get current timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backups"
BACKUP_NAME="ai_actor_practice_backup_${TIMESTAMP}"

# Create backups directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create list of directories to backup
DIRS_TO_BACKUP=(
    "src"
    "public"
    "scripts"
    "backend"
    "frontend"
    "ai"
    "infra"
    "documentation"
    "supabase"
    "migrations"
    "models"
    "tests"
    "cache"
    "pipecat-main"
)

# Create list of files to backup
FILES_TO_BACKUP=(
    "package.json"
    "package-lock.json"
    "tsconfig.json"
    "tailwind.config.js"
    "next.config.js"
    "README.md"
    ".env.example"
    "requirements.txt"
    "alembic.ini"
    "jest.config.js"
    "run_tests.py"
    "docker-compose.yml"
)

# Create list of config directories to backup
CONFIG_DIRS=(
    ".vscode"
    "supabase/config"
    "infra/terraform"
)

# Create temporary directory for backup
TEMP_DIR="${BACKUP_DIR}/${BACKUP_NAME}"
mkdir -p $TEMP_DIR

# Copy directories
for dir in "${DIRS_TO_BACKUP[@]}"; do
    if [ -d "$dir" ]; then
        echo "Backing up directory: $dir"
        cp -r "$dir" "$TEMP_DIR/"
    fi
done

# Copy config directories
for dir in "${CONFIG_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "Backing up config directory: $dir"
        mkdir -p "$TEMP_DIR/$(dirname $dir)"
        cp -r "$dir" "$TEMP_DIR/$(dirname $dir)/"
    fi
done

# Copy files
for file in "${FILES_TO_BACKUP[@]}"; do
    if [ -f "$file" ]; then
        echo "Backing up file: $file"
        cp "$file" "$TEMP_DIR/"
    fi
done

# Backup database if Supabase CLI is available
if command -v supabase &> /dev/null; then
    echo "Backing up Supabase database"
    supabase db dump -f "$TEMP_DIR/supabase/backup.sql"
fi

# Create archive
cd $BACKUP_DIR
tar -czf "${BACKUP_NAME}.tar.gz" $BACKUP_NAME
rm -rf $BACKUP_NAME
cd ..

echo "Backup completed: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

# Clean up old backups (keep last 5)
cd $BACKUP_DIR
ls -t *.tar.gz | tail -n +6 | xargs -r rm
cd ..

# Generate backup report
echo "Backup Report - ${TIMESTAMP}" > "${BACKUP_DIR}/backup_report_${TIMESTAMP}.txt"
echo "----------------------------------------" >> "${BACKUP_DIR}/backup_report_${TIMESTAMP}.txt"
echo "Directories backed up:" >> "${BACKUP_DIR}/backup_report_${TIMESTAMP}.txt"
printf '%s\n' "${DIRS_TO_BACKUP[@]}" >> "${BACKUP_DIR}/backup_report_${TIMESTAMP}.txt"
echo "----------------------------------------" >> "${BACKUP_DIR}/backup_report_${TIMESTAMP}.txt"
echo "Config directories backed up:" >> "${BACKUP_DIR}/backup_report_${TIMESTAMP}.txt"
printf '%s\n' "${CONFIG_DIRS[@]}" >> "${BACKUP_DIR}/backup_report_${TIMESTAMP}.txt"
echo "----------------------------------------" >> "${BACKUP_DIR}/backup_report_${TIMESTAMP}.txt"
echo "Files backed up:" >> "${BACKUP_DIR}/backup_report_${TIMESTAMP}.txt"
printf '%s\n' "${FILES_TO_BACKUP[@]}" >> "${BACKUP_DIR}/backup_report_${TIMESTAMP}.txt"

echo "Backup cleanup completed. Keeping last 5 backups."
echo "Backup report generated: ${BACKUP_DIR}/backup_report_${TIMESTAMP}.txt" 