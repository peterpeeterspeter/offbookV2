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
export declare class ScriptProcessingService {
    private versions;
    private currentVersionIndex;
    parseScript(content: string): ParseResult;
    validateScript(content: string): ValidationResult;
    createVersion(content: string): ScriptVersion;
    compareVersions(v1: ScriptVersion, v2: ScriptVersion): VersionDiff;
    getVersionHistory(): ScriptVersion[];
    getCurrentVersion(): ScriptVersion;
    rollbackToVersion(versionId: string): {
        success: boolean;
        error?: string;
    };
    private incrementVersion;
}
