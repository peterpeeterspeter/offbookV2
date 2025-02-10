from typing import Dict, List, Optional, Tuple
import numpy as np
from dataclasses import dataclass
import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import AutoModel, AutoFeatureExtractor
import librosa

@dataclass
class EmotionPrediction:
    emotion: str
    confidence: float
    intensity: float
    features: Dict[str, List[float]]
    timing: Dict[str, float]
    suggestions: List[str]

class EmotionCNN(nn.Module):
    """CNN for emotion classification from audio spectrograms"""
    def __init__(self, num_emotions: int):
        super().__init__()
        self.conv1 = nn.Conv2d(1, 32, kernel_size=3, stride=1, padding=1)
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, stride=1, padding=1)
        self.conv3 = nn.Conv2d(64, 128, kernel_size=3, stride=1, padding=1)
        self.pool = nn.MaxPool2d(2, 2)
        self.fc1 = nn.Linear(128 * 8 * 8, 512)
        self.fc2 = nn.Linear(512, num_emotions)
        self.intensity_fc = nn.Linear(512, 1)
        self.dropout = nn.Dropout(0.5)

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        # Convolutional layers
        x = self.pool(F.relu(self.conv1(x)))
        x = self.pool(F.relu(self.conv2(x)))
        x = self.pool(F.relu(self.conv3(x)))
        
        # Flatten
        x = x.view(-1, 128 * 8 * 8)
        
        # Fully connected layers
        features = F.relu(self.fc1(x))
        features = self.dropout(features)
        
        # Emotion logits and intensity
        emotion_logits = self.fc2(features)
        intensity = torch.sigmoid(self.intensity_fc(features))
        
        return emotion_logits, intensity

class EmotionAnalysisService:
    """Service for analyzing emotions in audio using DeepSeek and custom models"""
    
    EMOTIONS = ['neutral', 'joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust']
    
    def __init__(self, model_path: str, device: str = 'cuda' if torch.cuda.is_available() else 'cpu'):
        self.device = device
        
        # Initialize DeepSeek model for feature extraction
        self.feature_extractor = AutoFeatureExtractor.from_pretrained('deepseek-ai/audio-transformer')
        self.deepseek_model = AutoModel.from_pretrained('deepseek-ai/audio-transformer').to(device)
        
        # Initialize custom CNN for emotion classification
        self.emotion_model = EmotionCNN(len(self.EMOTIONS)).to(device)
        
        # Load trained weights if available
        try:
            self.emotion_model.load_state_dict(torch.load(model_path, map_location=device))
            print(f"Loaded emotion model from {model_path}")
        except Exception as e:
            print(f"Warning: Could not load emotion model weights: {str(e)}")
        
        self.emotion_model.eval()
        self.deepseek_model.eval()

    def extract_audio_features(self, audio_data: np.ndarray, sample_rate: int) -> Dict[str, List[float]]:
        """Extract audio features using librosa"""
        features = {}
        
        # Mel spectrogram
        mel_spec = librosa.feature.melspectrogram(
            y=audio_data,
            sr=sample_rate,
            n_mels=128,
            fmax=8000
        )
        mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)
        features['mel_spec'] = mel_spec_db.tolist()
        
        # Chromagram
        chroma = librosa.feature.chroma_stft(y=audio_data, sr=sample_rate)
        features['chroma'] = chroma.tolist()
        
        # MFCC
        mfcc = librosa.feature.mfcc(y=audio_data, sr=sample_rate, n_mfcc=13)
        features['mfcc'] = mfcc.tolist()
        
        # Spectral features
        spectral_centroid = librosa.feature.spectral_centroid(y=audio_data, sr=sample_rate)
        spectral_rolloff = librosa.feature.spectral_rolloff(y=audio_data, sr=sample_rate)
        features['spectral_centroid'] = spectral_centroid.tolist()
        features['spectral_rolloff'] = spectral_rolloff.tolist()
        
        return features

    def analyze_timing(self, audio_data: np.ndarray, sample_rate: int) -> Dict[str, float]:
        """Analyze timing characteristics of the audio"""
        # Detect onset strength
        onset_env = librosa.onset.onset_strength(y=audio_data, sr=sample_rate)
        
        # Calculate tempo
        tempo = librosa.beat.tempo(onset_envelope=onset_env, sr=sample_rate)[0]
        
        # Calculate speech rate using zero crossings
        zero_crossings = librosa.zero_crossings(audio_data)
        speech_rate = len(zero_crossings) / (len(audio_data) / sample_rate)
        
        return {
            'tempo': float(tempo),
            'speech_rate': float(speech_rate),
            'duration': float(len(audio_data) / sample_rate)
        }

    def generate_suggestions(
        self,
        emotion_pred: str,
        confidence: float,
        intensity: float,
        timing: Dict[str, float],
        target_emotion: Optional[str] = None,
        target_intensity: Optional[float] = None
    ) -> List[str]:
        """Generate performance suggestions based on analysis"""
        suggestions = []
        
        # Confidence-based suggestions
        if confidence < 0.5:
            suggestions.append(f"Try to express {emotion_pred} more clearly in your delivery")
        
        # Intensity-based suggestions
        if target_intensity is not None:
            if intensity < target_intensity - 0.2:
                suggestions.append(f"Try to increase the emotional intensity of your delivery")
            elif intensity > target_intensity + 0.2:
                suggestions.append(f"Try to moderate the emotional intensity slightly")
        
        # Timing-based suggestions
        if timing['speech_rate'] > 4.0:  # Threshold for fast speech
            suggestions.append("Consider slowing down your delivery for clearer emotion expression")
        elif timing['speech_rate'] < 2.0:  # Threshold for slow speech
            suggestions.append("You could pick up the pace slightly while maintaining emotional clarity")
        
        return suggestions

    @torch.no_grad()
    async def analyze_emotion(
        self,
        audio_data: np.ndarray,
        sample_rate: int,
        target_emotion: Optional[str] = None,
        target_intensity: Optional[float] = None
    ) -> EmotionPrediction:
        """Analyze emotion in audio using both DeepSeek and custom model"""
        try:
            # Extract features
            features = self.extract_audio_features(audio_data, sample_rate)
            
            # Prepare input for DeepSeek
            inputs = self.feature_extractor(
                audio_data,
                sampling_rate=sample_rate,
                return_tensors="pt"
            ).to(self.device)
            
            # Get DeepSeek embeddings
            deepseek_outputs = self.deepseek_model(**inputs)
            embeddings = deepseek_outputs.last_hidden_state
            
            # Prepare mel spectrogram for CNN
            mel_spec = torch.FloatTensor(features['mel_spec']).unsqueeze(0).unsqueeze(0).to(self.device)
            
            # Get emotion predictions from CNN
            emotion_logits, intensity = self.emotion_model(mel_spec)
            
            # Get probabilities and predictions
            probs = F.softmax(emotion_logits, dim=1)
            emotion_idx = torch.argmax(probs, dim=1).item()
            confidence = probs[0][emotion_idx].item()
            
            # Get predicted emotion and intensity
            emotion = self.EMOTIONS[emotion_idx]
            intensity_value = intensity.item()
            
            # Analyze timing
            timing = self.analyze_timing(audio_data, sample_rate)
            
            # Generate suggestions
            suggestions = self.generate_suggestions(
                emotion,
                confidence,
                intensity_value,
                timing,
                target_emotion,
                target_intensity
            )
            
            return EmotionPrediction(
                emotion=emotion,
                confidence=confidence,
                intensity=intensity_value,
                features=features,
                timing=timing,
                suggestions=suggestions
            )
            
        except Exception as e:
            print(f"Error in emotion analysis: {str(e)}")
            # Return neutral prediction as fallback
            return EmotionPrediction(
                emotion='neutral',
                confidence=0.0,
                intensity=0.5,
                features={},
                timing={'tempo': 0.0, 'speech_rate': 0.0, 'duration': 0.0},
                suggestions=['Could not analyze emotion due to an error']
            ) 