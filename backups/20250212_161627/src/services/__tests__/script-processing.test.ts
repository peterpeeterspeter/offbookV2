import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScriptProcessingService, Script, ScriptVersion, ValidationResult } from '../script-processing';

const validScript = `
# My Script v1.0
## Scene 1: Opening
[John] Hello there!
[Sarah] Hi John, how are you?
## Scene 2: Confrontation
[John] We need to talk.
[Sarah] What's wrong?
`;

const invalidScript = `
Invalid Format
No proper structure
Just random text
`;

describe('Script Processing Service', () => {
  let service: ScriptProcessingService;

  beforeEach(() => {
    service = new ScriptProcessingService();
  });

  describe('Script Parsing', () => {
    it('should parse valid script format', () => {
      const result = service.parseScript(validScript);
      expect(result.success).toBe(true);
      expect(result.script?.version).toBe('1.0');
      expect(result.script?.scenes).toHaveLength(2);
      expect(result.script?.scenes[0].lines).toHaveLength(2);
    });

    it('should extract metadata', () => {
      const result = service.parseScript(validScript);
      expect(result.script?.title).toBe('My Script');
      expect(result.script?.metadata).toEqual({
        version: '1.0',
        sceneCount: 2,
        actorCount: 2
      });
    });

    it('should identify actors', () => {
      const result = service.parseScript(validScript);
      expect(result.script?.actors).toContain('John');
      expect(result.script?.actors).toContain('Sarah');
    });

    it('should handle empty script', () => {
      const result = service.parseScript('');
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Empty script');
    });

    it('should parse scene transitions', () => {
      const result = service.parseScript(validScript);
      expect(result.script?.scenes[0].transitions.next).toBe('Scene 2: Confrontation');
      expect(result.script?.scenes[1].transitions.prev).toBe('Scene 1: Opening');
    });
  });

  describe('Format Validation', () => {
    it('should validate script structure', () => {
      const validation = service.validateScript(validScript);
      expect(validation.isValid).toBe(true);
    });

    it('should detect missing scene headers', () => {
      const badScript = `
      [John] Line without scene
      [Sarah] Another line without scene
      `;
      const validation = service.validateScript(badScript);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Missing scene headers');
    });

    it('should validate actor declarations', () => {
      const badScript = `
      ## Scene 1
      John: Missing brackets
      [Sarah] Correct format
      `;
      const validation = service.validateScript(badScript);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid actor declaration format');
    });

    it('should check for duplicate scene names', () => {
      const duplicateScript = `
      ## Scene 1
      [John] Hello
      ## Scene 1
      [Sarah] Hi
      `;
      const validation = service.validateScript(duplicateScript);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Duplicate scene names');
    });

    it('should validate version format', () => {
      const badVersion = `
      # My Script v1
      ## Scene 1
      [John] Hello
      `;
      const validation = service.validateScript(badVersion);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid version format');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed script', () => {
      const result = service.parseScript(invalidScript);
      expect(result.success).toBe(false);
      expect(result.errors).toBeTruthy();
    });

    it('should provide detailed error messages', () => {
      const result = service.parseScript(invalidScript);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('line'),
        expect.stringContaining('format')
      ]));
    });

    it('should handle syntax errors', () => {
      const syntaxError = `
      ## Scene 1
      [Unclosed bracket Hello
      `;
      const result = service.parseScript(syntaxError);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Syntax error: Unclosed actor bracket');
    });

    it('should validate scene transitions', () => {
      const invalidTransitions = `
      ## Scene 1
      [John] Hello
      ## Scene 3
      [Sarah] Hi
      `;
      const validation = service.validateScript(invalidTransitions);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid scene sequence');
    });
  });

  describe('Version Control', () => {
    it('should track script versions', () => {
      const v1 = service.createVersion(validScript);
      expect(v1.version).toBe('1.0');
      expect(v1.timestamp).toBeDefined();
    });

    it('should compare script versions', () => {
      const v1 = service.createVersion(validScript);
      const v2 = service.createVersion(validScript.replace('Hello there!', 'Hi there!'));
      const diff = service.compareVersions(v1, v2);
      expect(diff.changes).toHaveLength(1);
      expect(diff.changes[0].type).toBe('modification');
    });

    it('should detect structural changes', () => {
      const v1 = service.createVersion(validScript);
      const v2 = service.createVersion(validScript + '\n## Scene 3\n[John] New scene');
      const diff = service.compareVersions(v1, v2);
      expect(diff.changes).toContain(expect.objectContaining({
        type: 'addition',
        element: 'scene'
      }));
    });

    it('should maintain version history', () => {
      service.createVersion(validScript);
      service.createVersion(validScript.replace('Hello there!', 'Hi there!'));
      const history = service.getVersionHistory();
      expect(history).toHaveLength(2);
      expect(history[0].version).toBe('1.0');
      expect(history[1].version).toBe('1.1');
    });

    it('should support version rollback', () => {
      const v1 = service.createVersion(validScript);
      service.createVersion(validScript.replace('Hello there!', 'Hi there!'));
      const rollback = service.rollbackToVersion(v1.id);
      expect(rollback.success).toBe(true);
      expect(service.getCurrentVersion().content).toBe(validScript);
    });
  });
});
