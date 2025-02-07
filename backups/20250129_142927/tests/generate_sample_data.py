import asyncio
import random
from datetime import datetime, UTC
from pathlib import Path

from src.services.performance_monitor import performance_monitor
from src.services.cache_manager import cache_manager
from src.services.batch_processor import batch_processor

async def generate_sample_data():
    """Generate sample performance data."""
    print("Generating sample performance data...")
    
    # Sample script lines
    script_lines = [
        "To be, or not to be, that is the question.",
        "All the world's a stage, and all the men and women merely players.",
        "Life is like a box of chocolates, you never know what you're gonna get.",
        "I'm going to make him an offer he can't refuse.",
        "May the Force be with you.",
        "Here's looking at you, kid.",
        "I'll be back.",
        "You talking to me?",
        "E.T. phone home.",
        "Bond. James Bond."
    ]
    
    # Simulate batch processing
    print("Processing script batches...")
    for _ in range(3):
        try:
            await batch_processor.process_script_batch(
                lines=random.sample(script_lines, 5),
                voice_id="test_voice"
            )
        except Exception as e:
            print(f"Error in batch processing: {str(e)}")
    
    # Simulate cache operations
    print("Simulating cache operations...")
    cache_dir = Path("cache/test")
    cache_dir.mkdir(parents=True, exist_ok=True)
    
    for i in range(20):
        cache_path = cache_dir / f"test_data_{i}.json"
        data = {
            "id": i,
            "timestamp": datetime.now(UTC).isoformat(),
            "value": random.random()
        }
        
        if random.random() < 0.7:  # 70% cache hit rate
            cache_manager.save_to_cache(cache_path, data)
            cache_manager.get_cached_data(cache_path)
        else:
            cache_manager.get_cached_data(cache_path)
    
    # Simulate various latencies
    print("Simulating operation latencies...")
    operations = ["api_call", "database_query", "file_io", "processing"]
    
    for _ in range(50):
        operation = random.choice(operations)
        # Simulate realistic latencies (100ms to 2s)
        latency = random.uniform(0.1, 2.0)
        performance_monitor.track_latency(operation, latency)
    
    # Simulate API costs
    print("Simulating API costs...")
    services = ["elevenlabs", "deepseek", "whisper"]
    
    for _ in range(30):
        service = random.choice(services)
        # Simulate costs ($0.01 to $0.05 per call)
        cost = random.uniform(0.01, 0.05)
        performance_monitor.track_api_cost(service, cost)
    
    # Simulate errors
    print("Simulating errors...")
    error_types = ["api_error", "timeout", "validation_error", "processing_error"]
    
    for _ in range(15):
        error_type = random.choice(error_types)
        performance_monitor.track_error(error_type)
    
    print("Sample data generation complete!")

if __name__ == "__main__":
    asyncio.run(generate_sample_data()) 