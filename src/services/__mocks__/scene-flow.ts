import { AudioService } from "../audio-service";
import { ScriptAnalysisService } from "../script-analysis";
import { vi } from "vitest";

interface SceneFlowInstance {
  audioService: any;
  scriptAnalysisService: any;
  initializeSession: (scriptId: string, userRole: string) => Promise<{
    scenes: Array<{
      id: string;
      number: number;
      title: string;
      description: string;
      dialogue: Array<{
        id: string;
        role: string;
        text: string;
        emotion: string;
      }>;
    }>;
    stats: {
      duration: number;
      accuracy: number;
      emotions: Record<string, number>;
      sceneProgress: Record<string, number>;
      timingScore: number;
      emotionMatchRate: number;
    };
  }>;
  endSession: () => Promise<{
    duration: number;
    accuracy: number;
    emotions: Record<string, number>;
    sceneProgress: Record<string, number>;
    timingScore: number;
    emotionMatchRate: number;
  }>;
  getCurrentScene: () => {
    id: string;
    number: number;
    title: string;
    description: string;
    dialogue: Array<{
      id: string;
      role: string;
      text: string;
      emotion: string;
    }>;
  };
  getStats: () => {
    duration: number;
    accuracy: number;
    emotions: Record<string, number>;
    sceneProgress: Record<string, number>;
    timingScore: number;
    emotionMatchRate: number;
  };
}

const mockScenes = [
  {
    id: "scene1",
    number: 1,
    title: "Scene 1",
    description: "First scene",
    dialogue: [
      {
        id: "line1",
        role: "Romeo",
        text: "First line",
        emotion: "happy",
      },
      {
        id: "line2",
        role: "Romeo",
        text: "Second line",
        emotion: "sad",
      }
    ]
  },
  {
    id: "scene2",
    number: 2,
    title: "Scene 2",
    description: "Second scene",
    dialogue: [
      {
        id: "line3",
        role: "Romeo",
        text: "Third line",
        emotion: "neutral",
      }
    ]
  }
];

const mockStats = {
  duration: 60,
  accuracy: 0.75,
  emotions: {
    happy: 0.3,
    neutral: 0.7,
  },
  sceneProgress: {
    scene1: 0.5,
    scene2: 0,
  },
  timingScore: 0.8,
  emotionMatchRate: 0.7,
};

export const SceneFlowService = {
  current: null as SceneFlowInstance | null,
  initialize: async (audioService: any, scriptAnalysisService: any) => {
    const instance = {
      audioService,
      scriptAnalysisService,
      initializeSession: async (scriptId: string, userRole: string) => {
        // Don't await audioService.startRecording() to avoid delays
        audioService.startRecording();
        return {
          scenes: mockScenes,
          stats: mockStats
        };
      },
      endSession: async () => {
        // Don't await audioService.stopRecording() to avoid delays
        audioService.stopRecording();
        return {
          duration: 120,
          accuracy: 0.85,
          emotions: {
            happy: 0.6,
            neutral: 0.4,
          },
          sceneProgress: {
            scene1: 1,
            scene2: 0.5,
          },
          timingScore: 0.9,
          emotionMatchRate: 0.8,
        };
      },
      getCurrentScene: () => mockScenes[0],
      getStats: () => mockStats,
    };
    SceneFlowService.current = instance;
    return instance;
  }
};
