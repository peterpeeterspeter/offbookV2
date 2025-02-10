import { vi } from "vitest";

export const SceneFlowService = {
  current: {
    initializeSession: vi.fn().mockResolvedValue({
      scenes: [
        {
          id: "1",
          title: "Scene 1",
          description: "First scene",
          startLine: 1,
          endLine: 10,
          characters: ["Romeo"],
          dialogue: [],
        },
      ],
      stats: {
        duration: 0,
        accuracy: 0,
        emotions: {},
        sceneProgress: {},
        timingScore: 0,
        emotionMatchRate: 0,
      },
    }),
    endSession: vi.fn(),
  },
};
