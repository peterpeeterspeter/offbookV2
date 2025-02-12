import { vi } from "vitest";

export const ScriptAnalysisService = {
  current: {
    analyzeEmotion: vi.fn().mockResolvedValue({ joy: 0.8 }),
  },
  initialize: vi.fn().mockImplementation(() => {
    return {
      analyzeEmotion: vi.fn().mockResolvedValue({ joy: 0.8 }),
    };
  }),
};
