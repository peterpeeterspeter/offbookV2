import React, { useState, useEffect } from 'react';
import { EmotionHighlighter } from './components/EmotionHighlighter';
import { CacheMetricsDisplay } from './components/CacheMetricsDisplay';
import { CollaborationProvider, useCollaboration } from './contexts/CollaborationContext';
import { responseCache } from './services/deepseek';
import { Emotion } from './types';
import { ScriptUploader } from './components/ScriptUploader';
import { ScriptAnalysisView } from './components/ScriptAnalysisView';
import type { ScriptAnalysis, SceneInfo, CharacterInfo } from './services/scriptAnalysis';
import { WebSocketProvider } from './contexts/WebSocketContext'

// Collaboration UI component
const CollaborationPanel: React.FC = () => {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const { isConnected, collaborators, connect, disconnect } = useCollaboration();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId && username) {
      connect(roomId, username);
    }
  };

  return (
    <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Collaboration</h3>
      
      {!isConnected ? (
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Room ID</label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>
          <button
            type="submit"
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Join Room
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-500">Connected as:</span>
              <span className="ml-2 font-medium">{username}</span>
            </div>
            <button
              onClick={disconnect}
              className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Leave Room
            </button>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Collaborators</h4>
            <div className="space-y-2">
              {Array.from(collaborators.entries()).map(([userId, data]) => (
                <div
                  key={userId}
                  className="flex items-center space-x-2 text-sm"
                >
                  <div className="h-2 w-2 rounded-full bg-green-400" />
                  <span>{data.username}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface AppState {
  content: string;
  rateLimited: boolean;
  ttsEnabled: boolean;
  sttEnabled: boolean;
  lastEmotion: {
    text: string;
    emotion: string;
    source: 'API' | 'Cache' | 'Local';
  } | null;
  scriptAnalysis: ScriptAnalysis | null;
  selectedScene: SceneInfo | null;
  selectedCharacter: CharacterInfo | null;
}

// Main App component
function App() {
  const [state, setState] = useState<AppState>({
    content: 'Select text to analyze its emotional content.',
    rateLimited: false,
    ttsEnabled: false,
    sttEnabled: false,
    lastEmotion: null,
    scriptAnalysis: null,
    selectedScene: null,
    selectedCharacter: null
  });

  const [autoSuggest, setAutoSuggest] = useState(true);
  const [metrics, setMetrics] = useState(responseCache.getMetrics());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(responseCache.getMetrics());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleEmotionSelect = (text: string, emotion: string, error?: string) => {
    if (error) {
      setState(prev => ({
        ...prev,
        rateLimited: error.includes('rate limit')
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      lastEmotion: {
        text,
        emotion,
        source: prev.rateLimited ? 'Local' : 'API'
      },
      rateLimited: false
    }));
  };

  const handleAnalysisComplete = (analysis: ScriptAnalysis) => {
    setState(prev => ({
      ...prev,
      scriptAnalysis: analysis,
      content: analysis.scenes[0]?.description || prev.content
    }));
  };

  const handleSceneSelect = (scene: SceneInfo) => {
    setState(prev => ({
      ...prev,
      selectedScene: scene,
      selectedCharacter: null,
      content: scene.description || prev.content
    }));
  };

  const handleCharacterSelect = (character: CharacterInfo) => {
    setState(prev => ({
      ...prev,
      selectedCharacter: character,
      selectedScene: null
    }));
  };

  const handleError = (error: string) => {
    console.error('Error:', error);
    // You could add a toast notification here
  };

  const toggleTTS = () => {
    setState(prev => ({ ...prev, ttsEnabled: !prev.ttsEnabled }));
  };

  const toggleSTT = () => {
    setState(prev => ({ ...prev, sttEnabled: !prev.sttEnabled }));
  };

  return (
    <WebSocketProvider>
      <CollaborationProvider wsUrl={process.env.REACT_APP_WS_URL || 'ws://localhost:8080'}>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="mx-auto max-w-3xl px-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              Offbook - Script Practice
            </h1>

            <div className="mb-6 flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoSuggest}
                  onChange={(e) => setAutoSuggest(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Auto-suggest emotions</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={state.ttsEnabled}
                  onChange={toggleTTS}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Enable text-to-speech</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={state.sttEnabled}
                  onChange={toggleSTT}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Enable speech-to-text</span>
              </label>
            </div>

            <CollaborationPanel />
            
            <div className="mb-6">
              <CacheMetricsDisplay {...metrics} />
            </div>

            {state.rateLimited && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
                Rate limit reached. Using local analysis.
              </div>
            )}

            {state.lastEmotion && (
              <div className="p-4 bg-gray-100 rounded">
                <h2 className="font-semibold mb-2">Last Analysis:</h2>
                <p>Text: "{state.lastEmotion.text}"</p>
                <p>Emotion: {state.lastEmotion.emotion}</p>
                <p>Source: {state.lastEmotion.source}</p>
              </div>
            )}

            <div className="bg-white rounded-lg p-6 shadow-lg">
              <ScriptUploader
                onAnalysisComplete={handleAnalysisComplete}
                onError={handleError}
                className="mb-6"
              />
              
              <EmotionHighlighter
                content={state.content}
                onContentChange={(content) => setState(prev => ({ ...prev, content }))}
                onSelect={handleEmotionSelect}
                enableTTS={state.ttsEnabled}
                enableSTT={state.sttEnabled}
                className="min-h-[200px]"
              />

              {state.scriptAnalysis && (
                <ScriptAnalysisView
                  analysis={state.scriptAnalysis}
                  onSceneSelect={handleSceneSelect}
                  onCharacterSelect={handleCharacterSelect}
                />
              )}
            </div>
          </div>
        </div>
      </CollaborationProvider>
    </WebSocketProvider>
  );
}

export default App; 