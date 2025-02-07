#!/usr/bin/env python3
import shutil
from pathlib import Path
import datetime
import json
import logging
import sys
from typing import Dict, List, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('backup.log')
    ]
)
logger = logging.getLogger(__name__)

class BackupManager:
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.backup_root = project_root / "backups"
        self.backup_root.mkdir(exist_ok=True)
        self.changelog_file = self.backup_root / "changelog.json"
        self.load_changelog()

    def load_changelog(self):
        """Load or initialize the changelog."""
        if self.changelog_file.exists():
            with open(self.changelog_file, 'r') as f:
                self.changelog = json.load(f)
        else:
            self.changelog = {
                "backups": [],
                "last_backup": None,
                "total_backups": 0
            }
            self.save_changelog()

    def save_changelog(self):
        """Save the current changelog."""
        with open(self.changelog_file, 'w') as f:
            json.dump(self.changelog, f, indent=4)

    def create_backup(self, description: str, changed_files: Optional[List[str]] = None) -> str:
        """Create a new backup with timestamp and description."""
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = self.backup_root / f"{timestamp}"
        
        # Create backup directory
        backup_dir.mkdir(exist_ok=True)
        
        # Copy source files
        ignore_patterns = shutil.ignore_patterns(
            '*.pyc', '__pycache__', '*.git*', 'backups/*', 'venv/*', '*.log'
        )
        
        try:
            # Copy project files
            shutil.copytree(
                self.project_root / "src",
                backup_dir / "src",
                ignore=ignore_patterns,
                dirs_exist_ok=True
            )
            
            # Record backup in changelog
            backup_info = {
                "timestamp": timestamp,
                "description": description,
                "changed_files": changed_files or [],
                "status": "success"
            }
            
            self.changelog["backups"].append(backup_info)
            self.changelog["last_backup"] = timestamp
            self.changelog["total_backups"] += 1
            
            self.save_changelog()
            logger.info(f"Backup created successfully: {timestamp}")
            return timestamp
            
        except Exception as e:
            logger.error(f"Backup failed: {str(e)}")
            if backup_dir.exists():
                shutil.rmtree(backup_dir)
            raise

    def restore_backup(self, timestamp: str) -> bool:
        """Restore a specific backup."""
        backup_dir = self.backup_root / timestamp
        if not backup_dir.exists():
            logger.error(f"Backup {timestamp} not found")
            return False
        
        try:
            # Create a backup of current state before restoring
            self.create_backup("Auto-backup before restore")
            
            # Restore the backup
            shutil.rmtree(self.project_root / "src")
            shutil.copytree(backup_dir / "src", self.project_root / "src")
            
            logger.info(f"Restored backup: {timestamp}")
            return True
            
        except Exception as e:
            logger.error(f"Restore failed: {str(e)}")
            raise

    def list_backups(self) -> List[Dict]:
        """List all available backups."""
        return self.changelog["backups"]

    def cleanup_old_backups(self, keep_last_n: int = 10):
        """Remove old backups, keeping only the specified number of recent ones."""
        backups = sorted(self.changelog["backups"], key=lambda x: x["timestamp"], reverse=True)
        
        if len(backups) <= keep_last_n:
            return
        
        for backup in backups[keep_last_n:]:
            backup_dir = self.backup_root / backup["timestamp"]
            if backup_dir.exists():
                shutil.rmtree(backup_dir)
                logger.info(f"Removed old backup: {backup['timestamp']}")
        
        self.changelog["backups"] = backups[:keep_last_n]
        self.save_changelog()

def main():
    """CLI interface for backup management."""
    project_root = Path(__file__).parent.parent
    backup_manager = BackupManager(project_root)
    
    if len(sys.argv) < 2:
        print("Usage: backup_manager.py [create|restore|list|cleanup]")
        return
    
    command = sys.argv[1]
    
    if command == "create":
        description = sys.argv[2] if len(sys.argv) > 2 else "Manual backup"
        backup_manager.create_backup(description)
    
    elif command == "restore":
        if len(sys.argv) < 3:
            print("Please specify backup timestamp")
            return
        backup_manager.restore_backup(sys.argv[2])
    
    elif command == "list":
        for backup in backup_manager.list_backups():
            print(f"{backup['timestamp']}: {backup['description']}")
    
    elif command == "cleanup":
        keep_last = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        backup_manager.cleanup_old_backups(keep_last)

if __name__ == "__main__":
    main() 