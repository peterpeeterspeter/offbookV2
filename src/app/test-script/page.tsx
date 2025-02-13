"use client";

import { useState } from "react";
import { ScriptProcessingService } from "@/services/script-processing";

export default function TestScript() {
  const [scriptContent, setScriptContent] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const scriptService = new ScriptProcessingService();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Parse the script
      const parseResult = scriptService.parseScript(scriptContent);
      if (!parseResult.success) {
        setError(`Parse error: ${parseResult.errors.join(", ")}`);
        setResult(null);
        return;
      }

      // Validate the script
      const validateResult = scriptService.validateScript(scriptContent);
      if (!validateResult.isValid) {
        setError(`Validation error: ${validateResult.errors.join(", ")}`);
        setResult(null);
        return;
      }

      // Create a version
      const version = scriptService.createVersion(scriptContent);

      setResult({
        parseResult,
        validateResult,
        version,
        versionHistory: scriptService.getVersionHistory(),
      });
      setError(null);
    } catch (err) {
      setError(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      setResult(null);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Script Testing Page</h1>

      <div className="mb-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="script" className="block mb-2">
              Enter your script (Format: # Title v1.0\n## Scene Name\n[Actor]
              Line):
            </label>
            <textarea
              id="script"
              value={scriptContent}
              onChange={(e) => setScriptContent(e.target.value)}
              className="w-full h-64 border p-2 rounded font-mono"
              placeholder="# Romeo and Juliet v1.0&#10;## Act 1 Scene 1&#10;[Romeo] But soft, what light through yonder window breaks?"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Process Script
          </button>
        </form>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">Parse Result:</h2>
            <pre className="bg-gray-100 p-4 rounded mt-2 overflow-auto">
              {JSON.stringify(result.parseResult, null, 2)}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-bold">Version Info:</h2>
            <pre className="bg-gray-100 p-4 rounded mt-2 overflow-auto">
              {JSON.stringify(result.version, null, 2)}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-bold">Version History:</h2>
            <pre className="bg-gray-100 p-4 rounded mt-2 overflow-auto">
              {JSON.stringify(result.versionHistory, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
