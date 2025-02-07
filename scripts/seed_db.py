#!/usr/bin/env python3
import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime, timedelta

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from src.database.config import AsyncSessionLocal
from src.database.models import (
    User, Script, Character, Scene, PracticeSession,
    Performance, Recording, Feedback
)

async def seed_database():
    """Seed the database with sample data."""
    async with AsyncSessionLocal() as session:
        try:
            # Create sample users
            users = [
                User(
                    username="alice_actor",
                    email="alice@example.com"
                ),
                User(
                    username="bob_director",
                    email="bob@example.com"
                ),
                User(
                    username="carol_coach",
                    email="carol@example.com"
                )
            ]
            session.add_all(users)
            await session.commit()
            
            # Create a sample script
            script = Script(
                title="Romeo and Juliet - Act 2, Scene 2",
                content="""
ROMEO
But, soft! what light through yonder window breaks?
It is the east, and Juliet is the sun.
Arise, fair sun, and kill the envious moon,
Who is already sick and pale with grief,
That thou her maid art far more fair than she.

JULIET
O Romeo, Romeo! wherefore art thou Romeo?
Deny thy father and refuse thy name;
Or, if thou wilt not, be but sworn my love,
And I'll no longer be a Capulet.

ROMEO
[Aside] Shall I hear more, or shall I speak at this?

JULIET
'Tis but thy name that is my enemy;
Thou art thyself, though not a Montague.
What's Montague? it is nor hand, nor foot,
Nor arm, nor face, nor any other part
Belonging to a man.
                """.strip(),
                language="en",
                scene_count=1,
                total_lines=15,
                estimated_duration=300.0,
                metadata={
                    "genre": "tragedy",
                    "era": "renaissance",
                    "themes": ["love", "conflict", "identity"]
                }
            )
            session.add(script)
            await session.commit()
            
            # Create characters
            characters = [
                Character(
                    name="Romeo",
                    description="A young man of the Montague family, passionate and romantic",
                    emotional_profile={
                        "baseline": "passionate",
                        "ranges": {
                            "love": 0.9,
                            "despair": 0.8,
                            "anger": 0.6
                        }
                    },
                    voice_settings={
                        "voice_id": "romeo_voice",
                        "style": "romantic",
                        "pitch": 1.0,
                        "speed": 1.0
                    }
                ),
                Character(
                    name="Juliet",
                    description="A young woman of the Capulet family, intelligent and determined",
                    emotional_profile={
                        "baseline": "thoughtful",
                        "ranges": {
                            "love": 0.9,
                            "conflict": 0.7,
                            "determination": 0.8
                        }
                    },
                    voice_settings={
                        "voice_id": "juliet_voice",
                        "style": "youthful",
                        "pitch": 1.2,
                        "speed": 1.0
                    }
                )
            ]
            session.add_all(characters)
            await session.commit()
            
            # Associate characters with script
            script.characters.extend(characters)
            await session.commit()
            
            # Create a scene
            scene = Scene(
                script_id=script.id,
                scene_number=1,
                content=script.content,
                duration_estimate=300.0,
                emotion_flow={
                    "sequence": [
                        {"emotion": "love", "intensity": 0.8},
                        {"emotion": "yearning", "intensity": 0.9},
                        {"emotion": "hope", "intensity": 0.7}
                    ]
                },
                intensity_score=0.85
            )
            session.add(scene)
            await session.commit()
            
            # Create a practice session
            practice_session = PracticeSession(
                script_id=script.id,
                started_at=datetime.utcnow(),
                is_active=True,
                settings={
                    "mode": "scene_study",
                    "feedback_level": "detailed",
                    "recording_enabled": True
                }
            )
            session.add(practice_session)
            await session.commit()
            
            # Add users to session
            practice_session.participants.extend(users[:2])  # Add Alice and Bob
            await session.commit()
            
            # Create performances
            start_time = datetime.utcnow() - timedelta(minutes=30)
            performances = [
                Performance(
                    user_id=users[0].id,  # Alice
                    session_id=practice_session.id,
                    character_id=characters[1].id,  # Juliet
                    scene_id=scene.id,
                    start_time=start_time,
                    end_time=start_time + timedelta(minutes=5),
                    emotion_accuracy=0.85,
                    timing_score=0.78,
                    pronunciation_score=0.92,
                    overall_score=0.85,
                    metrics={
                        "emotion_details": {
                            "love": 0.9,
                            "determination": 0.8
                        },
                        "timing_details": {
                            "pace": 0.85,
                            "pauses": 0.75
                        }
                    }
                ),
                Performance(
                    user_id=users[1].id,  # Bob
                    session_id=practice_session.id,
                    character_id=characters[0].id,  # Romeo
                    scene_id=scene.id,
                    start_time=start_time,
                    end_time=start_time + timedelta(minutes=5),
                    emotion_accuracy=0.82,
                    timing_score=0.88,
                    pronunciation_score=0.85,
                    overall_score=0.85,
                    metrics={
                        "emotion_details": {
                            "passion": 0.85,
                            "yearning": 0.9
                        },
                        "timing_details": {
                            "pace": 0.9,
                            "pauses": 0.85
                        }
                    }
                )
            ]
            session.add_all(performances)
            await session.commit()
            
            # Create recordings
            recordings = [
                Recording(
                    performance_id=performances[0].id,
                    file_path="/recordings/alice_juliet_001.wav",
                    duration=180.5,
                    transcription="O Romeo, Romeo! wherefore art thou Romeo?...",
                    emotion_analysis={
                        "primary_emotion": "love",
                        "intensity": 0.85,
                        "variations": [
                            {"emotion": "yearning", "intensity": 0.8},
                            {"emotion": "hope", "intensity": 0.7}
                        ]
                    }
                ),
                Recording(
                    performance_id=performances[1].id,
                    file_path="/recordings/bob_romeo_001.wav",
                    duration=165.0,
                    transcription="But, soft! what light through yonder window breaks?...",
                    emotion_analysis={
                        "primary_emotion": "passion",
                        "intensity": 0.82,
                        "variations": [
                            {"emotion": "love", "intensity": 0.85},
                            {"emotion": "admiration", "intensity": 0.75}
                        ]
                    }
                )
            ]
            session.add_all(recordings)
            await session.commit()
            
            # Create feedback
            feedback = [
                Feedback(
                    session_id=practice_session.id,
                    from_user_id=users[1].id,  # Bob
                    to_user_id=users[0].id,    # Alice
                    content={
                        "overall": "Excellent emotional depth in the balcony scene",
                        "strengths": [
                            "Natural delivery of complex lines",
                            "Strong emotional connection"
                        ],
                        "areas_for_improvement": [
                            "Could vary pacing more in longer monologues",
                            "Consider adding more subtle emotional transitions"
                        ],
                        "score": 4.5
                    }
                ),
                Feedback(
                    session_id=practice_session.id,
                    from_user_id=users[0].id,  # Alice
                    to_user_id=users[1].id,    # Bob
                    content={
                        "overall": "Very convincing portrayal of Romeo's passion",
                        "strengths": [
                            "Excellent vocal projection",
                            "Good use of dramatic pauses"
                        ],
                        "areas_for_improvement": [
                            "Could emphasize the youthful energy more",
                            "Consider varying emotional intensity"
                        ],
                        "score": 4.3
                    }
                )
            ]
            session.add_all(feedback)
            await session.commit()
            
            print("Database seeded successfully!")
            
        except Exception as e:
            print(f"Error seeding database: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()

if __name__ == "__main__":
    asyncio.run(seed_database()) 