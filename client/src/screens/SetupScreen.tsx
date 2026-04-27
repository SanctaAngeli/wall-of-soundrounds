import { useState, useEffect, useCallback, useMemo, type ChangeEvent } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useAudioEngine } from '../hooks/useAudioEngine';
import type { Song, GameConfig, RoundType } from '@shared/types';

// ===========================================================================
// SetupScreen
// Dedicated /setup route: browse the full song library, preview any song with
// individual stem toggles, and customise which songs play in each round.
// Config edits are sent via socket (server state); audio preview is LOCAL ONLY
// (uses this page's own audio engine, no broadcast to wall/players).
// ===========================================================================

interface LibraryResponse {
  songs: Song[];
  defaults: {
    roundLineups: Record<RoundType, string[]>;
    anotherLevelGroups: { group: string; songId: string; instruments: string[]; prize: number }[];
    partsColumns: { col: number; targetSongId: string; decoySongIds: [string, string] }[];
  };
}

const COL_NAMES = ['Vocals', 'Guitar', 'Keys', 'Bass', 'Drums'];
const ROUND_LABELS: Record<RoundType, string> = {
  '5to1': 'Less is More',
  'another-level': 'Another Level',
  'music-auction': 'Bet the Beat',
  'song-in-5-parts': 'Song in 5 Parts',
  'song-showdown': 'Song Showdown',
  'win-the-wall': 'Win the Wall',
};

export function SetupScreen() {
  const { connected, hostState, emit } = useSocket({ role: 'host' });
  const audioEngine = useAudioEngine();

  const [lib, setLib] = useState<LibraryResponse | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Song | null>(null);
  const [activeStemIds, setActiveStemIds] = useState<Set<number>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeRoundTab, setActiveRoundTab] = useState<RoundType>('5to1');
  const [toast, setToast] = useState<string | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [dragOverRound, setDragOverRound] = useState<RoundType | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    // v2 key — reshown after the Song Showdown / Win the Wall addition so hosts see updated copy
    try { return localStorage.getItem('wos_onboarding_seen_v2') !== '1'; } catch { return true; }
  });
  const dismissOnboarding = () => {
    try { localStorage.setItem('wos_onboarding_seen_v2', '1'); } catch {}
    setShowOnboarding(false);
  };

  // Explicit audio unlock — Safari stays suspended until a gesture explicitly resumes the context.
  // Rather than relying on auto-unlock from the song click (which races the audio buffer load),
  // we have a dedicated banner button the host taps first.
  const unlockAudio = useCallback(() => {
    const ctx = audioEngine.initAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => setAudioUnlocked(true)).catch(err => console.error('[setup] unlock failed:', err));
    } else {
      setAudioUnlocked(true);
    }
  }, [audioEngine]);

  const playTestTone = useCallback(() => {
    audioEngine.initAudioContext();
    audioEngine.handleAudioCommand({ action: 'test-tone' });
    setAudioUnlocked(true);
  }, [audioEngine]);

  // Fetch full library on mount
  useEffect(() => {
    fetch('/api/library')
      .then(r => r.json())
      .then((data: LibraryResponse) => setLib(data))
      .catch(err => console.error('[setup] failed to load library:', err));
  }, []);

  // Transient toast helper
  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  // -------- Sampler actions (LOCAL audio only) --------
  // On song select: load every stem that exists and auto-play them all layered.
  // Host can then toggle individual stems off to audition what's driving the track.
  const loadSongForPreview = useCallback((song: Song) => {
    // Ensure AudioContext is running — this click is a user gesture so Safari allows resume.
    const ctx = audioEngine.initAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    setAudioUnlocked(true);

    setSelected(song);
    const allStems = [...song.stems, ...(song.extraStems ?? [])];
    const allIds = new Set(allStems.map(s => s.id));
    setActiveStemIds(allIds);
    setIsPlaying(true);
    audioEngine.handleAudioCommand({ action: 'load', songId: song.id, stems: allStems });
    // These commands queue inside the audio engine until load completes, then replay.
    for (const s of allStems) {
      audioEngine.handleAudioCommand({ action: 'fade-in-stem', stemId: s.id, duration: 200 });
    }
    audioEngine.handleAudioCommand({ action: 'play' });
  }, [audioEngine]);

  const toggleStem = useCallback((stemId: number) => {
    setActiveStemIds(prev => {
      const next = new Set(prev);
      if (next.has(stemId)) {
        next.delete(stemId);
        audioEngine.handleAudioCommand({ action: 'fade-out-stem', stemId, duration: 200 });
      } else {
        next.add(stemId);
        audioEngine.handleAudioCommand({ action: 'fade-in-stem', stemId, duration: 200 });
      }
      return next;
    });
  }, [audioEngine]);

  const playPause = useCallback(() => {
    if (isPlaying) {
      audioEngine.handleAudioCommand({ action: 'pause' });
      setIsPlaying(false);
    } else {
      audioEngine.handleAudioCommand({ action: 'play' });
      setIsPlaying(true);
    }
  }, [isPlaying, audioEngine]);

  const stop = useCallback(() => {
    audioEngine.handleAudioCommand({ action: 'stop' });
    setIsPlaying(false);
    setActiveStemIds(new Set());
  }, [audioEngine]);

  // -------- Config helpers (server-backed via socket) --------
  const config: GameConfig = useMemo(() => {
    return hostState?.config ?? { roundLineups: {}, anotherLevelGroupSongs: {}, partsColumnOverrides: {} };
  }, [hostState]);

  const resolveLineup = useCallback((round: RoundType): string[] => {
    const override = config.roundLineups[round];
    if (override && override.length > 0) return override;
    return lib?.defaults.roundLineups[round] ?? [];
  }, [config, lib]);

  const setLineup = useCallback((round: RoundType, songIds: string[]) => {
    emit('host:config-set-round-lineup', { round, songIds });
  }, [emit]);

  const addToRound = useCallback((round: RoundType, songId: string) => {
    const current = resolveLineup(round);
    if (current.includes(songId)) {
      flash(`Already in ${ROUND_LABELS[round]}`);
      return;
    }
    setLineup(round, [...current, songId]);
    flash(`Added to ${ROUND_LABELS[round]}`);
  }, [resolveLineup, setLineup, flash]);

  const removeFromRound = useCallback((round: RoundType, index: number) => {
    const current = resolveLineup(round);
    setLineup(round, current.filter((_, i) => i !== index));
  }, [resolveLineup, setLineup]);

  const moveInRound = useCallback((round: RoundType, index: number, delta: -1 | 1) => {
    const current = [...resolveLineup(round)];
    const ni = index + delta;
    if (ni < 0 || ni >= current.length) return;
    [current[index], current[ni]] = [current[ni], current[index]];
    setLineup(round, current);
  }, [resolveLineup, setLineup]);

  // R2: set per-group song
  const setGroupSong = useCallback((group: string, songId: string) => {
    emit('host:config-set-al-group-song', { group, songId });
  }, [emit]);

  // R4: set per-column target + decoys
  const setColumn = useCallback((col: number, targetSongId: string, decoy1SongId: string, decoy2SongId: string) => {
    emit('host:config-set-parts-column', { col, targetSongId, decoy1SongId, decoy2SongId });
  }, [emit]);

  // -------- Export / Import --------
  const exportConfig = () => {
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wos-show-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash('Config downloaded');
  };

  const importConfigFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      try { JSON.parse(text); } catch { flash('Invalid JSON file'); return; }
      emit('host:config-import', { json: text });
      flash('Config imported');
    });
    e.target.value = '';
  };

  const resetAll = () => {
    if (!confirm('Reset all custom song lineups back to defaults?')) return;
    emit('host:config-reset');
    flash('Config reset to defaults');
  };

  // -------- Filtered library --------
  const filteredSongs = useMemo(() => {
    if (!lib) return [];
    const q = search.trim().toLowerCase();
    if (!q) return lib.songs;
    return lib.songs.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      (s.genre ?? '').toLowerCase().includes(q)
    );
  }, [lib, search]);

  // -------- Look-up helpers --------
  const songById = useCallback((id: string): Song | undefined =>
    lib?.songs.find(s => s.id === id), [lib]);

  // =======================================================================
  // Render
  // =======================================================================

  if (!lib) {
    return <div style={S.container}><div style={S.loading}>Loading song library…</div></div>;
  }

  return (
    <div style={S.container}>
      {/* First-time onboarding overlay — walks non-technical hosts through the main mechanics */}
      {showOnboarding && (
        <div style={S.onboardOverlay}>
          <div style={S.onboardCard}>
            <div style={{ fontSize: '0.7rem', color: '#8b5cf6', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>
              Welcome
            </div>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', margin: '0 0 12px 0', color: '#ffd700' }}>
              This is your show setup
            </h2>
            <p style={S.onboardP}>
              This page has every song the game knows about. Use it <em>before</em> you go live to choose
              which songs play in each round, then save your setup as a file you can reload next time.
            </p>

            <div style={S.onboardStep}>
              <div style={S.onboardBadge}>1</div>
              <div>
                <div style={S.onboardStepTitle}>Try a song</div>
                <div style={S.onboardStepBody}>
                  Click any song in the <strong>Library</strong> on the left — e.g. <em>Break My Heart</em> by Dua Lipa —
                  and it'll play in the <strong>Sampler</strong> with every instrument layered. Click the instrument
                  buttons to mute/unmute them. Only this tab makes noise — nothing goes to the wall or players.
                </div>
              </div>
            </div>

            <div style={S.onboardStep}>
              <div style={S.onboardBadge}>2</div>
              <div>
                <div style={S.onboardStepTitle}>Put songs into rounds (drag + drop)</div>
                <div style={S.onboardStepBody}>
                  Grab a song from the library and drag it over to the <strong>Round Lineups</strong> panel on the right.
                  A dashed outline will appear — drop it inside to add it. Pick the round tab at the top first —
                  there are six rounds now including <strong>Song Showdown</strong> (opener, 3 players, 6 songs across different
                  years) and <strong>Win the Wall</strong> (endgame, one survivor, configurable jackpot).
                </div>
              </div>
            </div>

            <div style={S.onboardStep}>
              <div style={S.onboardBadge}>2b</div>
              <div>
                <div style={S.onboardStepTitle}>Song Showdown needs years</div>
                <div style={S.onboardStepBody}>
                  Each row on the Song Showdown wall shows a year. Every song has a baked-in year, but you can override
                  it in the <strong>Sampler</strong> (next to the song title) — useful if you want "1984" to read as a
                  cleaner round number or if our tag is wrong.
                </div>
              </div>
            </div>

            <div style={S.onboardStep}>
              <div style={S.onboardBadge}>3</div>
              <div>
                <div style={S.onboardStepTitle}>Save your show to a file (Export)</div>
                <div style={S.onboardStepBody}>
                  When you like your setup, click <strong>⤓ Export Config</strong> in the top right. Your browser
                  downloads a small file to your Downloads folder. Keep it somewhere safe on your desktop — that's
                  your show's memory.
                </div>
              </div>
            </div>

            <div style={S.onboardStep}>
              <div style={S.onboardBadge}>4</div>
              <div>
                <div style={S.onboardStepTitle}>Load your show next time (Import)</div>
                <div style={S.onboardStepBody}>
                  The next time you open this page (or after the server has been restarted), all your custom settings
                  will be reset. To bring them back, click <strong>⤒ Import Config</strong> and pick the file you saved
                  earlier. Everything will be exactly how you left it.
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.72rem', color: '#8080a0', marginTop: '16px', fontStyle: 'italic' }}>
              You can see this guide again by clearing your browser's site data for this site, or by asking your dev for help.
            </div>

            <button onClick={dismissOnboarding} style={{ ...S.btn, background: '#ffd700', color: '#000', width: '100%', padding: '14px', marginTop: '16px', fontSize: '0.95rem', fontWeight: 900 }}>
              Got it — let's set up the show
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={S.topBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a href="/" style={S.backLink}>← Hub</a>
          <h1 style={S.title}>🎚️ Setup & Library</h1>
          <span style={{ color: connected ? '#00ff88' : '#ff4444', fontSize: '0.7rem' }}>
            {connected ? '● connected' : '○ reconnecting'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={playTestTone} style={{ ...S.btn, background: '#00ff88', color: '#000' }}>
            🔔 Test Tone
          </button>
          <button onClick={exportConfig} style={{ ...S.btn, background: '#00d4ff', color: '#000' }}>
            ⤓ Export Config
          </button>
          <label style={{ ...S.btn, background: '#ffd700', color: '#000', cursor: 'pointer' }}>
            ⤒ Import Config
            <input type="file" accept=".json,application/json" onChange={importConfigFile} style={{ display: 'none' }} />
          </label>
          <button onClick={resetAll} style={{ ...S.btn, background: '#440000', color: '#ff6666' }}>
            Reset All
          </button>
        </div>
      </div>

      {/* Audio unlock banner — shown until the user taps to resume the AudioContext.
          Safari suspends audio on tab load; the first click anywhere resumes it. */}
      {!audioUnlocked && (
        <button
          onClick={unlockAudio}
          style={{
            width: '100%', padding: '12px 16px',
            background: 'linear-gradient(90deg, #ffd70022, #ff8c0033, #ffd70022)',
            border: 'none', borderBottom: '1px solid #ffd70066',
            color: '#ffd700', fontSize: '0.9rem', fontWeight: 900,
            fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          🔊 Tap here to enable audio in this tab
        </button>
      )}

      {/* How-to banner */}
      <div style={S.helpBanner}>
        <strong>How this works:</strong> Click any song on the left to load it in the sampler in the middle —
        toggle individual stems to hear just the drums, just the keys, etc. Once you've found a song
        that fits a round, use the buttons in the right panel to assign it. Audio here plays only on this
        screen, not on the wall or players. When you're done, click <strong>Export Config</strong> to save
        your show setup to a file — you'll need to <strong>Import Config</strong> again after any server
        redeploy.
      </div>

      {/* Toast */}
      {toast && (
        <div style={S.toast}>{toast}</div>
      )}

      {/* 3-column layout */}
      <div style={S.main}>

        {/* ============ LEFT: Song library list ============ */}
        <div style={S.col}>
          <h2 style={S.colTitle}>Library ({filteredSongs.length}/{lib.songs.length})</h2>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search title / artist / genre…"
            style={S.search}
          />
          <div style={S.libraryList}>
            {filteredSongs.map(song => {
              const isSelected = selected?.id === song.id;
              return (
                <button
                  key={song.id}
                  onClick={() => loadSongForPreview(song)}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('application/x-wos-song', song.id);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  style={{
                    ...S.libraryItem,
                    background: isSelected ? '#ffd70022' : '#1a1a3a',
                    border: isSelected ? '1px solid #ffd700' : '1px solid #22223a',
                    cursor: 'grab',
                  }}
                  title="Click to preview · Drag to a round on the right →"
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', minWidth: 0 }}>
                    <span style={{ fontWeight: 800, color: isSelected ? '#ffd700' : '#fff', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {song.title}
                    </span>
                    <span style={{ color: '#8080a0', fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {song.artist}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.62rem', color: '#606080' }}>
                    {(() => {
                      const yearOverride = config.songYearOverrides?.[song.id];
                      const effective = yearOverride ?? song.year;
                      return (
                        <span style={yearOverride != null ? { color: '#ffd700', fontWeight: 700 } : undefined}
                              title={yearOverride != null ? `Override (default: ${song.year})` : undefined}>
                          {effective}{yearOverride != null ? '*' : ''}
                        </span>
                      );
                    })()}
                    <span>·</span>
                    <span>{song.genre ?? '—'}</span>
                    <span>·</span>
                    <span>{song.stems.length + (song.extraStems?.length ?? 0)} stems</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ============ CENTER: Sampler ============ */}
        <div style={{ ...S.col, flex: '1 1 0' }}>
          <h2 style={S.colTitle}>Sampler</h2>
          <div style={S.colScroll}>
          {!selected ? (
            <div style={S.placeholder}>
              Pick a song from the library on the left to start auditioning it.
            </div>
          ) : (
            <>
              <div style={S.selectedHeader}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff' }}>{selected.title}</div>
                  <div style={{ color: '#a0a0b0', fontSize: '0.9rem' }}>
                    {selected.artist} · {selected.year} · {selected.genre ?? '—'} · {selected.difficulty}
                  </div>
                </div>
                {/* Per-song year override — drives Song Showdown row labels. */}
                {(() => {
                  const override = config.songYearOverrides?.[selected.id];
                  const effective = override ?? selected.year;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }} title="Override the year shown for this song (Song Showdown etc.)">
                      <span style={{ fontSize: '0.65rem', color: '#8080a0', fontWeight: 700, letterSpacing: '0.1em' }}>YEAR</span>
                      <input
                        type="number"
                        min={1900}
                        max={2099}
                        defaultValue={effective}
                        key={`year-${selected.id}-${override ?? 'default'}`}
                        onBlur={e => {
                          const raw = e.target.value.trim();
                          const parsed = raw ? parseInt(raw, 10) : NaN;
                          if (!raw || Number.isNaN(parsed) || parsed === selected.year) {
                            // Empty or back-to-default: clear override
                            emit('host:config-set-song-year', { songId: selected.id, year: null });
                          } else {
                            emit('host:config-set-song-year', { songId: selected.id, year: parsed });
                          }
                        }}
                        style={{
                          width: '72px', padding: '4px 6px',
                          background: override != null ? '#ffd70015' : '#1a1a3a',
                          border: `1px solid ${override != null ? '#ffd70066' : '#333'}`,
                          borderRadius: '4px', color: '#fff', fontSize: '0.85rem',
                          textAlign: 'center', fontFamily: 'monospace',
                        }}
                      />
                      {override != null && (
                        <button
                          onClick={() => emit('host:config-set-song-year', { songId: selected.id, year: null })}
                          title={`Reset to default (${selected.year})`}
                          style={{
                            padding: '2px 6px', fontSize: '0.6rem', fontWeight: 700,
                            background: 'transparent', color: '#ff8c00', border: '1px solid #ff8c0066',
                            borderRadius: '4px', cursor: 'pointer',
                          }}
                        >
                          RESET
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div style={S.transport}>
                <button
                  onClick={playPause}
                  style={{ ...S.btn, background: isPlaying ? '#ff4444' : '#00ff88', color: '#000', flex: 1, padding: '14px' }}
                >
                  {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
                </button>
                <button onClick={stop} style={{ ...S.btn, background: '#333', color: '#fff', padding: '14px 20px' }}>
                  ■ STOP
                </button>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#a0a0b0', margin: '10px 0 6px 0', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Primary stems ({selected.stems.length})
              </div>
              <div style={S.stemGrid}>
                {selected.stems.map(stem => {
                  const active = activeStemIds.has(stem.id);
                  return (
                    <button
                      key={stem.id}
                      onClick={() => toggleStem(stem.id)}
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData('application/x-wos-stem', String(stem.id));
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      style={{
                        ...S.stemBtn,
                        background: active ? `${stem.color}33` : '#1a1a3a',
                        borderColor: active ? stem.color : '#333',
                        color: active ? stem.color : '#888',
                        cursor: 'grab',
                      }}
                      title="Click to toggle · Drag into a slot below to set reveal order"
                    >
                      <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{stem.icon}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{stem.instrument}</span>
                      <span style={{ fontSize: '0.55rem', color: '#555' }}>{stem.file}</span>
                    </button>
                  );
                })}
              </div>

              {selected.extraStems && selected.extraStems.length > 0 && (
                <>
                  <div style={{ fontSize: '0.75rem', color: '#a0a0b0', margin: '14px 0 6px 0', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Extra stems ({selected.extraStems.length})
                  </div>
                  <div style={S.stemGrid}>
                    {selected.extraStems.map(stem => {
                      const active = activeStemIds.has(stem.id);
                      return (
                        <button
                          key={stem.id}
                          onClick={() => toggleStem(stem.id)}
                          draggable
                          onDragStart={e => {
                            e.dataTransfer.setData('application/x-wos-stem', String(stem.id));
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          title="Click to toggle · Drag into a reveal-order slot below (replaces that slot's instrument)"
                          style={{
                            ...S.stemBtn,
                            cursor: 'grab',
                            background: active ? `${stem.color}33` : '#1a1a3a',
                            borderColor: active ? stem.color : '#333',
                            color: active ? stem.color : '#888',
                          }}
                        >
                          <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{stem.icon}</span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{stem.instrument}</span>
                          <span style={{ fontSize: '0.55rem', color: '#555' }}>{stem.file}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* 5-slot arrangement — drives the R1 "5 to 1" reveal order for this song.
                  Slot 1 plays alone in the 1-stem song; slots 1-2 play together in 2-stem; etc.
                  Drag primary stems from above into slots to reorder. */}
              {(() => {
                // Full stem pool for this song (primary + extras, minus the Clue stem which is a lyric hint).
                const allStems = [...selected.stems, ...(selected.extraStems ?? []).filter(s => s.instrument !== 'Clue')];
                const allStemById = new Map(allStems.map(s => [s.id, s]));
                const defaultOrder = selected.stems.map(s => s.id); // default is still primary 5
                const currentOrder = config.stemOrderBySong?.[selected.id] ?? defaultOrder;
                // Ensure we have at least 5 in arrangement — pad from defaults if short
                const order: number[] = [...currentOrder];
                for (const id of defaultOrder) if (!order.includes(id) && order.length < 5) order.push(id);
                const hasCustom = !!config.stemOrderBySong?.[selected.id];
                const resetOrder = () => emit('host:config-set-stem-order', { songId: selected.id, stemIds: defaultOrder });
                const saveOrder = () => {
                  emit('host:config-set-stem-order', { songId: selected.id, stemIds: order.slice(0, 5) });
                  flash(`Saved arrangement for ${selected.title}`);
                };
                const dropStem = (slotIdx: number, stemId: number) => {
                  if (!allStemById.has(stemId)) return; // song must actually have this stem
                  const curr = [...order];
                  const existing = curr.indexOf(stemId);
                  if (existing !== -1) {
                    // Swap: stem was already somewhere in the arrangement, swap with target slot
                    [curr[existing], curr[slotIdx]] = [curr[slotIdx], curr[existing]];
                  } else {
                    // Stem is an extra not yet in the arrangement — replace whatever was in slotIdx
                    curr[slotIdx] = stemId;
                  }
                  emit('host:config-set-stem-order', { songId: selected.id, stemIds: curr });
                };
                return (
                  <div style={{ marginTop: '14px', padding: '10px', background: '#1a1a3a', borderRadius: '8px', border: '1px solid #8b5cf644' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Stem arrangement (Less is More · Song Showdown · Bet the Beat)
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={saveOrder}
                          style={{ ...S.btn, background: '#00ff88', color: '#000', fontSize: '0.65rem', padding: '4px 10px', fontWeight: 900 }}
                          title="Save this arrangement for the current session"
                        >
                          ✓ SAVE
                        </button>
                        {hasCustom && (
                          <button onClick={resetOrder} style={{ ...S.btn, background: '#333', color: '#aaa', fontSize: '0.6rem', padding: '3px 8px' }}>
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#8080a0', marginBottom: '8px', fontStyle: 'italic' }}>
                      Drag any stem (primary or extra) into a slot. Applies globally — every round this song plays in uses this arrangement.
                      <strong> Less is More:</strong> slot 1 is what plays alone in the 1-stem song.
                      <strong> Song Showdown:</strong> slot 1 is the first musician to join (highest cash offer).
                      <strong> Bet the Beat:</strong> slot 1 is the first offer ($15k), slot 5 is the last ($1k).
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                      {order.slice(0, 5).map((stemId, i) => {
                        const stem = allStemById.get(stemId);
                        const isHot = dragOverSlot === i;
                        return (
                          <div
                            key={i}
                            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverSlot(i); }}
                            onDragLeave={() => setDragOverSlot(null)}
                            onDrop={e => {
                              e.preventDefault();
                              setDragOverSlot(null);
                              const raw = e.dataTransfer.getData('application/x-wos-stem');
                              if (raw) dropStem(i, Number(raw));
                            }}
                            style={{
                              padding: '6px 4px', borderRadius: '6px', textAlign: 'center',
                              background: isHot ? '#8b5cf633' : '#0a0a1a',
                              border: `2px dashed ${isHot ? '#8b5cf6' : stem ? (stem.color + '66') : '#333'}`,
                              minHeight: '64px', display: 'flex', flexDirection: 'column',
                              alignItems: 'center', justifyContent: 'center', gap: '2px',
                              transition: 'all 0.15s',
                            }}
                          >
                            <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#8b5cf6', letterSpacing: '0.1em' }}>
                              SLOT {i + 1}
                            </div>
                            {stem ? (
                              <>
                                <div style={{ fontSize: '1.3rem', lineHeight: 1 }}>{stem.icon}</div>
                                <div style={{ fontSize: '0.55rem', fontWeight: 700, color: stem.color, textTransform: 'uppercase' }}>
                                  {stem.instrument}
                                </div>
                              </>
                            ) : (
                              <div style={{ fontSize: '0.6rem', color: '#444', fontStyle: 'italic' }}>drop here</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Quick-add — R1/R3 only (simple ordered/pool lineups). R2/R4 need their own editors. */}
              <div style={{ marginTop: '14px', padding: '10px', background: '#1a1a3a', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.7rem', color: '#a0a0b0', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Quick add to round
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button onClick={() => addToRound('song-showdown', selected.id)} style={{ ...S.btn, background: '#ff8c00', color: '#000', fontSize: '0.7rem', padding: '6px 10px' }}>
                    + Song Showdown
                  </button>
                  <button onClick={() => addToRound('5to1', selected.id)} style={{ ...S.btn, background: '#8b5cf6', color: '#fff', fontSize: '0.7rem', padding: '6px 10px' }}>
                    + Less is More
                  </button>
                  <button onClick={() => addToRound('music-auction', selected.id)} style={{ ...S.btn, background: '#8b5cf6', color: '#fff', fontSize: '0.7rem', padding: '6px 10px' }}>
                    + Bet the Beat
                  </button>
                  <button onClick={() => addToRound('win-the-wall', selected.id)} style={{ ...S.btn, background: '#ffd700', color: '#000', fontSize: '0.7rem', padding: '6px 10px' }}>
                    + Win the Wall
                  </button>
                  <span style={{ fontSize: '0.65rem', color: '#606080', alignSelf: 'center' }}>
                    (R2 & R4 use the per-group / per-column pickers on the right →)
                  </span>
                </div>
              </div>
            </>
          )}
          </div> {/* end sampler colScroll */}
        </div>

        {/* ============ RIGHT: Round editors ============ */}
        <div style={S.col}>
          <h2 style={S.colTitle}>Round Lineups</h2>
          <div style={{ display: 'flex', gap: '3px', marginBottom: '10px', flexWrap: 'wrap' }}>
            {(Object.keys(ROUND_LABELS) as RoundType[]).map(r => (
              <button
                key={r}
                onClick={() => setActiveRoundTab(r)}
                style={{
                  flex: 1, padding: '8px 6px', borderRadius: '6px', border: 'none',
                  background: activeRoundTab === r ? '#ffd700' : '#1a1a3a',
                  color: activeRoundTab === r ? '#000' : '#a0a0b0',
                  fontWeight: 900, fontSize: '0.65rem', letterSpacing: '0.05em',
                  textTransform: 'uppercase', cursor: 'pointer',
                }}
              >
                {ROUND_LABELS[r]}
              </button>
            ))}
          </div>

          {/* Scrollable content area so R4's 5 columns editor fits without clipping */}
          <div style={S.colScroll}>

          {/* Simple ordered lineup editors (R1, R3, Song Showdown, Win the Wall) — drop-zone for songs */}
          {(activeRoundTab === '5to1' || activeRoundTab === 'music-auction' || activeRoundTab === 'song-showdown' || activeRoundTab === 'win-the-wall') && (() => {
            const round = activeRoundTab;
            const ids = resolveLineup(round);
            const hasOverride = !!config.roundLineups[round];
            const maxPlayed = round === '5to1' ? 5 : ids.length;
            const isHot = dragOverRound === round;
            return (
              <div
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDragOverRound(round); }}
                onDragLeave={() => setDragOverRound(null)}
                onDrop={e => {
                  e.preventDefault();
                  setDragOverRound(null);
                  const songId = e.dataTransfer.getData('application/x-wos-song');
                  if (songId) addToRound(round, songId);
                }}
                style={{
                  padding: '12px', borderRadius: '8px',
                  // Big drop target: tall enough that dropping in empty space well below items still lands here.
                  minHeight: '560px',
                  background: isHot ? '#ffd70015' : '#0a0a1a40',
                  border: isHot ? '2px dashed #ffd700' : '2px dashed #22223a',
                  transition: 'background 0.15s, border 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#a0a0b0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {round === '5to1'
                      ? `${ids.length} songs — first 5 play (song 1 = 5 stems, song 5 = 1 stem)`
                      : round === 'song-showdown'
                      ? `${ids.length} songs (need ≥ 6: 3 visible + 3 replacements)${ids.length < 6 ? ' ⚠ not enough' : ''}`
                      : round === 'win-the-wall'
                      ? `${ids.length} songs (need ≥ 6; extras are alternates)${ids.length < 6 ? ' ⚠ not enough' : ''}`
                      : `${ids.length} songs in pool`}
                  </div>
                  {hasOverride && (
                    <button
                      onClick={() => setLineup(round, lib.defaults.roundLineups[round] ?? [])}
                      style={{ ...S.btn, background: '#333', color: '#aaa', fontSize: '0.65rem', padding: '4px 8px' }}
                    >
                      Revert
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#8b5cf6', fontWeight: 700, marginBottom: '6px', fontStyle: 'italic' }}>
                  💡 Drag songs from the library on the left into this box to add them.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {ids.length === 0 && (
                    <div style={S.placeholder}>Lineup empty — drag a song here or use Quick Add in the sampler.</div>
                  )}
                  {ids.map((id, i) => {
                    const song = songById(id);
                    const isAlternate = round === '5to1' && i >= maxPlayed;
                    const isSelected = selected?.id === id;
                    const canEdit = !!song;
                    return (
                      <div
                        key={`${id}-${i}`}
                        onClick={canEdit ? () => loadSongForPreview(song!) : undefined}
                        title={canEdit ? 'Click to edit this song (loads into the sampler on the left)' : undefined}
                        style={{
                          ...S.lineupItem,
                          opacity: isAlternate ? 0.5 : 1,
                          cursor: canEdit ? 'pointer' : 'default',
                          border: isSelected ? '1px solid #8b5cf6' : '1px solid #333',
                          background: isSelected ? '#8b5cf622' : '#1a1a3a',
                        }}
                      >
                        <span style={{ fontWeight: 800, color: isAlternate ? '#666' : '#ffd700', minWidth: '22px' }}>{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {song?.title ?? id}
                            {isAlternate && <span style={{ color: '#8080a0', fontSize: '0.6rem', marginLeft: '6px' }}>(alternate)</span>}
                            {isSelected && <span style={{ color: '#8b5cf6', fontSize: '0.6rem', marginLeft: '6px', fontWeight: 900 }}>✎ EDITING</span>}
                          </div>
                          <div style={{ color: '#8080a0', fontSize: '0.65rem' }}>{song?.artist ?? '(missing)'}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '2px' }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => moveInRound(round, i, -1)} disabled={i === 0} style={S.moveBtn}>▲</button>
                          <button onClick={() => moveInRound(round, i, 1)} disabled={i === ids.length - 1} style={S.moveBtn}>▼</button>
                          <button onClick={() => removeFromRound(round, i)} style={{ ...S.moveBtn, color: '#ff6666' }}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Song Showdown — Toss Up song picker. Single-song drop zone for the opener.
              Fixed $1k prize, free-for-all buzz, plays BEFORE the 6 main songs. Winner banks $1k
              and picks the first year. Clear this to skip the toss-up entirely. */}
          {activeRoundTab === 'song-showdown' && (() => {
            const tossUpId = config.songShowdownTossUp ?? '';
            const tossUpSong = tossUpId ? songById(tossUpId) : undefined;
            const isHot = dragOverRound === 'song-showdown-tossup';
            return (
              <div
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDragOverRound('song-showdown-tossup'); }}
                onDragLeave={() => setDragOverRound(null)}
                onDrop={e => {
                  e.preventDefault();
                  setDragOverRound(null);
                  const songId = e.dataTransfer.getData('application/x-wos-song');
                  if (songId) emit('host:config-set-showdown-tossup', { songId });
                }}
                style={{
                  marginTop: '14px', padding: '10px',
                  background: isHot ? '#ff8c0015' : '#0a0a1a',
                  border: isHot ? '2px dashed #ff8c00' : '1px dashed #ff8c0066',
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#ff8c00', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Toss Up song (plays first · $1,000 free-for-all)
                  </div>
                  {tossUpId && (
                    <button
                      onClick={() => emit('host:config-set-showdown-tossup', { songId: '' })}
                      style={{ ...S.btn, background: '#333', color: '#aaa', fontSize: '0.6rem', padding: '3px 8px' }}
                    >
                      Clear (skip toss-up)
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#8080a0', marginBottom: '8px', fontStyle: 'italic' }}>
                  Before the 6 main songs, this song plays as a $1k warm-up. Anyone can buzz (no lockout), winner banks $1k and picks the first year. Pick a song NOT already in the main lineup.
                </div>
                {tossUpSong ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 10px',
                    background: '#ff8c0022',
                    border: '1px solid #ff8c0088',
                    borderRadius: '6px',
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>🎺</span>
                    <span style={{ flex: 1, color: '#fff', fontWeight: 800, fontSize: '0.85rem' }}>
                      {tossUpSong.title}
                    </span>
                    <span style={{ color: '#a0a0b0', fontSize: '0.72rem' }}>
                      {tossUpSong.artist} · {tossUpSong.year}
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.7rem', color: '#666', fontStyle: 'italic', padding: '8px', textAlign: 'center' }}>
                    No toss-up set — round will start straight on the year picker. Drag a song here to enable.
                  </div>
                )}
              </div>
            );
          })()}

          {/* Demo lineup for any round — a short (3-song) alternate the host can run as a dry-run.
              Without a configured demo, the first 3 songs of the main lineup are used. Shown for
              all tabs where the drop-zone editor applies (R1 / R3 / Showdown / WTW). */}
          {(activeRoundTab === '5to1' || activeRoundTab === 'music-auction' || activeRoundTab === 'song-showdown' || activeRoundTab === 'win-the-wall') && (() => {
            const round = activeRoundTab;
            const demoIds = config.demoLineup?.[round] ?? [];
            const effectiveDemo = demoIds.length > 0
              ? demoIds
              : resolveLineup(round).slice(0, 3);
            const isHot = dragOverRound === `${round}-demo`;
            const dropId = `${round}-demo`;
            return (
              <div
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDragOverRound(dropId); }}
                onDragLeave={() => setDragOverRound(null)}
                onDrop={e => {
                  e.preventDefault();
                  setDragOverRound(null);
                  const songId = e.dataTransfer.getData('application/x-wos-song');
                  if (!songId) return;
                  const current = config.demoLineup?.[round] ?? [];
                  if (current.includes(songId)) return;
                  emit('host:config-set-demo-lineup', { round, songIds: [...current, songId] });
                }}
                style={{
                  marginTop: '14px', padding: '10px',
                  background: isHot ? '#ff8c0015' : '#0a0a1a',
                  border: isHot ? '2px dashed #ff8c00' : '1px dashed #ff8c0044',
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#ff8c00', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Demo lineup (3 songs)
                  </div>
                  {demoIds.length > 0 && (
                    <button
                      onClick={() => emit('host:config-set-demo-lineup', { round, songIds: [] })}
                      style={{ ...S.btn, background: '#333', color: '#aaa', fontSize: '0.6rem', padding: '3px 8px' }}
                    >
                      Clear (use first 3 of main lineup)
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#8080a0', marginBottom: '8px', fontStyle: 'italic' }}>
                  {demoIds.length > 0
                    ? 'Custom demo set — used when the host clicks the DEMO chip on this round.'
                    : 'No custom set — demo falls back to the first 3 songs of the main lineup. Drag songs here to override.'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {effectiveDemo.map((id, i) => {
                    const song = songById(id);
                    const isCustom = demoIds.includes(id);
                    return (
                      <div key={`${id}-${i}`} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '5px 8px',
                        background: isCustom ? '#ff8c0015' : '#1a1a3a88',
                        border: `1px solid ${isCustom ? '#ff8c0066' : '#222'}`,
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                      }}>
                        <span style={{ color: '#ff8c00', fontWeight: 800, minWidth: 14 }}>{i + 1}</span>
                        <span style={{ flex: 1, color: '#fff' }}>{song?.title ?? id}</span>
                        <span style={{ color: '#8080a0', fontSize: '0.65rem' }}>{song?.artist ?? ''}</span>
                        {isCustom && (
                          <button
                            onClick={() => emit('host:config-set-demo-lineup', { round, songIds: demoIds.filter(x => x !== id) })}
                            style={{ background: 'none', border: 'none', color: '#ff6666', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}
                            title="Remove from demo lineup"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {effectiveDemo.length === 0 && (
                    <div style={{ fontSize: '0.7rem', color: '#666', fontStyle: 'italic', padding: '8px' }}>
                      No songs in main lineup either — drag some into the main pool above, or drop them here for a custom demo.
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Per-round prize ladder editor (5to1 / music-auction / song-in-5-parts / song-showdown).
              5 numeric inputs, host sets each tier. onBlur commits via host:config-set-round-prizes.
              Clearing any input reverts ALL 5 to the round's defaults (matching WTW's clear behaviour).
              Song Showdown gets an additional toss-up single-prize input. */}
          {(activeRoundTab === '5to1' || activeRoundTab === 'music-auction' || activeRoundTab === 'song-in-5-parts' || activeRoundTab === 'song-showdown') && (() => {
            const round = activeRoundTab;
            const DEFAULTS: Record<typeof round, number[]> = {
              '5to1': [3000, 4000, 5000, 6000, 10000],
              'music-auction': [15000, 6000, 3000, 2000, 1000],
              'song-in-5-parts': [1000, 2000, 3000, 4000, 5000],
              'song-showdown': [2500, 2000, 1500, 1000, 500],
            };
            const TIER_LABELS: Record<typeof round, string[]> = {
              '5to1': ['Song 1 (5 stems)', 'Song 2 (4 stems)', 'Song 3 (3 stems)', 'Song 4 (2 stems)', 'Song 5 (1 stem)'],
              'music-auction': ['1 musician', '2 musicians', '3 musicians', '4 musicians', '5 musicians'],
              'song-in-5-parts': ['Col 1 (Vocals)', 'Col 2 (Guitar)', 'Col 3 (Keys)', 'Col 4 (Bass)', 'Col 5 (Drums)'],
              'song-showdown': ['Tier 1 (1 stem)', 'Tier 2 (2 stems)', 'Tier 3 (3 stems)', 'Tier 4 (4 stems)', 'Tier 5 (5 stems)'],
            };
            const SUBTITLE: Record<typeof round, string> = {
              '5to1': 'Fewer stems = bigger prize. Song 5 is worth the most (hardest to guess with only 1 stem).',
              'music-auction': 'More musicians = smaller prize. The player bidding for the FEWEST musicians wins the most cash.',
              'song-in-5-parts': 'Prize increases left to right across the 5 columns. Total possible payout if all columns are won.',
              'song-showdown': 'Ladder drops as each musician joins (slot 1 plays alone). Songs 4–6 are automatically doubled on top of these base values.',
            };
            const defaults = DEFAULTS[round];
            const labels = TIER_LABELS[round];
            const override = config.roundPrizes?.[round];
            const effective = override && override.length === 5 ? override : defaults;
            const hasOverride = !!override;
            const roundColor = round === '5to1' ? '#8b5cf6'
                             : round === 'music-auction' ? '#00d4ff'
                             : round === 'song-in-5-parts' ? '#ff4488'
                             : '#ff8c00'; // song-showdown
            const resetAll = () => emit('host:config-set-round-prizes', { round, values: null });
            const setTier = (idx: number, raw: string) => {
              const trimmed = raw.trim();
              if (!trimmed) { resetAll(); return; }
              const n = Number(trimmed);
              if (!Number.isFinite(n) || n < 0) return;
              const next = [...effective];
              next[idx] = Math.round(n);
              emit('host:config-set-round-prizes', { round, values: next });
            };
            // Song Showdown also has the toss-up fixed prize.
            const tossUpOverride = config.songShowdownTossUpPrize;
            const tossUpDefault = 1000;
            const tossUpEffective = typeof tossUpOverride === 'number' ? tossUpOverride : tossUpDefault;
            return (
              <div style={{ marginTop: '14px', padding: '12px', background: '#0a0a1a', border: `1px solid ${roundColor}44`, borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ fontSize: '0.72rem', color: roundColor, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Prize ladder (host-configurable)
                  </div>
                  {hasOverride && (
                    <button
                      onClick={resetAll}
                      style={{ ...S.btn, background: '#333', color: '#aaa', fontSize: '0.6rem', padding: '3px 8px' }}
                      title="Revert all 5 tiers to defaults"
                    >
                      Reset all
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#8080a0', marginBottom: '10px', fontStyle: 'italic' }}>
                  {SUBTITLE[round]}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {effective.map((v, i) => {
                    const isCustom = hasOverride && v !== defaults[i];
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a0a0b0', minWidth: '160px' }}>
                          {labels[i]}
                        </span>
                        <span style={{ color: '#8080a0', fontWeight: 700 }}>$</span>
                        <input
                          type="number"
                          min={0}
                          step={500}
                          defaultValue={v}
                          key={`${round}-tier-${i}-${v}`}
                          onBlur={e => setTier(i, e.target.value)}
                          style={{
                            flex: 1, padding: '6px 8px',
                            background: isCustom ? `${roundColor}15` : '#1a1a3a',
                            border: `1px solid ${isCustom ? `${roundColor}88` : '#333'}`,
                            borderRadius: '4px', color: '#fff', fontSize: '0.85rem',
                            fontFamily: 'monospace', fontWeight: 700,
                          }}
                        />
                        <span style={{ fontSize: '0.6rem', color: '#606080', minWidth: '72px' }}>
                          default: ${defaults[i].toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {round === 'song-showdown' && (
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: `1px dashed ${roundColor}44` }}>
                    <div style={{ fontSize: '0.65rem', color: roundColor, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Toss Up fixed prize
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a0a0b0', minWidth: '160px' }}>
                        Toss Up opener
                      </span>
                      <span style={{ color: '#8080a0', fontWeight: 700 }}>$</span>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        defaultValue={tossUpEffective}
                        key={`tossup-${tossUpEffective}`}
                        onBlur={e => {
                          const raw = e.target.value.trim();
                          if (!raw) { emit('host:config-set-tossup-prize', { value: null }); return; }
                          const n = Number(raw);
                          if (Number.isFinite(n) && n >= 0) emit('host:config-set-tossup-prize', { value: Math.round(n) });
                        }}
                        style={{
                          flex: 1, padding: '6px 8px',
                          background: tossUpOverride != null ? `${roundColor}15` : '#1a1a3a',
                          border: `1px solid ${tossUpOverride != null ? `${roundColor}88` : '#333'}`,
                          borderRadius: '4px', color: '#fff', fontSize: '0.85rem',
                          fontFamily: 'monospace', fontWeight: 700,
                        }}
                      />
                      <span style={{ fontSize: '0.6rem', color: '#606080', minWidth: '72px' }}>
                        default: $1,000
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Win the Wall: per-song prize/label editor.
              Songs 1-6, each accepts a free text value. Numbers are formatted as cash and
              paid out on a correct buzz; non-numeric strings are display-only labels (e.g.
              "DOUBLE" at song 4 — the doubling mechanic is hard-coded server-side, the
              label is just what the audience reads on the ladder). Empty = blank row. */}
          {activeRoundTab === 'win-the-wall' && (() => {
            const songs: { song: 1 | 2 | 3 | 4 | 5 | 6; hint: string }[] = [
              { song: 6, hint: 'JACKPOT (number = cash, e.g. 250000)' },
              { song: 5, hint: 'leave blank for no payout' },
              { song: 4, hint: 'DOUBLE milestone (banked × 2 mechanic is fixed)' },
              { song: 3, hint: 'leave blank for no payout' },
              { song: 2, hint: 'leave blank for no payout' },
              { song: 1, hint: 'leave blank for no payout' },
            ];
            return (
              <div style={{ marginTop: '14px', padding: '12px', background: '#0a0a1a', border: '1px solid #ffd70044', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.72rem', color: '#ffd700', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  Prize ladder (host-configurable)
                </div>
                <div style={{ fontSize: '0.65rem', color: '#8080a0', marginBottom: '10px', fontStyle: 'italic' }}>
                  Type a number (e.g. <b>250000</b>) for cash payouts, or any text label (e.g. <b>DOUBLE</b>) for milestone markers. Leave blank for an empty row. The doubling-banked-money mechanic at song 4 is fixed in code; the label here is what the audience sees on the ladder.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {songs.map(({ song, hint }) => {
                    const override = config.winTheWallPrizes?.[song];
                    const display = typeof override === 'number'
                      ? String(override)
                      : typeof override === 'string'
                        ? override
                        : '';
                    return (
                      <div key={song} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a0a0b0', minWidth: '70px' }}>
                          Song {song}
                        </span>
                        <input
                          type="text"
                          defaultValue={display}
                          placeholder={hint}
                          key={`wtw-song-${song}-${display}`}
                          onBlur={e => {
                            const raw = e.target.value.trim();
                            if (!raw) {
                              emit('host:config-set-wtw-prizes', { [`song${song}`]: null } as any);
                            } else {
                              emit('host:config-set-wtw-prizes', { [`song${song}`]: raw } as any);
                            }
                          }}
                          style={{
                            flex: 1, padding: '6px 8px',
                            background: override != null ? '#ffd70015' : '#1a1a3a',
                            border: `1px solid ${override != null ? '#ffd70088' : '#333'}`,
                            borderRadius: '4px', color: '#fff', fontSize: '0.85rem',
                            fontFamily: 'monospace', fontWeight: 700,
                          }}
                        />
                        {override != null && (
                          <button
                            onClick={() => emit('host:config-set-wtw-prizes', { [`song${song}`]: null } as any)}
                            title="Clear this row"
                            style={{
                              padding: '4px 10px', fontSize: '0.6rem', fontWeight: 700,
                              background: 'transparent', color: '#ff8c00',
                              border: '1px solid #ff8c0066', borderRadius: '4px', cursor: 'pointer',
                            }}
                          >
                            CLEAR
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Win the Wall: 5×3 cell-by-cell song assignment grid, matching the wall layout.
              The snake path runs: bottom L→R (cells 1-5) → middle R→L (cells 6-10) →
              top L→R (cells 11-15). Each cell owns ONE song — whenever WTW needs to start a
              fresh song (round begin, post-correct skip, decline-walkaway), the picker
              loads that cell's song and opens on the cell's instrument stem. Producer
              curates which song fits which starting instrument; a song that opens strong
              on Keys belongs at cells 3, 8, or 13 (all Keys).  */}
          {activeRoundTab === 'win-the-wall' && (() => {
            const byCell = config.winTheWallByCell ?? [];
            // Grid cells in visual order (row 0 = top of wall, row 2 = bottom). Each entry
            // carries its snake index (0-14) + instrument so we can render the right label
            // and write to the right slot on drop.
            const WTW_COLS = ['Drums', 'Bass', 'Keys', 'Guitar', 'Vocals'] as const;
            const COL_META: Record<string, { icon: string; color: string }> = {
              Drums:  { icon: '🥁', color: '#ff4444' },
              Bass:   { icon: '🎸', color: '#ff8800' },
              Keys:   { icon: '🎹', color: '#ffd700' },
              Guitar: { icon: '🎸', color: '#44ff88' },
              Vocals: { icon: '🎤', color: '#00d4ff' },
            };
            // Snake: every row L→R (bottom 0-4, middle 5-9, top 10-14). Rendered visually
            // top→bottom, left→right.
            const snakeIdxFor = (row: number, col: number): number => {
              if (row === 0) return 10 + col;   // top row L→R
              if (row === 1) return 5 + col;    // middle row L→R
              return col;                        // bottom row L→R
            };
            return (
              <div style={{ marginTop: '14px', padding: '12px', background: '#0a0a1a', border: '1px solid #ffd70044', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.72rem', color: '#ffd700', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
                  Wall songs (drag a song into each cell)
                </div>
                <div style={{ fontSize: '0.65rem', color: '#8080a0', marginBottom: '10px', fontStyle: 'italic' }}>
                  Each of the 15 cells holds the song that plays <em>if a new song starts at that position</em>.
                  Snake path: bottom L→R, middle L→R, top L→R (numbers shown top-left of each cell).
                  Pick songs that open strong on the cell's instrument — e.g. a keys-forward intro for the Keys cells (3, 8, 13).
                  Empty cells fall back to the ordered lineup above.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', gap: '6px' }}>
                  {[0, 1, 2].flatMap(row =>
                    [0, 1, 2, 3, 4].map(col => {
                      const snakeIdx = snakeIdxFor(row, col);
                      const instrument = WTW_COLS[col];
                      const meta = COL_META[instrument];
                      const assignedId = byCell[snakeIdx] ?? null;
                      const song = assignedId ? songById(assignedId) : null;
                      const dropId = `wtw-cell-${snakeIdx}`;
                      const isHot = dragOverRound === dropId;
                      return (
                        <div
                          key={snakeIdx}
                          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDragOverRound(dropId); }}
                          onDragLeave={() => setDragOverRound(null)}
                          onDrop={e => {
                            e.preventDefault();
                            setDragOverRound(null);
                            const songId = e.dataTransfer.getData('application/x-wos-song');
                            if (!songId) return;
                            emit('host:config-set-wtw-cell', { cellIndex: snakeIdx, songId });
                          }}
                          style={{
                            position: 'relative', minHeight: '92px',
                            padding: '6px 8px',
                            background: isHot ? `${meta.color}22` : assignedId ? '#1a1a3a' : '#0a0a1a88',
                            border: isHot
                              ? `2px dashed ${meta.color}`
                              : assignedId ? `1px solid ${meta.color}77` : `1px dashed ${meta.color}44`,
                            borderRadius: '6px',
                            display: 'flex', flexDirection: 'column', justifyContent: 'center',
                          }}
                        >
                          {/* Snake index badge */}
                          <div style={{
                            position: 'absolute', top: 3, left: 5,
                            fontSize: '0.55rem', fontWeight: 900,
                            color: meta.color, letterSpacing: '0.05em',
                          }}>
                            #{snakeIdx + 1}
                          </div>
                          {/* Instrument label + icon */}
                          <div style={{
                            position: 'absolute', top: 3, right: 5,
                            fontSize: '0.55rem', fontWeight: 800,
                            color: meta.color, letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            display: 'flex', alignItems: 'center', gap: '2px',
                          }}>
                            <span style={{ fontSize: '0.75rem' }}>{meta.icon}</span>
                            {instrument}
                          </div>
                          {/* Song slot */}
                          <div style={{ marginTop: '14px' }}>
                            {song ? (
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                background: `${meta.color}15`,
                                border: `1px solid ${meta.color}55`,
                                borderRadius: '4px', padding: '5px 6px',
                                fontSize: '0.68rem',
                              }}>
                                <span style={{
                                  flex: 1, color: '#fff', fontWeight: 700,
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                  {song.title}
                                </span>
                                <button
                                  onClick={() => emit('host:config-set-wtw-cell', { cellIndex: snakeIdx, songId: null })}
                                  style={{
                                    background: 'none', border: 'none', color: '#ff6666',
                                    cursor: 'pointer', padding: 0, fontSize: '0.8rem', lineHeight: 1,
                                  }}
                                  title="Clear this cell"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : assignedId ? (
                              // Assigned but the song id isn't in the library right now — surface it clearly
                              <div style={{
                                fontSize: '0.6rem', color: '#ff6666', fontStyle: 'italic',
                                textAlign: 'center', padding: '4px',
                              }}>
                                missing: {assignedId}
                              </div>
                            ) : (
                              <div style={{
                                fontSize: '0.6rem', color: '#606080', fontStyle: 'italic',
                                textAlign: 'center', padding: '4px',
                              }}>
                                drop a song
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}

          {/* R3: title/genre overrides per song in the auction pool */}
          {activeRoundTab === 'music-auction' && (() => {
            const ids = resolveLineup('music-auction');
            if (ids.length === 0) return null;
            return (
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '0.72rem', color: '#a0a0b0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
                  Wall display overrides (optional)
                </div>
                <div style={{ fontSize: '0.65rem', color: '#8080a0', marginBottom: '8px', fontStyle: 'italic' }}>
                  Rename how a song is shown to the audience. Leave blank to use the real title/genre.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {ids.map((id) => {
                    const song = songById(id);
                    if (!song) return null;
                    const override = config.musicAuctionOverrides?.[id] ?? {};
                    return (
                      <div key={id} style={{ ...S.lineupItem, flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 700 }}>
                          {song.title} <span style={{ color: '#8080a0', fontSize: '0.65rem', fontWeight: 400 }}>— {song.artist}</span>
                        </div>
                        <input
                          defaultValue={override.title ?? ''}
                          placeholder={`Display title (default: ${song.title})`}
                          onBlur={e => emit('host:config-set-auction-override', { songId: id, title: e.target.value.trim() || undefined })}
                          style={S.select}
                        />
                        <input
                          defaultValue={override.genre ?? ''}
                          placeholder={`Display genre (default: ${song.genre ?? '—'})`}
                          onBlur={e => emit('host:config-set-auction-override', { songId: id, genre: e.target.value.trim() || undefined })}
                          style={S.select}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* R2: per-group song picker */}
          {activeRoundTab === 'another-level' && (
            <div>
              <div style={{ fontSize: '0.72rem', color: '#a0a0b0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                9 board groups — each plays a specific instrument combo
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {lib.defaults.anotherLevelGroups.map(g => {
                  const currentId = config.anotherLevelGroupSongs?.[g.group] ?? g.songId;
                  const song = songById(currentId);
                  return (
                    <div key={g.group} style={{ ...S.lineupItem, flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                        <span style={{ color: '#ffd700', fontWeight: 900, textTransform: 'uppercase' }}>{g.group}</span>
                        <span style={{ color: '#a0a0b0' }}>{g.instruments.join('+')} · ${g.prize}</span>
                      </div>
                      <select
                        value={currentId}
                        onChange={e => setGroupSong(g.group, e.target.value)}
                        style={S.select}
                      >
                        {lib.songs.map(s => (
                          <option key={s.id} value={s.id}>{s.title} — {s.artist}</option>
                        ))}
                      </select>
                      <div style={{ color: '#8080a0', fontSize: '0.65rem' }}>→ {song?.title ?? '(missing)'}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* R4: per-column target + decoys */}
          {activeRoundTab === 'song-in-5-parts' && (
            <div>
              <div style={{ fontSize: '0.72rem', color: '#a0a0b0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                5 columns — each has its own target song + 2 decoys
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[0, 1, 2, 3, 4].map(col => {
                  const def = lib.defaults.partsColumns.find(c => c.col === col);
                  if (!def) return null;
                  const override = config.partsColumnOverrides?.[col];
                  const targetId = override?.targetSongId ?? def.targetSongId;
                  const d1Id = override?.decoy1SongId ?? def.decoySongIds[0];
                  const d2Id = override?.decoy2SongId ?? def.decoySongIds[1];
                  const apply = (t: string, d1: string, d2: string) => setColumn(col, t, d1, d2);
                  return (
                    <div key={col} style={{ padding: '10px', background: '#1a1a3a', borderRadius: '8px', border: '1px solid #333' }}>
                      <div style={{ color: '#ffd700', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                        Col {col + 1} · {COL_NAMES[col]}
                      </div>
                      <label style={S.label}>🎯 Target (the song to find)</label>
                      <select value={targetId} onChange={e => apply(e.target.value, d1Id, d2Id)} style={S.select}>
                        {lib.songs.map(s => <option key={s.id} value={s.id}>{s.title} — {s.artist}</option>)}
                      </select>
                      <label style={S.label}>Decoy 1</label>
                      <select value={d1Id} onChange={e => apply(targetId, e.target.value, d2Id)} style={S.select}>
                        {lib.songs.map(s => <option key={s.id} value={s.id}>{s.title} — {s.artist}</option>)}
                      </select>
                      <label style={S.label}>Decoy 2</label>
                      <select value={d2Id} onChange={e => apply(targetId, d1Id, e.target.value)} style={S.select}>
                        {lib.songs.map(s => <option key={s.id} value={s.id}>{s.title} — {s.artist}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </div> {/* end colScroll */}
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Styles
// ===========================================================================
const S: Record<string, React.CSSProperties> = {
  container: {
    width: '100vw', height: '100vh',
    background: '#0a0a1a', color: '#fff',
    fontFamily: 'Montserrat, sans-serif',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  loading: {
    width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#ffd700', fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
  },
  topBar: {
    padding: '10px 16px', background: '#12122a', borderBottom: '1px solid #222',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#ffd700', letterSpacing: '0.05em' },
  backLink: { color: '#8b5cf6', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem' },
  btn: {
    padding: '8px 14px', borderRadius: '6px', border: 'none',
    fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: '0.75rem',
    letterSpacing: '0.05em', cursor: 'pointer',
  },
  helpBanner: {
    padding: '10px 16px', background: '#8b5cf615', borderBottom: '1px solid #8b5cf640',
    fontSize: '0.78rem', color: '#c0c0e0', lineHeight: 1.5,
  },
  toast: {
    position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
    background: '#ffd700', color: '#000', padding: '10px 24px', borderRadius: '8px',
    fontWeight: 900, fontSize: '0.85rem', letterSpacing: '0.05em', zIndex: 1000,
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
  },
  main: {
    flex: 1, display: 'flex', gap: '1px', background: '#222', overflow: 'hidden',
  },
  col: {
    display: 'flex', flexDirection: 'column',
    background: '#0a0a1a', padding: '12px',
    width: '340px', minWidth: '300px', overflow: 'hidden',
  },
  colScroll: { flex: 1, overflowY: 'auto', paddingRight: '4px', minHeight: 0 },
  colTitle: { fontSize: '0.9rem', fontWeight: 900, margin: '0 0 10px 0', color: '#a0a0b0', letterSpacing: '0.1em', textTransform: 'uppercase' },
  search: {
    padding: '8px 12px', borderRadius: '6px', border: '1px solid #333',
    background: '#1a1a3a', color: '#fff', fontFamily: 'Montserrat', fontSize: '0.85rem',
    marginBottom: '8px', outline: 'none',
  },
  libraryList: {
    flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px',
  },
  libraryItem: {
    padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
    textAlign: 'left', color: '#fff',
    display: 'flex', flexDirection: 'column', gap: '2px',
    fontFamily: 'Montserrat', transition: 'all 0.15s',
  },
  selectedHeader: {
    padding: '10px 12px', background: '#1a1a3a', borderRadius: '8px', border: '1px solid #ffd70044',
    marginBottom: '10px',
  },
  transport: { display: 'flex', gap: '6px' },
  stemGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '6px',
  },
  stemBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '10px 6px', borderRadius: '8px', border: '2px solid', cursor: 'pointer',
    gap: '3px', fontFamily: 'Montserrat', transition: 'all 0.15s',
  },
  placeholder: {
    padding: '20px', color: '#606080', fontStyle: 'italic', fontSize: '0.85rem', textAlign: 'center',
    background: '#0d0d1a', borderRadius: '6px', border: '1px dashed #333',
  },
  lineupItem: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '8px 10px', background: '#1a1a3a', borderRadius: '6px', border: '1px solid #333',
    fontSize: '0.8rem',
  },
  moveBtn: {
    background: '#333', border: 'none', color: '#ccc', padding: '4px 6px', borderRadius: '4px',
    cursor: 'pointer', fontSize: '0.7rem', minWidth: '22px',
  },
  select: {
    width: '100%', padding: '6px 8px', background: '#0a0a1a', color: '#fff',
    border: '1px solid #333', borderRadius: '4px', fontFamily: 'Montserrat', fontSize: '0.75rem',
    outline: 'none',
  },
  label: {
    display: 'block', fontSize: '0.65rem', color: '#a0a0b0', fontWeight: 700,
    letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '6px', marginBottom: '3px',
  },
  onboardOverlay: {
    position: 'fixed', inset: 0, zIndex: 2000,
    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    overflow: 'auto',
  },
  onboardCard: {
    background: 'linear-gradient(180deg, #1a1a3a, #0a0a1a)',
    border: '2px solid #8b5cf6', borderRadius: '16px',
    padding: 'clamp(20px, 3vw, 32px)',
    maxWidth: '640px', width: '100%',
    boxShadow: '0 0 60px #8b5cf650, 0 0 120px #8b5cf620',
    color: '#fff',
  },
  onboardP: {
    fontSize: '0.95rem', lineHeight: 1.5, color: '#c0c0e0', margin: '0 0 20px 0',
  },
  onboardStep: {
    display: 'flex', gap: '14px', marginBottom: '14px', alignItems: 'flex-start',
  },
  onboardBadge: {
    minWidth: '32px', height: '32px',
    background: '#8b5cf6', color: '#fff',
    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 900, fontSize: '1rem',
  },
  onboardStepTitle: {
    fontSize: '1rem', fontWeight: 900, color: '#ffd700', marginBottom: '4px',
  },
  onboardStepBody: {
    fontSize: '0.82rem', color: '#c0c0e0', lineHeight: 1.5,
  },
};
