import { useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import Assets from '../assets.json';

type SoundKey = keyof typeof Assets.audio.sfx;

export const useSound = () => {
  const { isMuted } = useGameStore();
  const audioRefs = useRef<Partial<Record<SoundKey, HTMLAudioElement>>>({});

  // Preload sounds
  useEffect(() => {
    Object.entries(Assets.audio.sfx).forEach(([key, asset]) => {
      const audio = new Audio(asset.url);
      audio.volume = 0.5; // Default volume
      audioRefs.current[key as SoundKey] = audio;
    });

    return () => {
      // Cleanup
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      audioRefs.current = {};
    };
  }, []);

  const playSound = useCallback((key: SoundKey) => {
    if (isMuted) return;

    const audio = audioRefs.current[key];
    if (audio) {
      // Clone node for overlapping sounds or reset time
      audio.currentTime = 0;
      audio.play().catch(err => console.warn(`Failed to play sound ${key}:`, err));
    }
  }, [isMuted]);

  return { playSound };
};
