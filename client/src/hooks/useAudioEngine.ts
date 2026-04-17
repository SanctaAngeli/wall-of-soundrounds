import { useRef, useCallback, useState, useEffect } from 'react';
import type { AudioCommand, Stem } from '@shared/types';

interface StemAudio {
  id: number;
  buffer: AudioBuffer;
  gainNode: GainNode;
  source: AudioBufferSourceNode | null;
}

export function useAudioEngine() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const stemsRef = useRef<Map<number, StemAudio>>(new Map());
  const startTimeRef = useRef(0);
  const pausedAtRef = useRef(0);
  const animationFrameRef = useRef(0);
  const isLoadedRef = useRef(false);
  const pendingCommandsRef = useRef<AudioCommand[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const loadSong = useCallback(async (songId: string, stems: Stem[]) => {
    const ctx = initAudioContext();
    // Stop and clean up any existing playback
    stemsRef.current.forEach((stem) => {
      if (stem.source) {
        try { stem.source.stop(); } catch {}
      }
    });
    cancelAnimationFrame(animationFrameRef.current);
    stemsRef.current.clear();
    isLoadedRef.current = false;
    pendingCommandsRef.current = [];
    setIsLoaded(false);
    setIsPlaying(false);
    pausedAtRef.current = 0;

    try {
      const loadPromises = stems.map(async (stem) => {
        const url = `/audio/songs/${songId}/${stem.file}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        const gainNode = ctx.createGain();
        gainNode.connect(ctx.destination);
        gainNode.gain.value = 0; // All muted initially - host controls which play

        stemsRef.current.set(stem.id, {
          id: stem.id,
          buffer: audioBuffer,
          gainNode,
          source: null,
        });
      });

      await Promise.all(loadPromises);
      isLoadedRef.current = true;
      setIsLoaded(true);
      console.log(`[AudioEngine] Song loaded: ${songId} (${stems.length} stems)`);

      // Replay any commands that arrived while loading
      const pending = pendingCommandsRef.current;
      pendingCommandsRef.current = [];
      if (pending.length > 0) {
        console.log(`[AudioEngine] Replaying ${pending.length} pending commands`);
        for (const cmd of pending) {
          handleAudioCommandRef.current(cmd);
        }
      }
    } catch (error) {
      console.error('[AudioEngine] Error loading song:', error);
    }
  }, [initAudioContext]);

  // Load multiple songs at once (for Song in 5 Parts - 3 songs, one per row)
  // Each song's stems already have namespaced IDs (row * 100 + stemId)
  const loadMultiSongs = useCallback(async (songs: { songId: string; stems: Stem[]; row: number }[]) => {
    const ctx = initAudioContext();
    // Stop and clean up any existing playback
    stemsRef.current.forEach((stem) => {
      if (stem.source) {
        try { stem.source.stop(); } catch {}
      }
    });
    cancelAnimationFrame(animationFrameRef.current);
    stemsRef.current.clear();
    isLoadedRef.current = false;
    pendingCommandsRef.current = [];
    setIsLoaded(false);
    setIsPlaying(false);
    pausedAtRef.current = 0;

    try {
      const allLoadPromises: Promise<void>[] = [];

      for (const songEntry of songs) {
        for (const stem of songEntry.stems) {
          allLoadPromises.push((async () => {
            // Use the original file name from the song's directory
            const url = `/audio/songs/${songEntry.songId}/${stem.file}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

            const gainNode = ctx.createGain();
            gainNode.connect(ctx.destination);
            gainNode.gain.value = 0; // All muted initially

            stemsRef.current.set(stem.id, {
              id: stem.id, // already namespaced (e.g., 101, 201, 301)
              buffer: audioBuffer,
              gainNode,
              source: null,
            });
          })());
        }
      }

      await Promise.all(allLoadPromises);
      isLoadedRef.current = true;
      setIsLoaded(true);
      const totalStems = songs.reduce((sum, s) => sum + s.stems.length, 0);
      console.log(`[AudioEngine] Multi-song loaded: ${songs.map(s => s.songId).join(', ')} (${totalStems} stems)`);

      // Replay any commands that arrived while loading
      const pending = pendingCommandsRef.current;
      pendingCommandsRef.current = [];
      if (pending.length > 0) {
        console.log(`[AudioEngine] Replaying ${pending.length} pending commands`);
        for (const cmd of pending) {
          handleAudioCommandRef.current(cmd);
        }
      }
    } catch (error) {
      console.error('[AudioEngine] Error loading multi-song:', error);
    }
  }, [initAudioContext]);

  const createAndStartSources = useCallback((offset: number = 0) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    stemsRef.current.forEach((stem) => {
      if (stem.source) {
        try { stem.source.stop(); } catch {}
      }

      const source = ctx.createBufferSource();
      source.buffer = stem.buffer;
      source.loop = true;
      source.connect(stem.gainNode);
      source.start(0, offset);
      stem.source = source;
    });

    startTimeRef.current = ctx.currentTime - offset;
  }, []);

  const playInternal = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx || !isLoadedRef.current) return;
    if (ctx.state === 'suspended') ctx.resume();

    createAndStartSources(pausedAtRef.current);
    setIsPlaying(true);
    console.log('[AudioEngine] Playing');
  }, [createAndStartSources]);

  const play = useCallback(() => {
    if (!isLoadedRef.current) return; // queued via handleAudioCommand
    playInternal();
  }, [playInternal]);

  const pause = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const duration = Math.max(...Array.from(stemsRef.current.values()).map(s => s.buffer.duration));
    pausedAtRef.current = (ctx.currentTime - startTimeRef.current) % duration;

    stemsRef.current.forEach((stem) => {
      if (stem.source) {
        try { stem.source.stop(); } catch {}
        stem.source = null;
      }
    });

    cancelAnimationFrame(animationFrameRef.current);
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    pause();
    pausedAtRef.current = 0;
  }, [pause]);

  const fadeInStem = useCallback((stemId: number, duration: number = 400) => {
    const stem = stemsRef.current.get(stemId);
    const ctx = audioContextRef.current;
    if (!stem || !ctx) return;

    const now = ctx.currentTime;
    stem.gainNode.gain.cancelScheduledValues(now);
    stem.gainNode.gain.setValueAtTime(stem.gainNode.gain.value, now);
    stem.gainNode.gain.linearRampToValueAtTime(1, now + duration / 1000);
  }, []);

  const fadeOutStem = useCallback((stemId: number, duration: number = 400) => {
    const stem = stemsRef.current.get(stemId);
    const ctx = audioContextRef.current;
    if (!stem || !ctx) return;

    const now = ctx.currentTime;
    stem.gainNode.gain.cancelScheduledValues(now);
    stem.gainNode.gain.setValueAtTime(stem.gainNode.gain.value, now);
    stem.gainNode.gain.linearRampToValueAtTime(0, now + duration / 1000);
  }, []);

  const fadeAllIn = useCallback((duration: number = 400) => {
    stemsRef.current.forEach((stem) => {
      const ctx = audioContextRef.current;
      if (!ctx) return;
      const now = ctx.currentTime;
      stem.gainNode.gain.cancelScheduledValues(now);
      stem.gainNode.gain.setValueAtTime(stem.gainNode.gain.value, now);
      stem.gainNode.gain.linearRampToValueAtTime(1, now + duration / 1000);
    });
  }, []);

  const fadeAllOut = useCallback((duration: number = 400) => {
    stemsRef.current.forEach((stem) => {
      const ctx = audioContextRef.current;
      if (!ctx) return;
      const now = ctx.currentTime;
      stem.gainNode.gain.cancelScheduledValues(now);
      stem.gainNode.gain.setValueAtTime(stem.gainNode.gain.value, now);
      stem.gainNode.gain.linearRampToValueAtTime(0, now + duration / 1000);
    });
  }, []);

  const setStemVolume = useCallback((stemId: number, volume: number) => {
    const stem = stemsRef.current.get(stemId);
    if (stem) {
      stem.gainNode.gain.value = volume;
    }
  }, []);

  const playTestTone = useCallback(() => {
    const ctx = initAudioContext();
    // Play three quick ascending beeps: C5, E5, G5
    const freqs = [523.25, 659.25, 783.99];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.3);
    });
  }, [initAudioContext]);

  // Handle audio commands from the server
  const handleAudioCommand = useCallback((cmd: AudioCommand) => {
    // Queue commands that need stems if song isn't loaded yet
    if (!isLoadedRef.current && cmd.action !== 'load' && cmd.action !== 'load-multi' && cmd.action !== 'test-tone') {
      console.log(`[AudioEngine] Queuing command: ${cmd.action} (song still loading)`);
      pendingCommandsRef.current.push(cmd);
      return;
    }

    switch (cmd.action) {
      case 'load':
        loadSong(cmd.songId, cmd.stems);
        break;
      case 'load-multi':
        loadMultiSongs(cmd.songs);
        break;
      case 'play':
        play();
        break;
      case 'pause':
        pause();
        break;
      case 'stop':
        stop();
        break;
      case 'set-stem-volume':
        setStemVolume(cmd.stemId, cmd.volume);
        break;
      case 'fade-in-stem':
        fadeInStem(cmd.stemId, cmd.duration);
        break;
      case 'fade-out-stem':
        fadeOutStem(cmd.stemId, cmd.duration);
        break;
      case 'fade-all-in':
        fadeAllIn(cmd.duration);
        break;
      case 'fade-all-out':
        fadeAllOut(cmd.duration);
        break;
      case 'test-tone':
        playTestTone();
        break;
    }
  }, [loadSong, loadMultiSongs, play, pause, stop, setStemVolume, fadeInStem, fadeOutStem, fadeAllIn, fadeAllOut, playTestTone]);
  const handleAudioCommandRef = useRef(handleAudioCommand);
  handleAudioCommandRef.current = handleAudioCommand;

  // Auto-initialize AudioContext and silently resume on first user gesture
  useEffect(() => {
    // Create context eagerly
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const resumeOnGesture = () => {
      const ctx = audioContextRef.current;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
    };

    // Listen for any user interaction to unlock audio
    document.addEventListener('click', resumeOnGesture, { capture: true });
    document.addEventListener('touchstart', resumeOnGesture, { capture: true });
    document.addEventListener('keydown', resumeOnGesture, { capture: true });

    return () => {
      document.removeEventListener('click', resumeOnGesture, { capture: true });
      document.removeEventListener('touchstart', resumeOnGesture, { capture: true });
      document.removeEventListener('keydown', resumeOnGesture, { capture: true });
      cancelAnimationFrame(animationFrameRef.current);
      stemsRef.current.forEach((stem) => {
        if (stem.source) {
          try { stem.source.stop(); } catch {}
        }
      });
      stemsRef.current.clear();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  return {
    isLoaded,
    isPlaying,
    handleAudioCommand,
    initAudioContext,
  };
}
