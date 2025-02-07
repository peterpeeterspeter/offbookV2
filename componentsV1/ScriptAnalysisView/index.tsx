import React, { useState } from 'react'
import type { ScriptAnalysis, SceneInfo, CharacterInfo } from '../../services/scriptAnalysis'

interface ScriptAnalysisViewProps {
  analysis: ScriptAnalysis
  onSceneSelect?: (scene: SceneInfo) => void
  onCharacterSelect?: (character: CharacterInfo) => void
  className?: string
}

export const ScriptAnalysisView: React.FC<ScriptAnalysisViewProps> = ({
  analysis,
  onSceneSelect,
  onCharacterSelect,
  className
}) => {
  const [activeTab, setActiveTab] = useState<'scenes' | 'characters' | 'emotions'>('scenes')

  const renderScenes = () => (
    <div className="space-y-4">
      {analysis.scenes.map(scene => (
        <div
          key={scene.id}
          className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onSceneSelect?.(scene)}
        >
          <h3 className="text-lg font-semibold">{scene.title}</h3>
          {scene.description && (
            <p className="text-gray-600 mt-1">{scene.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {scene.characters.map(character => (
              <span
                key={character}
                className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {character}
              </span>
            ))}
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Lines {scene.startLine} - {scene.endLine}
          </div>
        </div>
      ))}
    </div>
  )

  const renderCharacters = () => (
    <div className="space-y-4">
      {analysis.characters.map(character => (
        <div
          key={character.name}
          className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onCharacterSelect?.(character)}
        >
          <h3 className="text-lg font-semibold">{character.name}</h3>
          <div className="mt-2 text-sm text-gray-600">
            {character.lines} lines
          </div>
          <div className="mt-2">
            <h4 className="text-sm font-medium text-gray-700">Dominant Emotions:</h4>
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.entries(character.emotions)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([emotion, count]) => (
                  <span
                    key={emotion}
                    className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                  >
                    {emotion} ({count})
                  </span>
                ))}
            </div>
          </div>
          <div className="mt-2">
            <h4 className="text-sm font-medium text-gray-700">Relationships:</h4>
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.entries(character.relationships).map(([name, relation]) => (
                <span
                  key={name}
                  className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                >
                  {name}: {relation}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderEmotions = () => (
    <div className="space-y-4">
      {analysis.emotionSuggestions.map((suggestion, index) => (
        <div
          key={`${suggestion.line}-${index}`}
          className="p-4 bg-white rounded-lg shadow"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="text-gray-800">{suggestion.text}</p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
                >
                  {suggestion.emotion}
                </span>
                <span className="text-sm text-gray-500">
                  Intensity: {suggestion.intensity}%
                </span>
                <span className="text-sm text-gray-500">
                  Confidence: {suggestion.confidence}%
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Line {suggestion.line}
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className={`space-y-4 ${className || ''}`}>
      <div className="flex gap-2 border-b border-gray-200">
        {(['scenes', 'characters', 'emotions'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {activeTab === 'scenes' && renderScenes()}
        {activeTab === 'characters' && renderCharacters()}
        {activeTab === 'emotions' && renderEmotions()}
      </div>
    </div>
  )
} 