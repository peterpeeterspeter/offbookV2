import asyncio
import time
import gc
from typing import Dict, List, Optional
from datetime import datetime, UTC
from pathlib import Path

from .elevenlabs import elevenlabs_service
from .deepseek import deepseek_service
from .cache_manager import cache_manager
from .performance_monitor import performance_monitor


class BatchProcessor:
    """Handles batch processing of script lines and caching of results."""

    def __init__(self, max_batch_size: int = 10, cache_dir: Optional[Path] = None):
        """Initialize the batch processor.

        Args:
            max_batch_size: Maximum number of lines to process in one batch
            cache_dir: Directory for storing batch results
        """
        self.max_batch_size = max_batch_size
        self.cache_dir = cache_dir or Path("cache/batch")

        try:
            self.cache_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            performance_monitor.track_error("batch_processor_init")
            msg = f"Failed to create cache directory: {str(e)}"
            raise Exception(msg)

    async def process_script_batch(
        self, lines: List[str], voice_id: Optional[str] = None
    ) -> Dict:
        """Process a batch of script lines.

        Args:
            lines: List of script lines to process
            voice_id: Optional voice ID for TTS generation

        Returns:
            Dict containing batch results and statistics
        """
        start_time = time.time()
        results = {
            "total_lines": len(lines),
            "batches": [],
            "errors": [],
            "analysis": None,
        }

        try:
            # Get overall script analysis
            script_text = "\n".join(lines)
            analysis = await deepseek_service.analyze_script(script_text)
            results["analysis"] = analysis
            performance_monitor.track_api_cost("deepseek", 0.001)

            # Process lines in batches
            for i in range(0, len(lines), self.max_batch_size):
                batch = lines[i : i + self.max_batch_size]
                batch_result = await self._process_batch(batch, voice_id)
                results["batches"].append(batch_result)
                results["errors"].extend(batch_result.get("errors", []))

                # Cleanup memory for large batches
                if len(lines) > 50:
                    gc.collect()
                    performance_monitor.track_memory()

            # Cache results
            try:
                cache_key = f"batch_{int(time.time())}.json"
                cache_manager.save_to_cache(cache_key, results, self.cache_dir)
            except Exception as e:
                performance_monitor.track_error("cache_write")
                cache_manager.cleanup_failed_cache()
                msg = f"Failed to cache results: {str(e)}"
                results["errors"].append(msg)

        except Exception as e:
            msg = f"Batch processing failed: {str(e)}"
            results["errors"].append(msg)
            performance_monitor.track_error("batch_processing")

        # Track overall performance
        duration = time.time() - start_time
        performance_monitor.track_latency("batch_processing_total", duration)

        return results

    async def _process_batch(self, lines: List[str], voice_id: Optional[str]) -> Dict:
        """Process a single batch of lines."""
        start_time = time.time()
        batch_result = {
            "lines": lines,
            "emotions": [],
            "audio_cache_keys": [],
            "errors": [],
        }

        # Process each line in parallel
        tasks = []
        for line in lines:
            tasks.append(self._process_line(line, voice_id))

        line_results = await asyncio.gather(*tasks, return_exceptions=True)

        for line, result in zip(lines, line_results):
            if isinstance(result, Exception):
                msg = f"Error processing line '{line}': {str(result)}"
                batch_result["errors"].append(msg)
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
        """Process a single line with emotion analysis and optional TTS."""
        result = {}

        # Get emotion analysis
        emotion_result = await deepseek_service.analyze_emotion(line)
        result["emotion"] = emotion_result["emotion"]
        performance_monitor.track_api_cost("deepseek", 0.001)

        # Generate TTS if voice_id provided
        if voice_id:
            try:
                audio_data = await elevenlabs_service.generate_speech(line, voice_id)
                cache_key = f"tts_{hash(line)}_{voice_id}.mp3"
                cache_manager.save_to_cache(cache_key, audio_data)
                result["audio_cache_key"] = cache_key
                performance_monitor.track_api_cost("elevenlabs", 0.015)
            except Exception as e:
                msg = f"TTS generation failed: {str(e)}"
                raise Exception(msg)

        return result

    def get_batch_stats(self) -> Dict:
        """Get statistics about batch processing."""
        # Calculate cache size
        cache_size = sum(f.stat().st_size for f in self.cache_dir.glob("*.json"))
        cache_size_mb = cache_size / (1024 * 1024)

        stats = {
            "total_batches": len(list(self.cache_dir.glob("*.json"))),
            "cache_size_mb": cache_size_mb,
            "last_processed": None,
            "performance": performance_monitor.get_performance_summary(),
        }

        # Get most recent batch time
        batch_files = sorted(
            self.cache_dir.glob("*.json"), key=lambda x: x.stat().st_mtime, reverse=True
        )
        if batch_files:
            last_modified = batch_files[0].stat().st_mtime
            stats["last_processed"] = datetime.fromtimestamp(
                last_modified, UTC
            ).isoformat()

        return stats


# Create a singleton instance
batch_processor = BatchProcessor()
