import argparse
import sys
from datetime import datetime
from .backup_manager import BackupManager

def format_timestamp(timestamp_str: str) -> str:
    """Format ISO timestamp to human readable format"""
    dt = datetime.fromisoformat(timestamp_str)
    return dt.strftime('%Y-%m-%d %H:%M:%S')

def list_backups(manager: BackupManager):
    """Display list of available backups"""
    backups = manager.list_backups()
    if not backups:
        print("No backups found.")
        return
    
    print("\nAvailable backups:")
    print("-" * 80)
    print(f"{'Timestamp':<25} {'Files':<8} {'Path'}")
    print("-" * 80)
    
    for backup in backups:
        timestamp = format_timestamp(backup['timestamp'])
        print(f"{timestamp:<25} {backup['files_count']:<8} {backup['backup_path']}")

def main():
    parser = argparse.ArgumentParser(description='Backup Manager CLI')
    parser.add_argument('action', choices=['create', 'restore', 'list', 'cleanup'],
                      help='Action to perform')
    parser.add_argument('--path', help='Backup path for restore action')
    parser.add_argument('--keep', type=int, default=5,
                      help='Number of backups to keep when cleaning up')
    
    args = parser.parse_args()
    manager = BackupManager()
    
    try:
        if args.action == 'create':
            backup_path = manager.create_backup()
            print(f"\nBackup created successfully at: {backup_path}")
        
        elif args.action == 'restore':
            if not args.path:
                print("Error: --path argument is required for restore action")
                sys.exit(1)
            manager.restore_backup(args.path)
            print(f"\nBackup restored successfully from: {args.path}")
        
        elif args.action == 'list':
            list_backups(manager)
        
        elif args.action == 'cleanup':
            manager.cleanup_old_backups(args.keep)
            print(f"\nCleaned up old backups, keeping {args.keep} most recent")
            list_backups(manager)
    
    except Exception as e:
        print(f"\nError: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main() 