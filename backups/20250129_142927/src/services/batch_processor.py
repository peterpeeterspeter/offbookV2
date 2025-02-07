import asyncio
import time
from typing import Dict, List, Optional
from datetime import datetime, UTC
from pathlib import Path

from .elevenlabs import elevenlabs_service
from .deepseek import deepseek_service
from .whisper import whisper_service
from .cache_manager import cache_manager
from .performance_monitor import performance_monitor

class BatchProcessor:
    """Handles batch processing of script lines and caching of results."""
    
    def __init__(
        self,
        max_batch_size: int = 10,
        cache_dir: Optional[Path] = None
    ):
        """Initialize the batch processor.
        
        Args:
            max_batch_size: Maximum number of lines to process in one batch
            cache_dir: Directory for storing batch results
        """
        self.max_batch_size = max_batch_size
        self.cache_dir = cache_dir or Path("cache/batch")
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
    async def process_script_batch(
        self,
        lines: List[str],
        voice_id: Optional[str] = None
    ) -> Dict:
        """Pre-generate AI responses for static script lines.
        
        Args:
            lines: List of script lines to process
            voice_id: Optional voice ID for TTS generation
        """
        start_time = time.time()
        results = {
            "processed_at": datetime.now(UTC).isoformat(),
            "total_lines": len(lines),
            "batches": [],
            "analysis": None,
            "audio_cache": {},
            "errors": []
        }
        
        try:
            # Process in batches
            for i in range(0, len(lines), self.max_batch_size):
                batch = lines[i:i + self.max_batch_size]
                batch_result = await self._process_batch(batch, voice_id)
                results["batches"].append(batch_result)
                
            # Perform overall script analysis
            script_text = "\n".join(lines)
            analysis = await deepseek_service.analyze_script(script_text)
            results["analysis"] = analysis
            
            # Cache the results
            cache_path = self.cache_dir / f"batch_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}.json"
            if cache_manager.save_to_cache(cache_path, results):
                performance_monitor.track_api_cost("batch_cache", 0.01)  # Nominal cost for tracking
            
            # Track performance
            duration = time.time() - start_time
            performance_monitor.track_latency("batch_processing", duration)
            
            return results
            
        except Exception as e:
            error_msg = f"Error in batch processing: {str(e)}"
            print(error_msg)
            results["errors"].append(error_msg)
            performance_monitor.track_error("batch_processing")
            return results
            
    async def _process_batch(
        self,
        lines: List[str],
        voice_id: Optional[str]
    ) -> Dict:
        """Process a single batch of lines."""
        start_time = time.time()
        batch_result = {
            "lines": lines,
            "emotions": [],
            "audio_cache_keys": [],
            "errors": []
        }
        
        # Process each line in parallel
        tasks = []
        for line in lines:
            tasks.append(self._process_line(line, voice_id))
            
        line_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for line, result in zip(lines, line_results):
            if isinstance(result, Exception):
                error_msg = f"Error processing line '{line}': {str(result)}"
                batch_result["errors"].append(error_msg)
                performance_monitor.track_error("line_processing")
            else:
                batch_result["emotions"].append(result.get("emotion"))
                if "audio_cache_key" in result:
                    batch_result["audio_cache_keys"].append(result["audio_cache_key"])
                    
        # Track batch performance
        duration = time.time() - start_time
        performance_monitor.track_latency("batch_processing_chunk", duration)
        return batch_result
        
    async def _process_line(self, line: str, voice_id: Optional[str]) -> Dict:
        """Process a single line with all necessary analysis and generation."""
        start_time = time.time()
        result = {}
        
        try:
            # Analyze emotion
            emotion = await deepseek_service.analyze_emotion(line)
            result["emotion"] = emotion
            performance_monitor.track_api_cost("deepseek", 0.002)  # Cost per emotion analysis
            
            # Generate speech if voice_id provided
            if voice_id:
                try:
                    audio_data = await elevenlabs_service.generate_speech(line, voice_id)
                    # Cache key is based on text and voice_id
                    cache_key = f"{voice_id}_{hash(line)}"
                    result["audio_cache_key"] = cache_key
                    performance_monitor.track_api_cost("elevenlabs", 0.015)  # Cost per TTS generation
                except Exception as e:
                    print(f"Error generating speech for line '{line}': {str(e)}")
                    performance_monitor.track_error("tts_generation")
                    
            # Track line processing performance
            duration = time.time() - start_time
            performance_monitor.track_latency("line_processing", duration)
            
            return result
            
        except Exception as e:
            performance_monitor.track_error("line_processing")
            raise e
        
    def get_batch_stats(self) -> Dict:
        """Get statistics about batch processing."""
        stats = {
            "total_batches": len(list(self.cache_dir.glob("*.json"))),
            "cache_size_mb": sum(f.stat().st_size for f in self.cache_dir.glob("*.json")) / (1024 * 1024),
            "last_processed": None,
            "performance": performance_monitor.get_performance_summary()
        }
        
        # Get most recent batch time
        batch_files = sorted(self.cache_dir.glob("*.json"), key=lambda x: x.stat().st_mtime, reverse=True)
        if batch_files:
            stats["last_processed"] = datetime.fromtimestamp(
                batch_files[0].stat().st_mtime, UTC
            ).isoformat()
            
        return stats

# Create a singleton instance
batch_processor = BatchProcessor() 