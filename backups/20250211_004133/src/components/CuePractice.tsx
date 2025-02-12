import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CuePracticeService,
  Cue,
  CueStats,
  CueSettings,
} from "../services/cue-practice";
import { AudioService } from "../services/audio-service";
import { ScriptAnalysisService } from "../services/script-analysis";
import "./CuePractice.css";

interface CuePracticeProps {
  scriptId: string;
  userRole: string;
  onComplete?: (stats: CueStats) => void;
}

const CuePractice: React.FC<CuePracticeProps> = ({
  scriptId,
  userRole,
  onComplete,
}) => {
  // Services
  const cuePracticeService = useRef<CuePracticeService>();
  const sessionId = useRef<string>();

  // State
  const [currentCue, setCurrentCue] = useState<Cue>();
  const [isRecording, setIsRecording] = useState(false);
  const [stats, setStats] = useState<CueStats>();
  const [settings, setSettings] = useState<CueSettings>({
    useAudioSignal: true,
    showEmotionIndicators: true,
    autoAdvance: true,
    minDelay: 500,
    maxDelay: 2000,
  });
  const [showSettings, setShowSettings] = useState(false);

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      if (!cuePracticeService.current) {
        cuePracticeService.current = new CuePracticeService(
          new AudioService(),
          new ScriptAnalysisService()
        );
      }

      sessionId.current = `cue_${Date.now()}`;
      const session = await cuePracticeService.current.initializeSession(
        sessionId.current,
        scriptId,
        userRole,
        settings
      );

      setStats(session.stats);
      triggerNextCue();
    };

    initSession();

    return () => {
      if (sessionId.current) {
        cuePracticeService.current?.endSession(sessionId.current);
      }
    };
  }, [scriptId, userRole]);

  const triggerNextCue = async () => {
    if (!sessionId.current || !cuePracticeService.current) return;

    const cue = await cuePracticeService.current.triggerNextCue(
      sessionId.current
    );
    if (cue) {
      setCurrentCue(cue);
      setIsRecording(true);
    } else {
      const finalStats = await cuePracticeService.current.endSession(
        sessionId.current
      );
      if (finalStats && onComplete) {
        onComplete(finalStats);
      }
    }
  };

  const getEmotionColor = (emotion?: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      angry: { bg: "#ff4d4d", text: "#ffffff" },
      sad: { bg: "#4d79ff", text: "#ffffff" },
      happy: { bg: "#4dff4d", text: "#1a1a1a" },
      excited: { bg: "#ffdb4d", text: "#1a1a1a" },
      neutral: { bg: "#e0e0e0", text: "#1a1a1a" },
    };
    return emotion
      ? colors[emotion.toLowerCase()] || colors.neutral
      : colors.neutral;
  };

  return (
    <div className="cue-practice">
      {/* Header */}
      <motion.div
        className="header"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1>Cue Practice Mode</h1>
        <button
          className="settings-toggle"
          onClick={() => setShowSettings(!showSettings)}
        >
          <i className="fas fa-cog" />
        </button>
      </motion.div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="settings-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="settings-grid">
              <label className="setting-item">
                <span>Audio Signal</span>
                <div className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.useAudioSignal}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        useAudioSignal: e.target.checked,
                      })
                    }
                  />
                  <span className="slider" />
                </div>
              </label>
              <label className="setting-item">
                <span>Show Emotions</span>
                <div className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.showEmotionIndicators}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        showEmotionIndicators: e.target.checked,
                      })
                    }
                  />
                  <span className="slider" />
                </div>
              </label>
              <label className="setting-item">
                <span>Auto-Advance</span>
                <div className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.autoAdvance}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        autoAdvance: e.target.checked,
                      })
                    }
                  />
                  <span className="slider" />
                </div>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar */}
      {stats && (
        <motion.div
          className="progress-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="progress-bar">
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{
                width: `${(stats.completedCues / stats.totalCues) * 100}%`,
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="progress-text">
            {stats.completedCues} / {stats.totalCues} Cues
          </div>
        </motion.div>
      )}

      {/* Cue Display */}
      <AnimatePresence mode="wait">
        {currentCue && (
          <motion.div
            key={currentCue.id}
            className="cue-display"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="cue-header">
              {settings.showEmotionIndicators && currentCue.emotion && (
                <div
                  className="emotion-badge"
                  style={{
                    backgroundColor: getEmotionColor(currentCue.emotion).bg,
                    color: getEmotionColor(currentCue.emotion).text,
                  }}
                >
                  {currentCue.emotion}
                </div>
              )}
              <div className="cue-type">
                {currentCue.type === "direction" ? "🎬" : "🗣️"}{" "}
                {currentCue.type}
              </div>
            </div>
            <div className="cue-text">{currentCue.text}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <motion.div
        className="controls"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <button
          className={`control-button ${isRecording ? "recording" : ""}`}
          onClick={triggerNextCue}
          disabled={!currentCue || isRecording}
        >
          {isRecording ? (
            <>
              <span className="recording-indicator" />
              Recording...
            </>
          ) : (
            "Next Cue"
          )}
        </button>
      </motion.div>

      {/* Stats Panel */}
      {stats && (
        <motion.div
          className="stats-panel"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <div className="stat-card">
            <div className="stat-label">Timing Score</div>
            <div className="stat-value">
              {(
                (stats.timingScores.reduce((a, b) => a + b, 0) /
                  stats.timingScores.length) *
                100
              ).toFixed(1)}
              %
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Emotion Matches</div>
            <div className="stat-value">
              {stats.emotionMatches} / {stats.completedCues}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Average Delay</div>
            <div className="stat-value">{stats.averageDelay.toFixed(0)}ms</div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CuePractice;
