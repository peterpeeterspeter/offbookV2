import { describe, it, expect, beforeEach } from 'vitest';
import { ScriptProcessingService } from '../../src/services/script-processing';
import * as fs from 'fs';
import * as path from 'path';

describe('ScriptProcessingService', () => {
  let service: ScriptProcessingService;
  let sampleScript: string;

  beforeEach(() => {
    service = new ScriptProcessingService();
    sampleScript = fs.readFileSync(path.join(__dirname, 'sample.txt'), 'utf-8');
  });

  describe('parseScript', () => {
    it('should parse a valid script correctly', () => {
      const result = service.parseScript(sampleScript);
      expect(result.success).toBe(true);
      expect(result.script).toBeDefined();
      expect(result.script?.title).toBe('Romeo and Juliet');
      expect(result.script?.version).toBe('1.0');
      expect(result.script?.scenes).toHaveLength(2);
      expect(result.script?.actors).toHaveLength(3);
      expect(result.script?.actors).toContain('Romeo');
      expect(result.script?.actors).toContain('Juliet');
      expect(result.script?.actors).toContain('Nurse');
    });

    it('should handle empty scripts', () => {
      const result = service.parseScript('');
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Empty script');
    });

    it('should handle invalid script format', () => {
      const result = service.parseScript('Invalid content\nNo proper structure');
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('validateScript', () => {
    it('should validate a correct script', () => {
      const result = service.validateScript(sampleScript);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing title', () => {
      const invalidScript = '## Scene 1\n[Actor] Line';
      const result = service.validateScript(invalidScript);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing title');
    });

    it('should detect duplicate scene names', () => {
      const invalidScript = '# Title v1.0\n## Scene 1\n[Actor] Line\n## Scene 1\n[Actor] Line';
      const result = service.validateScript(invalidScript);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duplicate scene names');
    });
  });

  describe('version control', () => {
    it('should create and track versions', () => {
      const version1 = service.createVersion(sampleScript);
      expect(version1.version).toBe('1.0');

      const modifiedScript = sampleScript + '\n[Romeo] A new line!';
      const version2 = service.createVersion(modifiedScript);
      expect(version2.version).toBe('1.1');

      const history = service.getVersionHistory();
      expect(history).toHaveLength(2);
    });

    it('should compare versions correctly', () => {
      const version1 = service.createVersion(sampleScript);
      const modifiedScript = sampleScript.replace('Act 1 Scene 2', 'Act 1 Scene 3');
      const version2 = service.createVersion(modifiedScript);

      const diff = service.compareVersions(version1, version2);
      expect(diff.changes).toBeDefined();
      expect(diff.changes.some(change =>
        change.type === 'deletion' &&
        change.element === 'scene' &&
        change.details === 'Act 1 Scene 2'
      )).toBe(true);
      expect(diff.changes.some(change =>
        change.type === 'addition' &&
        change.element === 'scene' &&
        change.details === 'Act 1 Scene 3'
      )).toBe(true);
    });

    it('should handle rollback to previous version', () => {
      const version1 = service.createVersion(sampleScript);
      const modifiedScript = sampleScript + '\n[Romeo] A new line!';
      service.createVersion(modifiedScript);

      const rollback = service.rollbackToVersion(version1.id);
      expect(rollback.success).toBe(true);

      const current = service.getCurrentVersion();
      expect(current.content).toBe(sampleScript);
    });
  });
});
