export interface Script {
  title: string;
  version: string;
  scenes: Scene[];
  actors: string[];
  metadata: {
    version: string;
    sceneCount: number;
    actorCount: number;
  };
}

export interface Scene {
  name: string;
  lines: Line[];
  transitions: {
    next: string | null;
    prev: string | null;
  };
}

export interface Line {
  actor: string;
  text: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ScriptVersion {
  id: string;
  version: string;
  content: string;
  timestamp: number;
}

export interface VersionDiff {
  changes: Array<{
    type: 'addition' | 'deletion' | 'modification';
    element: 'scene' | 'line' | 'actor';
    details?: string;
  }>;
}

export interface ParseResult {
  success: boolean;
  script?: Script;
  errors: string[];
}

export class ScriptProcessingService {
  private versions: ScriptVersion[] = [];
  private currentVersionIndex: number = -1;

  public parseScript(content: string): ParseResult {
    if (!content.trim()) {
      return {
        success: false,
        errors: ['Empty script']
      };
    }

    try {
      const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
      let title = '';
      let version = '';
      const scenes: Scene[] = [];
      const actors = new Set<string>();
      let currentScene: Scene | null = null;
      let hasValidTitle = false;

      for (const line of lines) {
        if (line.startsWith('#') && !line.startsWith('##')) {
          // Title and version
          const match = line.match(/# (.*) v(\d+\.\d+)/);
          if (!match || !match[1] || !match[2]) {
            return {
              success: false,
              errors: ['Invalid title/version format']
            };
          }
          title = match[1];
          version = match[2];
          hasValidTitle = true;
        } else if (line.startsWith('##')) {
          // Scene header
          const sceneName = line.substring(2).trim();
          if (currentScene) {
            currentScene.transitions.next = sceneName;
          }
          const prevSceneName: string | null = currentScene ? currentScene.name : null;
          currentScene = {
            name: sceneName,
            lines: [],
            transitions: {
              next: null,
              prev: prevSceneName
            }
          };
          scenes.push(currentScene);
        } else if (line.match(/^\[.*\]/)) {
          // Actor line
          if (!currentScene) {
            return {
              success: false,
              errors: ['Line outside scene context']
            };
          }
          const match = line.match(/^\[(.*?)\] (.*)/);
          if (!match || !match[1] || !match[2]) {
            return {
              success: false,
              errors: ['Invalid line format']
            };
          }
          const actor = match[1];
          const text = match[2];
          actors.add(actor);
          currentScene.lines.push({ actor, text });
        } else {
          return {
            success: false,
            errors: ['Invalid line format: ' + line]
          };
        }
      }

      if (!hasValidTitle) {
        return {
          success: false,
          errors: ['Missing title and version']
        };
      }

      if (scenes.length === 0) {
        return {
          success: false,
          errors: ['No scenes found in script']
        };
      }

      const script: Script = {
        title,
        version,
        scenes,
        actors: Array.from(actors),
        metadata: {
          version,
          sceneCount: scenes.length,
          actorCount: actors.size
        }
      };

      return {
        success: true,
        script,
        errors: []
      };
    } catch (error) {
      return {
        success: false,
        errors: [(error as Error).message]
      };
    }
  }

  public validateScript(content: string): ValidationResult {
    const errors: string[] = [];

    // Check for empty script
    if (!content.trim()) {
      errors.push('Empty script');
      return { isValid: false, errors };
    }

    const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
    const sceneNames = new Set<string>();
    let hasTitle = false;
    let hasVersion = false;
    let inScene = false;

    for (const line of lines) {
      if (line.startsWith('#') && !line.startsWith('##')) {
        // Title and version check
        const match = line.match(/# (.*) v(\d+\.\d+)/);
        if (!match) {
          errors.push('Invalid version format');
        } else {
          hasTitle = true;
          hasVersion = true;
        }
      } else if (line.startsWith('##')) {
        // Scene header check
        const sceneName = line.substring(2).trim();
        if (sceneNames.has(sceneName)) {
          errors.push('Duplicate scene names');
        }
        sceneNames.add(sceneName);
        inScene = true;
      } else if (line.match(/^\[.*\]/)) {
        // Actor line check
        if (!inScene) {
          errors.push('Line outside scene context');
        }
        if (!line.match(/^\[.*?\] .+/)) {
          errors.push('Invalid actor declaration format');
        }
      } else {
        errors.push('Invalid line format');
      }
    }

    if (!hasTitle) errors.push('Missing title');
    if (!hasVersion) errors.push('Missing version');
    if (sceneNames.size === 0) errors.push('Missing scene headers');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public createVersion(content: string): ScriptVersion {
    const lastVersion = this.versions[this.versions.length - 1];
    const newVersion = lastVersion
      ? this.incrementVersion(lastVersion.version)
      : '1.0';

    const version: ScriptVersion = {
      id: crypto.randomUUID(),
      version: newVersion,
      content,
      timestamp: Date.now()
    };

    this.versions.push(version);
    this.currentVersionIndex = this.versions.length - 1;
    return version;
  }

  public compareVersions(v1: ScriptVersion, v2: ScriptVersion): VersionDiff {
    const script1 = this.parseScript(v1.content).script;
    const script2 = this.parseScript(v2.content).script;

    if (!script1 || !script2) {
      throw new Error('Invalid script versions');
    }

    const changes: VersionDiff['changes'] = [];

    // Compare scenes
    const scenes1 = new Set(script1.scenes.map(s => s.name));
    const scenes2 = new Set(script2.scenes.map(s => s.name));

    for (const scene of scenes2) {
      if (!scenes1.has(scene)) {
        changes.push({
          type: 'addition',
          element: 'scene',
          details: scene
        });
      }
    }

    for (const scene of scenes1) {
      if (!scenes2.has(scene)) {
        changes.push({
          type: 'deletion',
          element: 'scene',
          details: scene
        });
      }
    }

    // Compare actors
    const actors1 = new Set(script1.actors);
    const actors2 = new Set(script2.actors);

    for (const actor of actors2) {
      if (!actors1.has(actor)) {
        changes.push({
          type: 'addition',
          element: 'actor',
          details: actor
        });
      }
    }

    // Compare line modifications
    script1.scenes.forEach(scene1 => {
      const scene2 = script2.scenes.find(s => s.name === scene1.name);
      if (scene2) {
        scene1.lines.forEach((line1, index) => {
          const line2 = scene2.lines[index];
          if (line2 && (line1.text !== line2.text || line1.actor !== line2.actor)) {
            changes.push({
              type: 'modification',
              element: 'line',
              details: `${scene1.name}:${index}`
            });
          }
        });
      }
    });

    return { changes };
  }

  public getVersionHistory(): ScriptVersion[] {
    return [...this.versions];
  }

  public getCurrentVersion(): ScriptVersion {
    const currentVersion = this.versions[this.currentVersionIndex];
    if (this.currentVersionIndex === -1 || !currentVersion) {
      throw new Error('No version history available');
    }
    return currentVersion;
  }

  public rollbackToVersion(versionId: string): { success: boolean; error?: string } {
    const index = this.versions.findIndex(v => v.id === versionId);
    if (index === -1) {
      return {
        success: false,
        error: 'Version not found'
      };
    }

    this.currentVersionIndex = index;
    return { success: true };
  }

  private incrementVersion(version: string): string {
    const [major, minor] = version.split('.').map(Number);
    if (typeof major !== 'number' || typeof minor !== 'number') {
      throw new Error('Invalid version format');
    }
    return `${major}.${minor + 1}`;
  }
}
