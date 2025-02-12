import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { SceneManagementService } from '../scene-management';
import type { Scene, Actor, SceneProgress, LinePerformance } from '../scene-management';

// Type-safe test fixtures
const testScenes: Scene[] = [
  {
    id: 'scene1',
    name: 'Opening Scene',
    actors: ['actor1', 'actor2'],
    lines: [
      { id: 'line1', actorId: 'actor1', text: 'Hello', timing: 1000 },
      { id: 'line2', actorId: 'actor2', text: 'Hi there', timing: 1500 }
    ],
    transitions: { next: 'scene2', prev: null }
  },
  {
    id: 'scene2',
    name: 'Second Scene',
    actors: ['actor1', 'actor3'],
    lines: [
      { id: 'line3', actorId: 'actor3', text: 'How are you?', timing: 2000 },
      { id: 'line4', actorId: 'actor1', text: 'Great!', timing: 1000 }
    ],
    transitions: { next: null, prev: 'scene1' }
  }
];

// Ensure we have test scenes
const [firstScene, secondScene] = testScenes;
if (!firstScene || !secondScene) throw new Error('Test scenes not properly initialized');

interface MockStorage {
  storage: Map<string, string>;
  getItem: Mock<[string], string | null>;
  setItem: Mock<[string, string], void>;
  removeItem: Mock<[string], void>;
  clear: Mock<[], void>;
}

const createMockStorage = (): MockStorage => ({
  storage: new Map(),
  getItem: vi.fn((key: string): string | null => mockStorage.storage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string): void => {
    mockStorage.storage.set(key, value);
  }),
  removeItem: vi.fn((key: string): void => {
    mockStorage.storage.delete(key);
  }),
  clear: vi.fn((): void => {
    mockStorage.storage.clear();
  })
});

const mockStorage = createMockStorage();

describe('SceneManagementService', () => {
  let service: SceneManagementService;

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: mockStorage });
    mockStorage.storage.clear();
    service = new SceneManagementService();
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockStorage.storage.clear();
  });

  // Helper function to ensure scene is loaded
  const ensureSceneLoaded = async (scene: Scene): Promise<void> => {
    await service.loadScenes([scene]);
    const loadedScene = service.getCurrentScene();
    if (!loadedScene) throw new Error('Failed to load scene');
  };

  describe('Scene Loading and Navigation', () => {
    it('should load scenes correctly', async () => {
      await service.loadScenes([firstScene]);
      const scene = service.getCurrentScene();
      if (!scene) throw new Error('Scene should be loaded');
      expect(scene.id).toBe('scene1');
    });

    it('should navigate between scenes', async () => {
      await service.loadScenes(testScenes);

      const initialScene = service.getCurrentScene();
      if (!initialScene) throw new Error('Initial scene should be loaded');
      expect(initialScene.id).toBe('scene1');

      service.nextScene();
      const nextScene = service.getCurrentScene();
      if (!nextScene) throw new Error('Next scene should be loaded');
      expect(nextScene.id).toBe('scene2');

      service.previousScene();
      const prevScene = service.getCurrentScene();
      if (!prevScene) throw new Error('Previous scene should be loaded');
      expect(prevScene.id).toBe('scene1');
    });

    it('should handle invalid navigation gracefully', async () => {
      await ensureSceneLoaded(firstScene);
      expect(() => service.previousScene()).not.toThrow();
      expect(service.getCurrentScene()?.id).toBe('scene1');
    });
  });

  describe('Actor Management', () => {
    beforeEach(async () => {
      await ensureSceneLoaded(firstScene);
    });

    it('should reassign lines between actors', () => {
      service.reassignActor('actor1', 'actor2', ['line1']);
      const scene = service.getCurrentScene();
      if (!scene) throw new Error('Scene should be loaded');

      const reassignedLine = scene.lines[0];
      if (!reassignedLine) throw new Error('Line should exist');
      expect(reassignedLine.actorId).toBe('actor2');
    });

    it('should track actor availability', () => {
      expect(service.isActorAvailable('actor1')).toBe(true);
      service.setActorUnavailable('actor1');
      expect(service.isActorAvailable('actor1')).toBe(false);
    });

    it('should handle invalid actor reassignment', () => {
      expect(() => {
        service.reassignActor('nonexistent', 'actor2', ['line1']);
      }).toThrow();
    });
  });

  describe('Performance Tracking', () => {
    const testPerformance: LinePerformance = {
      duration: 1200,
      accuracy: 0.95,
      emotion: 'happy'
    };

    beforeEach(async () => {
      await ensureSceneLoaded(firstScene);
    });

    it('should record line performance', () => {
      service.recordLinePerformance('line1', testPerformance);
      const metrics = service.getPerformanceMetrics('scene1');
      expect(metrics?.lines['line1']?.duration).toBe(1200);
    });

    it('should track multiple attempts', () => {
      service.recordLinePerformance('line1', testPerformance);
      service.recordLinePerformance('line1', { ...testPerformance, accuracy: 0.98 });

      const metrics = service.getPerformanceMetrics('scene1');
      expect(metrics?.lines['line1']?.attempts).toBe(2);
    });
  });

  describe('Progress Management', () => {
    const testProgress: SceneProgress = {
      sceneId: 'scene1',
      completedLines: ['line1'],
      timestamp: Date.now()
    };

    beforeEach(async () => {
      await ensureSceneLoaded(firstScene);
    });

    it('should save and load progress', async () => {
      service.updateProgress(testProgress);
      await service.saveProgress();

      const savedData = mockStorage.storage.get('scene-progress');
      expect(savedData).toBeDefined();

      if (!savedData) throw new Error('Progress should be saved');
      const parsedData = JSON.parse(savedData);
      expect(parsedData.scene1.completedLines).toContain('line1');
    });

    it('should handle corrupt storage data', async () => {
      mockStorage.storage.set('scene-progress', 'invalid-json');
      await expect(service.loadProgress()).rejects.toThrow();
    });
  });
});
