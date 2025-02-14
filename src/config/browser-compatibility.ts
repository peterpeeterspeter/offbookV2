export const BROWSER_SUPPORT = {
  minimumVersions: {
    chrome: '80',
    firefox: '75',
    safari: '13',
    edge: '80',
    'mobile-safari': '13',
    'mobile-chrome': '80'
  },
  requiredFeatures: {
    webRTC: ['getUserMedia', 'RTCPeerConnection'],
    audioAPI: ['AudioContext', 'MediaRecorder', 'AudioWorklet'],
    storage: ['IndexedDB', 'localStorage'],
    pwa: ['serviceWorker', 'webManifest'],
    webSocket: ['WebSocket']
  },
  fallbacks: {
    audioProcessing: {
      worklet: 'scriptProcessor',
      webm: ['mp4', 'wav'],
      opus: ['aac', 'mp3']
    },
    storage: {
      indexedDB: 'localStorage',
      webSQL: 'indexedDB'
    },
    webRTC: {
      peerConnection: 'webSocket',
      dataChannel: 'webSocket'
    }
  },
  mobileOptimizations: {
    batteryAware: true,
    reducedSampleRate: 22050,
    maxAudioLength: 300, // 5 minutes
    backgroundProcessing: false,
    offlineSupport: true
  }
}
