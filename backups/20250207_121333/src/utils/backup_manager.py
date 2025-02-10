import os
import shutil
from datetime import datetime
import logging
from pathlib import Path
import json

class BackupManager:
    def __init__(self, root_dir: str = None):
        self.root_dir = root_dir or os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        self.backup_dir = os.path.join(self.root_dir, 'backups')
        self.backup_log_file = os.path.join(self.backup_dir, 'backup_log.json')
        self._setup_logging()
        self._ensure_backup_dir()

    def _setup_logging(self):
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger('BackupManager')

    def _ensure_backup_dir(self):
        """Ensure backup directory exists"""
        os.makedirs(self.backup_dir, exist_ok=True)
        if not os.path.exists(self.backup_log_file):
            with open(self.backup_log_file, 'w') as f:
                json.dump([], f)

    def _get_backup_path(self) -> str:
        """Generate timestamped backup directory path"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        return os.path.join(self.backup_dir, timestamp)

    def _get_files_to_backup(self) -> list:
        """Get list of files to backup, excluding certain directories/files"""
        exclude = {
            '.git', '__pycache__', 'venv', 'backups', 'node_modules',
            '.pytest_cache', '.coverage', '*.pyc', '*.pyo', '*.pyd'
        }
        
        files_to_backup = []
        for root, dirs, files in os.walk(self.root_dir):
            # Remove excluded directories
            dirs[:] = [d for d in dirs if d not in exclude]
            
            for file in files:
                if not any(file.endswith(ext) for ext in ['.pyc', '.pyo', '.pyd']):
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, self.root_dir)
                    if not any(ex in rel_path for ex in exclude):
                        files_to_backup.append((full_path, rel_path))
        
        return files_to_backup

    def _log_backup(self, backup_path: str, files_backed_up: list):
        """Log backup details to backup_log.json"""
        try:
            with open(self.backup_log_file, 'r') as f:
                log_entries = json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            log_entries = []

        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'backup_path': backup_path,
            'files_count': len(files_backed_up),
            'files': files_backed_up
        }
        
        log_entries.append(log_entry)
        
        with open(self.backup_log_file, 'w') as f:
            json.dump(log_entries, f, indent=2)

    def create_backup(self) -> str:
        """Create a new backup of the project"""
        backup_path = self._get_backup_path()
        self.logger.info(f"Creating backup in: {backup_path}")
        
        try:
            files_to_backup = self._get_files_to_backup()
            
            for src_path, rel_path in files_to_backup:
                dst_path = os.path.join(backup_path, rel_path)
                os.makedirs(os.path.dirname(dst_path), exist_ok=True)
                shutil.copy2(src_path, dst_path)
            
            self._log_backup(backup_path, [f[1] for f in files_to_backup])
            self.logger.info(f"Backup completed successfully: {len(files_to_backup)} files backed up")
            return backup_path
            
        except Exception as e:
            self.logger.error(f"Backup failed: {str(e)}")
            if os.path.exists(backup_path):
                shutil.rmtree(backup_path)
            raise

    def restore_backup(self, backup_path: str):
        """Restore from a specific backup"""
        if not os.path.exists(backup_path):
            raise ValueError(f"Backup path does not exist: {backup_path}")
        
        self.logger.info(f"Restoring from backup: {backup_path}")
        
        try:
            # Restore each file from backup
            for root, _, files in os.walk(backup_path):
                for file in files:
                    backup_file_path = os.path.join(root, file)
                    relative_path = os.path.relpath(backup_file_path, backup_path)
                    target_path = os.path.join(self.root_dir, relative_path)
                    
                    os.makedirs(os.path.dirname(target_path), exist_ok=True)
                    shutil.copy2(backup_file_path, target_path)
            
            self.logger.info("Restore completed successfully")
            
        except Exception as e:
            self.logger.error(f"Restore failed: {str(e)}")
            raise

    def list_backups(self) -> list:
        """List all available backups"""
        try:
            with open(self.backup_log_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []

    def cleanup_old_backups(self, keep_last_n: int = 5):
        """Remove old backups, keeping only the n most recent ones"""
        backups = self.list_backups()
        if len(backups) <= keep_last_n:
            return
        
        # Sort backups by timestamp
        backups.sort(key=lambda x: x['timestamp'], reverse=True)
        
        # Remove old backups
        for backup in backups[keep_last_n:]:
            backup_path = backup['backup_path']
            if os.path.exists(backup_path):
                shutil.rmtree(backup_path)
                self.logger.info(f"Removed old backup: {backup_path}")
        
        # Update log file
        with open(self.backup_log_file, 'w') as f:
            json.dump(backups[:keep_last_n], f, indent=2) 
