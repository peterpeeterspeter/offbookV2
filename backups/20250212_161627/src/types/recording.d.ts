export interface RecordingTiming {
    start: number;
    end: number;
}
export interface RecordingResult {
    accuracy: number;
    duration: number;
    timing: RecordingTiming;
    transcription: string;
}
