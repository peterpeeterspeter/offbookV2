import numpy as np
import soundfile as sf
from pathlib import Path

def create_test_audio():
    # Create 5 seconds of silence at 16kHz
    duration = 5  # seconds
    sample_rate = 16000
    samples = np.zeros(duration * sample_rate)
    
    # Add a simple sine wave to make it non-empty
    t = np.linspace(0, duration, len(samples))
    frequency = 440  # Hz (A4 note)
    samples += 0.1 * np.sin(2 * np.pi * frequency * t)
    
    # Save as WAV file
    audio_path = Path(__file__).parent / "data" / "test_recording.wav"
    sf.write(str(audio_path), samples, sample_rate)
    print(f"Created test audio at: {audio_path}")

if __name__ == "__main__":
    create_test_audio() 