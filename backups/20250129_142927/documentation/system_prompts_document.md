Enhanced System Prompts Documentation
Integrating Emotion-Aware AI, Adaptive Timing, and Cost Optimization

1. Introduction
System prompts are the backbone of AI interactions in our SaaS platform, enabling actors to practice with a virtual co-actor that adapts in real-time. This update introduces emotion-aware responses, adaptive pacing, and collaborative rehearsal tools, ensuring the AI behaves like a human partner. The prompts now guide the AI to:

Read lines with emotional nuance (e.g., anger, sarcasm).

Adjust response timing based on user hesitation or errors.

Sync script changes across teams during group rehearsals.

2. Purpose of System Prompts
Prompts now serve three advanced goals:

Emotion Modulation: Deliver lines with tone/intonation matching script cues (e.g., [angrily]).

Dynamic Timing: Speed up/slow down responses based on user cadence.

Collaborative Context: Maintain role consistency in shared scripts (e.g., User A = Hamlet, User B = Ophelia).

3. Prompt Structure & Guidelines
New Conventions:

Emotion Tags: Embed cues like [emotion: angry] in prompts to trigger ElevenLabs’ TTS modulation.

Timing Variables: Use [pause: 0.5s] to inject silence after critical lines.

Collaboration Flags: Add [role: Hamlet] to align AI with shared script roles.

Guidelines:

Brevity: Keep prompts under 500 characters for low-latency processing.

Context-Awareness: Reference prior lines (e.g., "In the previous scene, you hesitated—adjusting pace...").

4. Core System Prompts
Prompt Type	Example	Use Case
Emotion-Read	[emotion: sarcastic] "Oh, you’re *such* a hero," [pause: 0.3s].	Sarcastic line delivery in comedies.
Adaptive Timing	[speed: 1.2x] "Hurry! We’re running late!"	Increase urgency during tense scenes.
Role Sync	[role: Ophelia] "I’ll give you a dollar," [emotion: hesitant].	Multi-user rehearsals with shared roles.
5. Role-Specific Prompts
Dramatic Roles:

Copy
[emotion: intense] "You’re crazy!" [pause: 1s] [speed: 0.9x]  
Comedic Roles:

Copy
[emotion: playful] "Nice try!" [speed: 1.1x] [pause: 0.2s]  
Dynamic Adjustment:

If the user stutters, trigger: [speed: 0.8x] "Take your time..." [pause: 1s].

6. Dynamic Prompts
Real-Time Adaptation:

python
Copy
# Example logic for hesitation detection  
if user_pause > 2s:  
    prompt = "[speed: 0.7x] [emotion: calm] Let’s try that line again."  
Collaboration Sync:

When User A edits a script, broadcast: [update: Act 1, Scene 2] "Revised line: 'I’ll give you ten dollars.'".

7. Error Handling Prompts
Scenario	Prompt Response
Emotion Detection Fail	[fallback: neutral] "Could you repeat that line?"
API Timeout	[cached_audio] "Let’s continue with the next scene."
Role Conflict	[alert: role_mismatch] "User B is already playing Ophelia."
8. Feedback & Improvement
New Feedback Channels:

Emotion Accuracy Score: Users rate AI’s tone (1–5 stars) post-session.

Latency Reports: Auto-log response delays >1.5s for optimization.

Collaboration Surveys: “Did the AI maintain consistent roles during group practice?”

Iteration Cycle:

Weekly prompt updates based on user feedback and API performance metrics.

9. Conclusion
The enhanced system prompts transform the AI from a static reader to a dynamic, emotionally intelligent partner. By embedding emotion tags, adaptive timing, and collaboration flags, the platform now offers:

Human-like realism in line delivery.

Seamless group rehearsals with role consistency.

Cost efficiency via cached responses and offline processing.

This evolution positions the platform as the gold standard for AI-driven actor training, merging technical innovation with artistic nuance.