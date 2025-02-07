export interface Scene {
  id: string;
  name: string;
  actors: string[];
  lines: Line[];
  transitions: {
    next: string | null;
    prev: string | null;
  };
}

export interface Line {
  id: string;
  actorId: string;
  text: string;
  timing: number;
}

export interface Actor {
  id: string;
  name: string;
  roles: string[];
}

export interface SceneProgress {
  sceneId: string;
  completedLines: string[];
  timestamp: number;
}

export interface LinePerformance {
  duration: number;
  accuracy: number;
  emotion: string;
}

export interface PerformanceMetrics {
  lines: {
    [lineId: string]: {
      duration: number;
      accuracy: number;
      emotion: string;
      attempts: number;
    };
  };
}

export class SceneManagementService {
  private scenes: Scene[] = [];
  private actors: Map<string, Actor> = new Map();
  private currentSceneIndex: number = 0;
  private progress: Map<string, SceneProgress> = new Map();
  private performance: Map<string, PerformanceMetrics> = new Map();
  private availableActors: Set<string> = new Set();

  constructor() {
    this.loadProgress();
  }

  public async loadScenes(scenes: Scene[]): Promise<void> {
    if (!scenes.length) {
      throw new Error('No scenes provided');
    }

    // Validate scenes
    scenes.forEach(scene => {
      if (!this.isValidScene(scene)) {
        throw new Error('Invalid scene structure');
      }
    });

    // Validate transitions
    scenes.forEach(scene => {
      if (scene.transitions.next && !scenes.find(s => s.id === scene.transitions.next)) {
        throw new Error('Invalid scene transition');
      }
    });

    this.scenes = scenes;
    this.currentSceneIndex = 0;
  }

  public async loadActors(actors: Actor[]): Promise<void> {
    if (!this.isValidActorList(actors)) {
      throw new Error('Invalid actor data');
    }

    this.actors.clear();
    this.availableActors.clear();

    actors.forEach(actor => {
      this.actors.set(actor.id, actor);
      this.availableActors.add(actor.id);
    });
  }

  public getScenesCount(): number {
    return this.scenes.length;
  }

  public getCurrentScene(): Scene | null {
    return this.scenes[this.currentSceneIndex] || null;
  }

  public nextScene(): void {
    const currentScene = this.getCurrentScene();
    if (!currentScene?.transitions.next) {
      throw new Error('No next scene available');
    }
    const nextIndex = this.scenes.findIndex(s => s.id === currentScene.transitions.next);
    if (nextIndex === -1) {
      throw new Error('Invalid scene transition');
    }
    this.currentSceneIndex = nextIndex;
  }

  public previousScene(): void {
    const currentScene = this.getCurrentScene();
    if (!currentScene?.transitions.prev) {
      throw new Error('No previous scene available');
    }
    const prevIndex = this.scenes.findIndex(s => s.id === currentScene.transitions.prev);
    if (prevIndex === -1) {
      throw new Error('Invalid scene transition');
    }
    this.currentSceneIndex = prevIndex;
  }

  public hasNextScene(): boolean {
    const currentScene = this.getCurrentScene();
    return Boolean(currentScene?.transitions.next);
  }

  public hasPreviousScene(): boolean {
    const currentScene = this.getCurrentScene();
    return Boolean(currentScene?.transitions.prev);
  }

  public isActorAvailable(actorId: string): boolean {
    return this.availableActors.has(actorId);
  }

  public setActorUnavailable(actorId: string): void {
    this.availableActors.delete(actorId);
  }

  public reassignActor(fromActorId: string, toActorId: string, lineIds: string[]): void {
    if (!this.actors.has(fromActorId) || !this.actors.has(toActorId)) {
      throw new Error('Invalid actor ID');
    }

    const currentScene = this.getCurrentScene();
    if (!currentScene) return;

    currentScene.lines
      .filter(line => lineIds.includes(line.id))
      .forEach(line => {
        if (line.actorId === fromActorId) {
          line.actorId = toActorId;
        }
      });
  }

  public updateProgress(progress: SceneProgress): void {
    const existing = this.progress.get(progress.sceneId);
    if (existing) {
      existing.completedLines = [...new Set([...existing.completedLines, ...progress.completedLines])];
      existing.timestamp = progress.timestamp;
    } else {
      this.progress.set(progress.sceneId, { ...progress });
    }
    this.saveProgress();
  }

  public getSceneProgress(sceneId: string): SceneProgress | null {
    return this.progress.get(sceneId) || null;
  }

  public recordLinePerformance(lineId: string, performance: LinePerformance): void {
    const currentScene = this.getCurrentScene();
    if (!currentScene) return;

    const metrics = this.performance.get(currentScene.id) || { lines: {} };
    const line = metrics.lines[lineId] || { attempts: 0 };

    metrics.lines[lineId] = {
      duration: performance.duration,
      accuracy: performance.accuracy,
      emotion: performance.emotion,
      attempts: line.attempts + 1
    };

    this.performance.set(currentScene.id, metrics);
  }

  public getPerformanceMetrics(sceneId: string): PerformanceMetrics | null {
    return this.performance.get(sceneId) || null;
  }

  public getScenePerformanceSummary(sceneId: string): { averageAccuracy: number } {
    const metrics = this.performance.get(sceneId);
    if (!metrics) return { averageAccuracy: 0 };

    const accuracies = Object.values(metrics.lines).map(line => line.accuracy);
    const average = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
    return { averageAccuracy: average };
  }

  public getPerformanceIssues(sceneId: string): string[] {
    const issues: string[] = [];
    const metrics = this.performance.get(sceneId);
    if (!metrics) return issues;

    Object.entries(metrics.lines).forEach(([lineId, performance]) => {
      if (performance.duration > 1500) {
        issues.push(`Timing issues detected in ${lineId}`);
      }
      if (performance.accuracy < 0.7) {
        issues.push(`Accuracy issues detected in ${lineId}`);
      }
    });

    return issues;
  }

  public async loadProgress(): Promise<Record<string, SceneProgress>> {
    try {
      const progressData = localStorage.getItem('scene-progress');
      if (!progressData) {
        return {};
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(progressData);
      } catch (e) {
        console.warn('Failed to parse progress data:', e);
        localStorage.removeItem('scene-progress'); // Remove corrupt data
        return {};
      }

      // Validate parsed data structure
      if (!this.isValidProgressData(parsed)) {
        console.warn('Invalid progress data format found, resetting progress');
        localStorage.removeItem('scene-progress');
        return {};
      }

      // Convert the parsed data into Map entries
      this.progress.clear(); // Clear existing data
      for (const [sceneId, progress] of Object.entries(parsed)) {
        if (this.scenes.find(s => s.id === sceneId)) { // Only load progress for existing scenes
          this.progress.set(sceneId, progress);
        }
      }

      return parsed;
    } catch (e) {
      console.error('Error loading progress from storage:', e);
      return {};
    }
  }

  public async saveProgress(progress?: Record<string, SceneProgress>): Promise<void> {
    try {
      const dataToSave = progress || Object.fromEntries(this.progress.entries());

      // Validate data before saving
      if (!this.isValidProgressData(dataToSave)) {
        throw new Error('Invalid progress data format');
      }

      try {
        const serialized = JSON.stringify(dataToSave);
        localStorage.setItem('scene-progress', serialized);
      } catch (e) {
        if (e instanceof Error && e.name === 'QuotaExceededError') {
          console.warn('Storage quota exceeded, attempting cleanup...');
          await this.cleanupOldProgress();
          // Retry save with cleaned up data
          const retryData = progress || Object.fromEntries(this.progress.entries());
          localStorage.setItem('scene-progress', JSON.stringify(retryData));
        } else {
          throw e;
        }
      }
    } catch (e) {
      console.error('Failed to save progress to storage:', e);
      // Don't throw - we want to fail gracefully and not disrupt the user experience
    }
  }

  private async cleanupOldProgress(): Promise<void> {
    try {
      const progress = await this.loadProgress();
      const now = Date.now();

      // Keep only recent progress (last 30 days) and current scene progress
      const currentSceneId = this.getCurrentScene()?.id;
      const cleanedProgress = Object.entries(progress).reduce((acc, [key, value]) => {
        if (key === currentSceneId || now - value.timestamp < 30 * 24 * 60 * 60 * 1000) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, SceneProgress>);

      // Try to save cleaned progress
      try {
        localStorage.setItem('scene-progress', JSON.stringify(cleanedProgress));
      } catch (e) {
        // If still failing, keep only current scene progress
        if (currentSceneId && progress[currentSceneId]) {
          localStorage.setItem('scene-progress', JSON.stringify({
            [currentSceneId]: progress[currentSceneId]
          }));
        } else {
          // Last resort: clear all progress
          localStorage.removeItem('scene-progress');
        }
      }
    } catch (e) {
      console.error('Failed to cleanup old progress:', e);
      // Last resort: clear all progress
      localStorage.removeItem('scene-progress');
    }
  }

  private isValidProgressData(data: unknown): data is Record<string, SceneProgress> {
    if (!data || typeof data !== 'object') return false;

    try {
      for (const [key, value] of Object.entries(data)) {
        if (typeof key !== 'string') return false;
        if (!value || typeof value !== 'object') return false;
        if (!('sceneId' in value) || typeof value.sceneId !== 'string') return false;
        if (!('completedLines' in value) || !Array.isArray(value.completedLines)) return false;
        if (!('timestamp' in value) || typeof value.timestamp !== 'number') return false;

        // Validate completedLines array
        if (!value.completedLines.every((line: unknown) => typeof line === 'string')) return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  private isValidScene(scene: Scene): boolean {
    return Boolean(
      scene.id &&
      scene.name &&
      Array.isArray(scene.actors) &&
      Array.isArray(scene.lines) &&
      scene.transitions &&
      typeof scene.transitions.next === 'string' || scene.transitions.next === null &&
      typeof scene.transitions.prev === 'string' || scene.transitions.prev === null
    );
  }

  private isValidActorList(actors: Actor[]): boolean {
    return actors.every(actor =>
      actor.id &&
      actor.name &&
      Array.isArray(actor.roles)
    );
  }
}
