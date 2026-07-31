// Browser audio playback via the HTML5 Audio element. Same interface as the
// native stub in `use-playback.ts`.
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Playback, PlayState } from './use-playback';

export function usePlayback(): Playback {
  const [state, setState] = useState<PlayState>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isSupported = typeof Audio !== 'undefined';

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  // Stop any in-flight audio if the component unmounts mid-playback.
  useEffect(() => stopAudio, [stopAudio]);

  const toggle = useCallback(
    async (getAudio: () => Promise<{ audio: string; mime: string }>) => {
      if (state === 'loading') return;
      if (state === 'playing') {
        stopAudio();
        setState('idle');
        return;
      }
      setState('loading');
      try {
        const { audio, mime } = await getAudio();
        const el = new Audio(`data:${mime};base64,${audio}`);
        audioRef.current = el;
        el.onended = () => {
          setState('idle');
          stopAudio();
        };
        el.onerror = () => {
          setState('idle');
          stopAudio();
        };
        await el.play();
        setState('playing');
      } catch {
        setState('idle');
        stopAudio();
      }
    },
    [state, stopAudio],
  );

  return { isSupported, state, toggle };
}
