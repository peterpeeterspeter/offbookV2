"use client"

import React from 'react';
import { PracticeRoom } from '@/components/practice-room';

export default function PracticePage() {
  const handleError = (error: Error) => {
    console.error('Practice room error:', error);
  };

  return (
    <main className="container mx-auto p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">AI Actor Practice</h1>
        <PracticeRoom
          userName={`Actor_${Math.random().toString(36).slice(2, 7)}`}
          onError={handleError}
        />
      </div>
    </main>
  );
} 