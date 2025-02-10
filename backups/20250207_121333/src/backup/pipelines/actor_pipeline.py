import asyncio
import time
from typing import Optional, Dict, List
from dataclasses import dataclass, field

from pipecat.frames.frames import TextFrame, EndFrame, AudioFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.task import PipelineTask
from pipecat.pipeline.runner import PipelineRunner
from pipecat.services.elevenlabs import ElevenLabsTTSService
from pipecat.services.deepseek import DeepSeekService
from pipecat.services.whisper import WhisperSTTService
from pipecat.utilities.audio import SileroVADAnalyzer
from pipecat.transports.services.daily import DailyTransport, DailyParams

@dataclass
class PerformanceMetrics:
    """Tracks user performance during practice."""
    hesitations: int = 0
    pauses: List[float] = field(default_factory=list)
    line_durations: List[float] = field(default_factory=list)
    emotion_accuracy: float = 1.0
    last_interaction_time: float = 0
    total_practice_time: float = 0
    line_completion_rate: float = 0

@dataclass
class ScriptState:
    """Maintains the state of the current script practice session."""
    characters: List[str] = field(default_factory=list)
    lines: List[Dict] = field(default_factory=list)
    current_line_index: int = 0
    user_role: Optional[str] = None
    ai_role: Optional[str] = None
    last_user_response_time: float = 0
    performance: PerformanceMetrics = field(default_factory=PerformanceMetrics)
    scene_context: Dict = field(default_factory=lambda: {
        "setting": "",
        "mood": "neutral",
        "key_themes": [],
        "suggested_pace": "medium"
    })

class ActorPracticePipeline:
    def __init__(
        self,
        room_url: str,
        elevenlabs_api_key: str,
        deepseek_api_key: str,
        voice_id: str,
        bot_name: str = "AI Actor"
    ):
        self.room_url = room_url
        self.elevenlabs_api_key = elevenlabs_api_key
        self.deepseek_api_key = deepseek_api_key
        self.voice_id = voice_id
        self.bot_name = bot_name
        
        # Initialize session state
        self.script_state = ScriptState()
        self.practice_mode = "line_by_line"  # or "scene_flow"
        self.session_start_time = 0
        
        # Initialize services
        self.transport = DailyTransport(
            room_url=room_url,
            token="",
            bot_name=bot_name,
            params=DailyParams(audio_out_enabled=True)
        )
        
        self.tts = ElevenLabsTTSService(
            api_key=elevenlabs_api_key,
            voice_id=voice_id
        )
        
        self.script_analyzer = DeepSeekService(
            api_key=deepseek_api_key
        )
        
        self.stt = WhisperSTTService()
        self.vad = SileroVADAnalyzer()
        
        # Initialize pipeline components
        self.pipeline = Pipeline([
            self.stt,
            self.script_analyzer,
            self.tts,
            self.vad,
            self.transport.output()
        ])
        
        self.runner = PipelineRunner()
        self.task = PipelineTask(self.pipeline)
        
        # Set up event handlers
        self._setup_event_handlers()
    
    def _setup_event_handlers(self):
        @self.transport.event_handler("on_first_participant_joined")
        async def on_first_participant_joined(transport, participant):
            participant_name = participant.get("info", {}).get("userName", "")
            self.session_start_time = time.time()
            await self.task.queue_frame(TextFrame(
                f"Hello {participant_name}! I'm your AI scene partner. "
                "Please share your script when you're ready to begin. "
                "You can also say 'help' for available commands."
            ))
        
        @self.transport.event_handler("on_participant_left")
        async def on_participant_left(transport, participant, reason):
            # Calculate final performance metrics
            await self._send_performance_summary()
            await self.task.queue_frame(EndFrame())
        
        @self.transport.event_handler("on_audio_frame")
        async def on_audio_frame(transport, frame: AudioFrame):
            # Process incoming audio for speech recognition
            text = await self.stt.transcribe(frame)
            if text:
                await self._handle_user_input(text)
    
    async def _handle_user_input(self, text: str):
        """Handle user voice commands and script lines."""
        # Check for commands
        if text.lower().strip() in ["help", "commands"]:
            await self._send_help_message()
            return
            
        if text.lower().startswith("set role"):
            role = text.lower().replace("set role", "").strip()
            await self._set_user_role(role)
            return
            
        if text.lower() == "start practice":
            await self._start_practice_session()
            return
            
        if text.lower() == "show progress":
            await self._send_performance_summary()
            return
            
        # Handle script line
        if self.script_state.lines:
            await self._process_user_line(text)
    
    async def _send_help_message(self):
        help_text = (
            "Available commands:\n"
            "- 'Set role [character]': Choose your character\n"
            "- 'Start practice': Begin the scene\n"
            "- 'Switch mode': Toggle between line-by-line and scene flow\n"
            "- 'Repeat line': AI repeats its last line\n"
            "- 'Show progress': See your performance metrics\n"
            "- 'From [character] line': Jump to a specific character's line"
        )
        await self.task.queue_frame(TextFrame(help_text))
    
    async def _set_user_role(self, role: str):
        if role in self.script_state.characters:
            self.script_state.user_role = role
            # Set AI role as the other main character
            other_chars = [c for c in self.script_state.characters if c != role]
            if other_chars:
                self.script_state.ai_role = other_chars[0]
            await self.task.queue_frame(TextFrame(
                f"Great! You'll play {role}. I'll be {self.script_state.ai_role}. "
                "Say 'start practice' when ready."
            ))
    
    async def _start_practice_session(self):
        if not self.script_state.user_role:
            await self.task.queue_frame(TextFrame(
                "Please set your role first using 'set role [character]'."
            ))
            return
            
        self.script_state.performance = PerformanceMetrics()
        self.script_state.performance.last_interaction_time = time.time()
        
        await self.task.queue_frame(TextFrame(
            f"Starting practice in {self.practice_mode} mode. "
            f"Scene mood is {self.script_state.scene_context['mood']}. "
            f"Suggested pace is {self.script_state.scene_context['suggested_pace']}. "
            "I'll begin with my first line..."
        ))
        await self._deliver_next_ai_line()
    
    async def _process_user_line(self, text: str):
        """Process user's spoken line and provide feedback."""
        current_line = self.script_state.lines[self.script_state.current_line_index]
        
        # Check if it's user's turn
        if current_line["character"] != self.script_state.user_role:
            return
            
        # Calculate timing metrics
        now = time.time()
        response_time = now - self.script_state.performance.last_interaction_time
        self.script_state.performance.last_interaction_time = now
        
        # Analyze timing and provide feedback
        if response_time > 3.0:  # More than 3s delay
            self.script_state.performance.hesitations += 1
            self.script_state.performance.pauses.append(response_time)
            
            if self.script_state.performance.hesitations >= 3:
                await self.task.queue_frame(TextFrame(
                    "I notice you might be having trouble with the timing. "
                    "Would you like to practice this section more slowly?"
                ))
        
        # Update performance metrics
        self.script_state.performance.line_durations.append(response_time)
        self.script_state.performance.line_completion_rate = (
            self.script_state.current_line_index + 1
        ) / len(self.script_state.lines)
        
        # Move to next line
        self.script_state.current_line_index += 1
        await self._deliver_next_ai_line()
    
    async def _deliver_next_ai_line(self):
        """Deliver AI's next line with appropriate emotion and timing."""
        if self.script_state.current_line_index >= len(self.script_state.lines):
            await self._send_performance_summary()
            await self.task.queue_frame(TextFrame("End of scene. Great work!"))
            return
            
        line = self.script_state.lines[self.script_state.current_line_index]
        if line["character"] == self.script_state.ai_role:
            # Adjust delivery based on user's performance
            speed_factor = 1.0
            if self.script_state.performance.hesitations > 2:
                speed_factor = 0.8  # Slow down if user is hesitating
            
            # Apply emotion and modifiers
            emotion_data = line.get("emotion", {})
            modifiers = emotion_data.get("modifiers", [])
            
            await self.task.queue_frame(TextFrame(
                line["text"],
                metadata={
                    "emotion": emotion_data.get("base", "neutral"),
                    "intensity": emotion_data.get("intensity", 0.5),
                    "speed": speed_factor * line["timing"].get("suggested_speed", 1.0),
                    "modifiers": modifiers,
                    "pause_before": line["timing"].get("pause_before", 0.5),
                    "pause_after": line["timing"].get("pause_after", 1.0)
                }
            ))
    
    async def _send_performance_summary(self):
        """Send a summary of the user's performance metrics."""
        perf = self.script_state.performance
        total_time = time.time() - self.session_start_time
        
        # Calculate metrics
        avg_pause = (
            sum(perf.pauses) / len(perf.pauses)
            if perf.pauses else 0
        )
        avg_line_duration = (
            sum(perf.line_durations) / len(perf.line_durations)
            if perf.line_durations else 0
        )
        
        summary = (
            "Performance Summary:\n"
            f"- Practice duration: {int(total_time)}s\n"
            f"- Lines completed: {int(perf.line_completion_rate * 100)}%\n"
            f"- Hesitations: {perf.hesitations}\n"
            f"- Average pause: {avg_pause:.1f}s\n"
            f"- Average line duration: {avg_line_duration:.1f}s\n"
            f"- Emotion accuracy: {int(perf.emotion_accuracy * 100)}%"
        )
        
        await self.task.queue_frame(TextFrame(summary))

    async def process_script(self, script_text: str):
        """Process a new script for practice."""
        # Analyze script with DeepSeek
        analysis = await self.script_analyzer.analyze_script(script_text)
        
        if analysis and analysis.get("lines"):
            self.script_state = ScriptState(
                characters=analysis["characters"],
                lines=analysis["lines"],
                scene_context=analysis.get("scene_context", {
                    "setting": "unknown",
                    "mood": "neutral",
                    "key_themes": [],
                    "suggested_pace": "medium"
                })
            )
            
            # Provide script summary
            char_list = ", ".join(analysis["characters"])
            await self.task.queue_frame(TextFrame(
                f"I've analyzed the script. Characters: {char_list}\n"
                f"Scene setting: {self.script_state.scene_context['setting']}\n"
                f"Mood: {self.script_state.scene_context['mood']}\n"
                "Please choose your role using 'set role [character]'."
            ))

async def main():
    # Example usage
    pipeline = ActorPracticePipeline(
        room_url="your_room_url",
        elevenlabs_api_key="your_elevenlabs_key",
        deepseek_api_key="your_deepseek_key",
        voice_id="your_voice_id"
    )
    
    try:
        await pipeline.start()
    except KeyboardInterrupt:
        await pipeline.stop()

if __name__ == "__main__":
    asyncio.run(main()) 