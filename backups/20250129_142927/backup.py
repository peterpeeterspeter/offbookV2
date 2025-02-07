#!/usr/bin/env python3
"""
Backup tool for OFFbook project.

Usage:
    ./backup.py create              # Create a new backup
    ./backup.py list               # List all backups
    ./backup.py restore --path PATH # Restore from a specific backup
    ./backup.py cleanup --keep N    # Clean up old backups, keeping N most recent
"""

from src.utils.backup_cli import main

if __name__ == '__main__':
    main() 