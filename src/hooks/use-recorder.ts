// Microphone recording, abstracted so screens don't know the platform.
// This is the native fallback. When we ship native, add a `use-recorder.native.ts`
// (or extend here) backed by expo-audio; the interface below stays the same and
// the UI does not change. See `use-recorder.web.ts` for the browser version.

export type RecordedClip = { base64: string; mime: string };

export type Recorder = {
  /** Whether recording is available on this platform/environment. */
  isSupported: boolean;
  isRecording: boolean;
  /** Begin capturing from the microphone. */
  start: () => Promise<void>;
  /** Stop and return the clip, or null if nothing was captured. */
  stop: () => Promise<RecordedClip | null>;
  /** Abandon the current recording without producing a clip. */
  cancel: () => void;
};

export function useRecorder(): Recorder {
  return {
    isSupported: false,
    isRecording: false,
    start: async () => {},
    stop: async () => null,
    cancel: () => {},
  };
}
