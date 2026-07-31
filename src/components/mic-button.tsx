import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useRecorder } from '@/hooks/use-recorder';
import { useTheme } from '@/hooks/use-theme';
import { transcribeAudio } from '@/lib/api';

// Primary voice input. Tap to record, tap again to stop; the clip is sent to
// Whisper and the transcription is handed back through onTranscribed. Renders
// nothing on platforms where recording is not supported, so typing still works.
export function MicButton({
  onTranscribed,
  onError,
  disabled,
}: {
  onTranscribed: (text: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const recorder = useRecorder();
  const [transcribing, setTranscribing] = useState(false);

  if (!recorder.isSupported) return null;

  const onPress = async () => {
    if (transcribing) return;

    if (recorder.isRecording) {
      setTranscribing(true);
      try {
        const clip = await recorder.stop();
        if (clip) {
          const text = await transcribeAudio(clip.base64, clip.mime);
          if (text.trim()) onTranscribed(text.trim());
          else onError?.('I did not catch that. Try again.');
        }
      } catch (e) {
        onError?.(e instanceof Error ? e.message : 'Could not transcribe that. Try again.');
      } finally {
        setTranscribing(false);
      }
      return;
    }

    try {
      await recorder.start();
    } catch {
      onError?.('Microphone access was blocked. Allow it in your browser and try again.');
    }
  };

  const recording = recorder.isRecording;
  const label = transcribing ? 'Transcribing…' : recording ? 'Tap to stop' : 'Tap to speak';
  const backgroundColor = recording ? theme.major : theme.tint;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || transcribing}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.button, { backgroundColor, opacity: disabled ? 0.5 : 1 }]}>
      {transcribing ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Ionicons name={recording ? 'stop' : 'mic'} size={22} color="#fff" />
      )}
      <ThemedText style={styles.label}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
  },
  label: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
