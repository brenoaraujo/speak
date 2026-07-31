// Audio playback for a single clip, abstracted from the platform. This is the
// native fallback; `use-playback.web.ts` is the browser version. When we ship
// native, back this with expo-audio and keep the same interface.

export type PlayState = 'idle' | 'loading' | 'playing';

export type Playback = {
  isSupported: boolean;
  state: PlayState;
  /**
   * Toggle playback. `getAudio` is called lazily to fetch the clip the first
   * time it plays, so we only synthesize speech on demand.
   */
  toggle: (getAudio: () => Promise<{ audio: string; mime: string }>) => Promise<void>;
};

export function usePlayback(): Playback {
  return {
    isSupported: false,
    state: 'idle',
    toggle: async () => {},
  };
}
