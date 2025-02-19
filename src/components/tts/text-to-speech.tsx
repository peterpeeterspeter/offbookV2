import React, { useEffect, useState } from "react";
import { useTTS } from "../../hooks/useTTS";

const { isLoading, isPlaying, error, generateSpeech, stopAudio } = useTTS({
  apiKey,
  defaultVoiceId: defaultOptions?.voice,
  defaultModelId: defaultOptions?.model,
  onStart,
  onComplete,
  onError,
});

// ... rest of the code ...
