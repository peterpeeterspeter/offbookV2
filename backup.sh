#!/bin/bash

# Get current timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="offbook_backup_${TIMESTAMP}.tar.gz"

# Create backup
tar --exclude='node_modules' \
    --exclude='venv' \
    --exclude='.pytest_cache' \
    --exclude='__pycache__' \
    --exclude='.DS_Store' \
    --exclude='cache' \
    --exclude='*.pyc' \
    -czf "${BACKUP_NAME}" \
    frontend/ \
    src/ \
    tests/ \
    documentation/ \
    migrations/ \
    scripts/ \
    requirements.txt \
    package.json \
    package-lock.json \
    README.md \
    .env.example \
    .gitignore \
    alembic.ini

echo "Backup created: ${BACKUP_NAME}" 