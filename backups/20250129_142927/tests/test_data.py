"""Test data and helper functions for tests."""
from datetime import datetime, timezone
import uuid

def create_test_user_data(unique_id: int = 1) -> dict:
    """Generate test user data with unique username."""
    return {
        "username": f"testuser_{unique_id}",
        "email": f"test{unique_id}@example.com",
        "password": "testpass123"
    }

def create_test_script_data(unique_id: int = 1) -> dict:
    """Generate test script data."""
    return {
        "title": f"Test Script {unique_id}",
        "content": (
            "ROMEO: O, she doth teach the torches to burn bright!\n"
            "JULIET: What's in a name? That which we call a rose\n"
            "By any other name would smell as sweet."
        ),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }

def create_test_session_data(script_id: int, unique_id: int = 1) -> dict:
    """Generate test session data."""
    return {
        "script_id": script_id,
        "title": f"Test Session {unique_id}",
        "settings": {
            "character_name": "Romeo",
            "scene_number": 1,
            "act_number": 2,
            "emotion_settings": {
                "base_emotion": "romantic",
                "intensity": 0.8
            }
        },
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }

def create_test_recording_data(unique_id: int = 1) -> dict:
    """Generate test recording data."""
    return {
        "transcription": "O, she doth teach the torches to burn bright!",
        "duration": 5.5,
        "word_timings": [
            {"word": "O", "start": 0.0, "end": 0.2},
            {"word": "she", "start": 0.3, "end": 0.5},
            {"word": "doth", "start": 0.6, "end": 0.8},
            {"word": "teach", "start": 0.9, "end": 1.1},
            {"word": "the", "start": 1.2, "end": 1.3},
            {"word": "torches", "start": 1.4, "end": 1.8},
            {"word": "to", "start": 1.9, "end": 2.0},
            {"word": "burn", "start": 2.1, "end": 2.4},
            {"word": "bright", "start": 2.5, "end": 3.0}
        ],
        "accuracy_score": 0.85 + (unique_id * 0.01),
        "timing_score": 0.88 + (unique_id * 0.01),
        "pronunciation_score": 0.92 + (unique_id * 0.01),
        "emotion_score": 0.78 + (unique_id * 0.01),
        "overall_score": 0.86 + (unique_id * 0.01),
        "suggestions": [
            "Try emphasizing 'burn' more for dramatic effect",
            "Slight pause needed after 'torches'",
            "Good emotional expression overall"
        ]
    }

def create_test_feedback_data(unique_id: int = 1) -> dict:
    """Generate test feedback data."""
    return {
        "performance_score": 85 + (unique_id % 5),
        "accuracy_score": 88 + (unique_id % 3),
        "suggestions": [
            "Great emotional range shown",
            "Work on pacing in the middle section",
            "Consider adding more emphasis on key words"
        ],
        "improvements": [
            "Pronunciation of 'doth' improved",
            "Better emotional connection established",
            "Timing has become more natural"
        ],
        "created_at": datetime.now(timezone.utc)
    } 
