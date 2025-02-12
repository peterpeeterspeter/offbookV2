import os
import json
import time
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime, UTC

from .performance_monitor import performance_monitor

class CacheManager:
    """Manages caching for AI services with size limits and cleanup."""
    
    def __init__(
        self,
        max_cache_size_mb: int = 500,
        max_age_days: int = 7,
        cleanup_threshold: float = 0.9
    ):
        """Initialize the cache manager.
        
        Args:
            max_cache_size_mb: Maximum cache size in megabytes
            max_age_days: Maximum age of cache files in days
            cleanup_threshold: Cleanup when cache size reaches this % of max
        """
        self.max_cache_size = max_cache_size_mb * 1024 * 1024  # Convert to bytes
        self.max_age_seconds = max_age_days * 24 * 60 * 60
        self.cleanup_threshold = cleanup_threshold
        self.cache_stats: Dict[str, int] = {
            "hits": 0,
            "misses": 0,
            "cleanups": 0,
            "bytes_saved": 0
        }
        
    def get_cache_stats(self) -> Dict:
        """Get current cache statistics."""
        total_requests = self.cache_stats["hits"] + self.cache_stats["misses"]
        hit_rate = self.cache_stats["hits"] / total_requests if total_requests > 0 else 0
        
        stats = {
            **self.cache_stats,
            "hit_rate": hit_rate,
            "mb_saved": self.cache_stats["bytes_saved"] / (1024 * 1024)
        }
        
        # Track cache performance metrics
        performance_monitor.track_latency("cache_hit_rate", hit_rate)
        
        return stats
        
    def should_cleanup(self, cache_dir: Path) -> bool:
        """Check if cache cleanup is needed."""
        start_time = time.time()
        try:
            current_size = sum(f.stat().st_size for f in cache_dir.rglob("*") if f.is_file())
            needs_cleanup = current_size >= (self.max_cache_size * self.cleanup_threshold)
            
            # Track cache size metrics
            if needs_cleanup:
                performance_monitor.track_latency("cache_size_check", time.time() - start_time)
                performance_monitor.track_error("cache_overflow")
                
            return needs_cleanup
            
        except Exception as e:
            print(f"Error checking cache size: {str(e)}")
            performance_monitor.track_error("cache_size_check")
            return False
        
    def cleanup_old_cache(self, cache_dir: Path) -> None:
        """Remove old cache files when size limit is exceeded."""
        start_time = time.time()
        
        if not cache_dir.exists():
            return
            
        try:
            # Get all cache files with their stats
            cache_files = []
            current_size = 0
            now = time.time()
            
            for file_path in cache_dir.rglob("*"):
                if not file_path.is_file():
                    continue
                    
                stats = file_path.stat()
                age = now - stats.st_mtime
                current_size += stats.st_size
                
                cache_files.append({
                    "path": file_path,
                    "size": stats.st_size,
                    "age": age,
                    "last_access": stats.st_atime
                })
                
            if current_size <= self.max_cache_size:
                return
                
            # Sort files by age and last access
            cache_files.sort(key=lambda x: (x["age"], -x["last_access"]))
            
            # Remove files until we're under the limit
            bytes_to_free = current_size - (self.max_cache_size * 0.8)  # Target 80% usage
            bytes_freed = 0
            files_removed = 0
            
            for file_info in cache_files:
                if bytes_freed >= bytes_to_free:
                    break
                    
                try:
                    file_info["path"].unlink()
                    bytes_freed += file_info["size"]
                    files_removed += 1
                except Exception as e:
                    print(f"Error removing cache file {file_info['path']}: {str(e)}")
                    performance_monitor.track_error("cache_cleanup")
                    
            self.cache_stats["cleanups"] += 1
            
            # Track cleanup performance
            cleanup_duration = time.time() - start_time
            performance_monitor.track_latency("cache_cleanup", cleanup_duration)
            performance_monitor.track_latency("cache_bytes_freed", bytes_freed)
            
            print(f"Cache cleanup: removed {files_removed} files, freed {bytes_freed / (1024*1024):.2f} MB")
            
        except Exception as e:
            print(f"Error during cache cleanup: {str(e)}")
            performance_monitor.track_error("cache_cleanup")
        
    def get_cached_data(self, cache_path: Path) -> Optional[Dict]:
        """Get data from cache if valid."""
        start_time = time.time()
        
        if not cache_path.exists():
            self.cache_stats["misses"] += 1
            performance_monitor.track_latency("cache_miss", time.time() - start_time)
            return None
            
        try:
            stats = cache_path.stat()
            age = time.time() - stats.st_mtime
            
            # Check if cache is too old
            if age > self.max_age_seconds:
                cache_path.unlink()
                self.cache_stats["misses"] += 1
                performance_monitor.track_latency("cache_miss", time.time() - start_time)
                performance_monitor.track_error("cache_expired")
                return None
                
            data = json.loads(cache_path.read_text())
            self.cache_stats["hits"] += 1
            self.cache_stats["bytes_saved"] += stats.st_size
            
            # Track cache hit performance
            performance_monitor.track_latency("cache_hit", time.time() - start_time)
            
            return data
            
        except Exception as e:
            print(f"Error reading cache file {cache_path}: {str(e)}")
            self.cache_stats["misses"] += 1
            performance_monitor.track_error("cache_read")
            performance_monitor.track_latency("cache_error", time.time() - start_time)
            return None
            
    def save_to_cache(self, cache_path: Path, data: Dict) -> bool:
        """Save data to cache."""
        start_time = time.time()
        
        try:
            # Ensure cache directory exists
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Add cache metadata
            data_with_meta = {
                **data,
                "_cache_metadata": {
                    "cached_at": datetime.now(UTC).isoformat(),
                    "version": "1.0"
                }
            }
            
            # Save to cache
            cache_path.write_text(json.dumps(data_with_meta))
            
            # Track successful cache write
            performance_monitor.track_latency("cache_write", time.time() - start_time)
            
            # Check if cleanup needed
            if self.should_cleanup(cache_path.parent):
                self.cleanup_old_cache(cache_path.parent)
                
            return True
            
        except Exception as e:
            print(f"Error saving to cache {cache_path}: {str(e)}")
            performance_monitor.track_error("cache_write")
            performance_monitor.track_latency("cache_error", time.time() - start_time)
            return False

# Create a singleton instance
cache_manager = CacheManager() 