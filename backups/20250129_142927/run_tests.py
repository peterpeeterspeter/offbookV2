#!/usr/bin/env python3
import os
import sys
import pytest
from dotenv import load_dotenv

def main():
    """Run the test suite with proper configuration."""
    # Load environment variables
    load_dotenv()
    
    # Verify environment
    required_vars = [
        "ELEVENLABS_API_KEY",
        "DEEPSEEK_API_KEY",
        "CACHE_DIR",
        "MODELS_DIR"
    ]
    
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        print(f"Error: Missing required environment variables: {', '.join(missing_vars)}")
        sys.exit(1)
        
    # Add src directory to Python path
    src_dir = os.path.join(os.path.dirname(__file__), "src")
    sys.path.insert(0, src_dir)
    
    # Run pytest with configuration
    args = [
        "--verbose",
        "--asyncio-mode=auto",
        "tests/test_services.py",
        "-v"
    ]
    
    # Add coverage reporting if requested
    if "--coverage" in sys.argv:
        args.extend([
            "--cov=src",
            "--cov-report=term-missing",
            "--cov-report=html"
        ])
        
    exit_code = pytest.main(args)
    sys.exit(exit_code)

if __name__ == "__main__":
    main() 