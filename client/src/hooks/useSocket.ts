import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ScreenRole, WallState, PlayerState, HostState, AudioCommand, PlayerId } from '@shared/types';

interface UseSocketOptions {
  role: ScreenRole;
  playerId?: PlayerId;
  onAudioCommand?: (cmd: AudioCommand) => void;
}

interface UseSocketReturn {
  connected: boolean;
  wallState: WallState | null;
  playerState: PlayerState | null;
  hostState: HostState | null;
  emit: (event: string, data?: any) => void;
}

export function useSocket({ role, playerId, onAudioCommand }: UseSocketOptions): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [wallState, setWallState] = useState<WallState | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [hostState, setHostState] = useState<HostState | null>(null);
  const onAudioCommandRef = useRef(onAudioCommand);
  onAudioCommandRef.current = onAudioCommand;

  useEffect(() => {
    const socket = io({
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('register', { role, playerId });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // All screens listen for audio commands
    socket.on('wall:audio', (cmd: AudioCommand) => {
      onAudioCommandRef.current?.(cmd);
    });

    if (role === 'wall') {
      socket.on('wall:state', (state: WallState) => setWallState(state));
    } else if (role === 'player') {
      socket.on('player:state', (state: PlayerState) => setPlayerState(state));
    } else if (role === 'host') {
      socket.on('host:state', (state: HostState) => setHostState(state));
    }

    return () => {
      socket.disconnect();
    };
  }, [role, playerId]);

  const emit = useCallback((event: string, data?: any) => {
    socketRef.current?.emit(event, data || {});
  }, []);

  return { connected, wallState, playerState, hostState, emit };
}
