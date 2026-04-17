import { useSocket } from '../hooks/useSocket';
import { useAudioEngine } from '../hooks/useAudioEngine';
import type { RoundType, HostState } from '@shared/types';
import { formatMoney, ROUND_NAMES } from '@shared/types';

export function HostScreen() {
  const audioEngine = useAudioEngine();
  const { connected, hostState, emit } = useSocket({
    role: 'host',
    onAudioCommand: audioEngine.handleAudioCommand,
  });
  if (!connected) {
    return <div style={styles.container}><div style={styles.loading}>Connecting...</div></div>;
  }
  if (!hostState) {
    return <div style={styles.container}><div style={styles.loading}>Waiting for state...</div></div>;
  }

  const { phase, roundType, roundName, songNumber, totalSongs, currentSong,
    activeStems, totalStems, isAudioPlaying, currentPrize, buzzedPlayer,
    players, connections, songList,
    auctionOffers, auctionCurrentOffer,
    auctionBids, auctionWinner, auctionBothSubmitted, auctionTimer, genre,
    songParts, currentPartIndex, anotherLevelConfig,
    partsTargetRow, partsTargetSongTitle, partsSongs } = hostState;

  const isGameActive = phase !== 'lobby' && phase !== 'round-complete' && phase !== 'game-over';

  return (
    <div style={styles.container}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.topLeft}>
          <span style={styles.logo}>WOS HOST</span>
          <ConnectionDots connections={connections} />
        </div>
        <div style={styles.topCenter}>
          <span style={styles.phaseBadge}>{phase.toUpperCase().replace(/-/g, ' ')}</span>
          {roundType && <span style={styles.roundLabel}>{roundName}</span>}
        </div>
        <div style={styles.topRight}>
          <PlayerScoreChip name={players[1].name} score={players[1].score} color="#00d4ff" />
          <PlayerScoreChip name={players[2].name} score={players[2].score} color="#ff00aa" />
        </div>
      </div>

      <div style={styles.content}>
        {/* LEFT: sticky wall preview — always in view while host scrolls controls on the right */}
        <div style={styles.leftCol}>
          <div style={{ ...styles.section, padding: '8px' }}>
            <h2 style={{ ...styles.sectionTitle, marginBottom: '6px' }}>Wall Preview</h2>
            <div style={styles.previewContainer}>
              <iframe
                src="/wall?preview"
                style={styles.previewIframe}
                title="Wall Preview"
              />
            </div>
          </div>
        </div>

        {/* RIGHT: scrollable control stack */}
        <div style={styles.rightCol}>

        {/* ============================================ */}
        {/* LOBBY / ROUND COMPLETE: Round Selection      */}
        {/* ============================================ */}
        {(phase === 'lobby' || phase === 'round-complete') && (
          <>
            {/* Connection status card in lobby */}
            {phase === 'lobby' && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Connections</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <ConnectionRow label="Wall Display" connected={connections.wall > 0} path="/wall" />
                  <ConnectionRow label={`Player 1: ${players[1].name}`} connected={connections.player1} path="/player/1" color="#00d4ff" />
                  <ConnectionRow label={`Player 2: ${players[2].name}`} connected={connections.player2} path="/player/2" color="#ff00aa" />
                </div>
                <div style={{ marginTop: '8px', fontSize: '0.7rem', color: '#606080' }}>
                  Open these URLs on other devices (same network)
                </div>
              </div>
            )}

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Select Round</h2>
              <div style={styles.roundGrid}>
                {(['5to1', 'another-level', 'music-auction', 'song-in-5-parts'] as RoundType[]).map(r => (
                  <button key={r} onClick={() => emit('host:select-round', { round: r })} style={styles.roundCard}>
                    <div style={styles.roundCardTitle}>{ROUND_NAMES[r]}</div>
                    <div style={styles.roundCardDesc}>{roundDescs[r]}</div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ============================================ */}
        {/* ACTIVE GAME: Song Info + Controls             */}
        {/* ============================================ */}
        {isGameActive && (
          <>
            {/* Song Info Bar */}
            <div style={styles.section}>
              <div style={styles.songInfo}>
                <h3 style={styles.songTitle}>
                  {roundType === 'song-in-5-parts' && partsTargetSongTitle
                    ? `FIND: ${partsTargetSongTitle}`
                    : currentSong ? `${currentSong.title} - ${currentSong.artist}` : 'No song loaded'}
                </h3>
                {totalSongs > 0 && <span style={styles.songProgress}>Song {songNumber}/{totalSongs}</span>}
                {currentPrize > 0 && <span style={styles.prizeTag}>Prize: {formatMoney(currentPrize)}</span>}
                {genre && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00d4ff', background: '#00d4ff22', padding: '2px 10px', borderRadius: '8px' }}>
                    {genre}
                  </span>
                )}
                {roundType === 'another-level' && anotherLevelConfig[songNumber - 1] && (
                  <span style={styles.prizeTag}>
                    {anotherLevelConfig[songNumber - 1].stemInstruments.join(' + ')}
                  </span>
                )}
              </div>
              {/* Another Level: song summary (highlight = currently playing group, dim = done) */}
              {roundType === 'another-level' && anotherLevelConfig.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                  {anotherLevelConfig.map((cfg) => {
                    const isNow = cfg.group === hostState.anotherLevelCurrentGroup;
                    const isDone = hostState.anotherLevelCompletedGroups?.includes(cfg.group);
                    return (
                      <div key={cfg.group} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '4px 8px', borderRadius: '4px',
                        background: isNow ? '#ffd70022' : '#1a1a3a',
                        border: `1px solid ${isNow ? '#ffd700' : '#333'}`,
                        fontSize: '0.75rem',
                        opacity: isDone && !isNow ? 0.5 : 1,
                      }}>
                        <span style={{ color: isNow ? '#ffd700' : '#fff', fontWeight: isNow ? 800 : 400 }}>
                          {cfg.stemInstruments.join(' + ')}
                        </span>
                        <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#ffd700', fontFamily: 'Montserrat' }}>
                          {formatMoney(cfg.prize)}
                        </span>
                        {isNow && (
                          <span style={{ fontSize: '0.65rem', background: '#ffd700', color: '#000', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            NOW
                          </span>
                        )}
                        {isDone && !isNow && (
                          <span style={{ fontSize: '0.65rem', color: '#606070', fontWeight: 700 }}>
                            DONE
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Song in 5 Parts: 3 songs (target + 2 herrings) — now scattered across the whole wall */}
              {roundType === 'song-in-5-parts' && partsSongs && partsSongs.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                  {partsSongs.map((s) => (
                    <div key={s.row} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '4px 8px', borderRadius: '4px',
                      background: s.row === partsTargetRow ? '#ffd70022' : '#1a1a3a',
                      border: `1px solid ${s.row === partsTargetRow ? '#ffd700' : '#333'}`,
                      fontSize: '0.75rem',
                    }}>
                      <span style={{ color: s.row === partsTargetRow ? '#ffd700' : '#fff', fontWeight: s.row === partsTargetRow ? 800 : 400 }}>
                        {s.title} — {s.artist}
                      </span>
                      {s.row === partsTargetRow && (
                        <span style={{ marginLeft: 'auto', fontSize: '0.65rem', background: '#ffd700', color: '#000', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          TARGET
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ============================================ */}
            {/* ANOTHER LEVEL: Clickable 5×3 grid              */}
            {/* ============================================ */}
            {roundType === 'another-level' && hostState.anotherLevelCells && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Another Level</h2>

                {phase === 'another-level-board' && (
                  <div style={{ fontSize: '0.8rem', color: '#a0a0b0', marginBottom: '8px' }}>
                    Click the square contestants picked — plays its group's song with those instruments.
                  </div>
                )}

                {/* 5×3 grid matching the wall */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '6px',
                  marginBottom: '10px',
                }}>
                  {hostState.anotherLevelCells.map(cell => {
                    const done = hostState.anotherLevelCompletedGroups?.includes(cell.group) ?? false;
                    const isNow = cell.group === hostState.anotherLevelCurrentGroup;
                    const prizeLabel = cell.prize >= 1000 ? `$${cell.prize / 1000}k` : `$${cell.prize}`;
                    return (
                      <button
                        key={`${cell.row}-${cell.col}`}
                        disabled={done && !isNow}
                        onClick={() => emit('host:al-select-group', { group: cell.group })}
                        title={`${cell.instrument} • ${cell.group} group`}
                        style={{
                          aspectRatio: '1',
                          background: isNow
                            ? `linear-gradient(180deg, ${cell.color}55, ${cell.color}30)`
                            : done
                              ? `linear-gradient(180deg, ${cell.color}10, ${cell.color}05)`
                              : `linear-gradient(180deg, ${cell.color}25, ${cell.color}15)`,
                          border: `2px solid ${isNow ? cell.color : cell.color + '55'}`,
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px',
                          color: '#fff',
                          cursor: done && !isNow ? 'not-allowed' : 'pointer',
                          opacity: done && !isNow ? 0.35 : 1,
                          padding: '4px',
                          transition: 'all 0.2s',
                        }}
                      >
                        <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{cell.icon}</span>
                        <span style={{ fontSize: '0.65rem', color: cell.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {cell.instrument}
                        </span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 900, fontFamily: 'Montserrat', color: '#ffd700' }}>
                          {prizeLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Back to Board — during/after a song plays */}
                {phase !== 'another-level-board' && hostState.anotherLevelCurrentGroup && (
                  <button
                    onClick={() => emit('host:al-back-to-board')}
                    style={{
                      ...styles.controlBtn,
                      background: '#00d4ff',
                      color: '#000',
                      width: '100%',
                      padding: '10px',
                      fontWeight: 900,
                    }}
                  >
                    ← BACK TO THE BOARD
                  </button>
                )}

                {hostState.anotherLevelCompletedGroups && hostState.anotherLevelCompletedGroups.length > 0 && (
                  <div style={{ fontSize: '0.7rem', color: '#a0a0b0', marginTop: '6px' }}>
                    Done: {hostState.anotherLevelCompletedGroups.length}/{hostState.anotherLevelPlayableGroups?.length ?? 0}
                  </div>
                )}
              </div>
            )}

            {/* ============================================ */}
            {/* MUSIC AUCTION: Offer + Bidding Controls        */}
            {/* ============================================ */}
            {roundType === 'music-auction' && (phase === 'auction-offers' || phase === 'auction-bidding' || phase === 'auction-reveal' || phase === 'playing' || phase === 'buzzed' || phase === 'judging' || phase === 'wrong-other-player' || phase === 'result') && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Music Auction</h2>

                {/* Timer display */}
                {auctionTimer != null && auctionTimer > 0 && (
                  <div style={{
                    textAlign: 'center', padding: '8px', marginBottom: '10px',
                    background: auctionTimer <= 10 ? '#ff444422' : '#ffd70022',
                    borderRadius: '8px', border: `1px solid ${auctionTimer <= 10 ? '#ff4444' : '#ffd700'}`,
                  }}>
                    <span style={{
                      fontSize: '1.5rem', fontWeight: 900, fontFamily: 'Montserrat',
                      color: auctionTimer <= 10 ? '#ff4444' : '#ffd700',
                    }}>
                      {auctionTimer}s
                    </span>
                  </div>
                )}

                {/* Show revealed offers */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                  {auctionOffers.map((offer, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 12px', borderRadius: '6px',
                      background: offer.revealed ? `${offer.color}22` : '#1a1a3a',
                      border: `1px solid ${offer.revealed ? offer.color : '#333'}`,
                      opacity: offer.revealed ? 1 : 0.4,
                    }}>
                      <span>{offer.icon}</span>
                      <span style={{ fontSize: '0.85rem', color: offer.revealed ? '#fff' : '#666' }}>
                        {offer.instrument}
                      </span>
                      <span style={{ marginLeft: 'auto', fontWeight: 800, color: '#ffd700', fontFamily: 'Montserrat' }}>
                        {offer.revealed ? formatMoney(offer.prize) : '???'}
                      </span>
                      {offer.revealed && i === auctionCurrentOffer && phase === 'auction-offers' && (
                        <span style={{ fontSize: '0.7rem', background: '#ffd700', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          CURRENT
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Phase: Offers — NEXT OFFER + START BIDDING buttons */}
                {phase === 'auction-offers' && (
                  <div style={styles.buttonRow}>
                    <button
                      onClick={() => emit('host:auction-next-offer')}
                      disabled={auctionCurrentOffer >= auctionOffers.length - 1}
                      style={{
                        ...styles.controlBtn,
                        background: auctionCurrentOffer < auctionOffers.length - 1 ? '#ffd700' : '#333',
                        color: '#000',
                        opacity: auctionCurrentOffer < auctionOffers.length - 1 ? 1 : 0.4,
                      }}
                    >
                      NEXT OFFER
                    </button>
                    <button
                      onClick={() => emit('host:auction-start-bidding')}
                      disabled={auctionCurrentOffer < 0}
                      style={{
                        ...styles.controlBtn,
                        background: auctionCurrentOffer >= 0 ? '#00ff88' : '#333',
                        color: '#000',
                        opacity: auctionCurrentOffer >= 0 ? 1 : 0.4,
                      }}
                    >
                      START BIDDING
                    </button>
                  </div>
                )}

                {/* Phase: Bidding — show bid status + REVEAL BIDS */}
                {phase === 'auction-bidding' && (
                  <>
                    <div style={{
                      display: 'flex', gap: '12px', marginBottom: '10px',
                    }}>
                      <div style={{
                        flex: 1, padding: '10px', borderRadius: '8px', textAlign: 'center',
                        background: auctionBids?.player1 != null ? '#00d4ff22' : '#1a1a3a',
                        border: `1px solid ${auctionBids?.player1 != null ? '#00d4ff' : '#333'}`,
                      }}>
                        <div style={{ fontSize: '0.7rem', color: '#00d4ff', fontWeight: 700, fontFamily: 'Montserrat' }}>
                          {players[1].name}
                        </div>
                        <div style={{
                          fontSize: '1rem', fontWeight: 900, fontFamily: 'Montserrat',
                          color: auctionBids?.player1 != null ? '#00ff88' : '#666',
                          marginTop: '4px',
                        }}>
                          {auctionBids?.player1 != null ? 'LOCKED IN' : 'Waiting...'}
                        </div>
                      </div>
                      <div style={{
                        flex: 1, padding: '10px', borderRadius: '8px', textAlign: 'center',
                        background: auctionBids?.player2 != null ? '#ff00aa22' : '#1a1a3a',
                        border: `1px solid ${auctionBids?.player2 != null ? '#ff00aa' : '#333'}`,
                      }}>
                        <div style={{ fontSize: '0.7rem', color: '#ff00aa', fontWeight: 700, fontFamily: 'Montserrat' }}>
                          {players[2].name}
                        </div>
                        <div style={{
                          fontSize: '1rem', fontWeight: 900, fontFamily: 'Montserrat',
                          color: auctionBids?.player2 != null ? '#00ff88' : '#666',
                          marginTop: '4px',
                        }}>
                          {auctionBids?.player2 != null ? 'LOCKED IN' : 'Waiting...'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => emit('host:auction-reveal-bids')}
                      disabled={!auctionBothSubmitted}
                      style={{
                        ...styles.controlBtn,
                        background: auctionBothSubmitted ? '#ffd700' : '#333',
                        color: '#000',
                        opacity: auctionBothSubmitted ? 1 : 0.4,
                        width: '100%',
                      }}
                    >
                      REVEAL BIDS
                    </button>
                  </>
                )}

                {/* After reveal: show bids + winner */}
                {auctionBids && auctionBids.player1 != null && auctionBids.player2 != null && phase !== 'auction-offers' && phase !== 'auction-bidding' && (
                  <div style={{
                    display: 'flex', gap: '12px', marginTop: '10px',
                    padding: '10px', background: '#0a0a1a', borderRadius: '8px',
                  }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#00d4ff', fontWeight: 700 }}>{players[1].name}</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: auctionWinner === 1 || auctionWinner === 'tied' ? '#00ff88' : '#666' }}>
                        {auctionBids.player1} musician{auctionBids.player1 > 1 ? 's' : ''}
                      </div>
                      {auctionWinner === 1 && <div style={{ fontSize: '0.7rem', color: '#00ff88', fontWeight: 700 }}>WINNER</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#ffd700', fontWeight: 900, fontSize: '0.9rem' }}>VS</div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#ff00aa', fontWeight: 700 }}>{players[2].name}</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: auctionWinner === 2 || auctionWinner === 'tied' ? '#00ff88' : '#666' }}>
                        {auctionBids.player2} musician{auctionBids.player2 > 1 ? 's' : ''}
                      </div>
                      {auctionWinner === 2 && <div style={{ fontSize: '0.7rem', color: '#00ff88', fontWeight: 700 }}>WINNER</div>}
                    </div>
                    {auctionWinner === 'tied' && (
                      <div style={{ position: 'absolute', bottom: '-14px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.7rem', color: '#ffd700', fontWeight: 700 }}>
                        TIE — BUZZ RACE!
                      </div>
                    )}
                  </div>
                )}

                {/* Reveal phase: pause for audience to absorb bids, then host kicks off the music */}
                {phase === 'auction-reveal' && (
                  <button
                    onClick={() => emit('host:auction-start-music')}
                    style={{
                      ...styles.controlBtn,
                      background: '#00ff88', color: '#000', width: '100%',
                      marginTop: '10px', fontWeight: 900, padding: '14px', fontSize: '1rem',
                    }}
                  >
                    ▶ PLAY MUSIC
                  </button>
                )}
              </div>
            )}

            {/* ============================================ */}
            {/* SONG IN 5 PARTS v2: Column-hunt controls      */}
            {/* ============================================ */}
            {roundType === 'song-in-5-parts' && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Column Hunt</h2>

                {(() => {
                  const colNames = ['Vocals', 'Guitar', 'Keys', 'Bass', 'Drums'];
                  const currCol = hostState.partsCurrentCol ?? -1;
                  const currRow = hostState.partsCurrentRow ?? 0;
                  const passCount = hostState.partsPassCount ?? 0;
                  const winners = hostState.partsColumnWinners ?? [null, null, null, null, null];
                  const forfeits = hostState.partsColumnForfeits ?? [false, false, false, false, false];
                  const locked = hostState.partsLockedPlayers ?? [];
                  const roundOver = phase === 'round-complete';
                  const notStarted = currCol < 0;
                  const colResolved = currCol >= 0 && (winners[currCol] || forfeits[currCol]);

                  return (
                    <>
                      {/* Column status row */}
                      <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px',
                        marginBottom: '10px',
                      }}>
                        {colNames.map((name, col) => {
                          const winner = winners[col];
                          const forfeit = forfeits[col];
                          const isCurrent = col === currCol;
                          const bg = winner ? (winner.player === 1 ? '#00d4ff33' : '#ff00aa33')
                                   : forfeit ? '#44444433'
                                   : isCurrent ? '#ffd70022' : '#1a1a3a';
                          const border = winner ? (winner.player === 1 ? '#00d4ff' : '#ff00aa')
                                      : forfeit ? '#666'
                                      : isCurrent ? '#ffd700' : '#333';
                          return (
                            <div key={col} style={{
                              padding: '6px 2px', borderRadius: '4px',
                              background: bg, border: `1px solid ${border}`,
                              textAlign: 'center', fontSize: '0.7rem', fontFamily: 'Montserrat',
                            }}>
                              <div style={{ fontWeight: 800, color: isCurrent ? '#ffd700' : '#a0a0b0' }}>{name}</div>
                              <div style={{ fontSize: '0.65rem', color: winner ? '#fff' : forfeit ? '#888' : '#606080', marginTop: '2px' }}>
                                {winner ? `P${winner.player} +$1k`
                                 : forfeit ? 'forfeit'
                                 : isCurrent ? `R${currRow} · pass ${passCount + 1}/2`
                                 : '—'}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Locked players indicator (current column) */}
                      {locked.length > 0 && (
                        <div style={{ fontSize: '0.7rem', color: '#ff6b6b', marginBottom: '8px' }}>
                          Locked this column: {locked.map(p => `P${p}`).join(', ')}
                        </div>
                      )}

                      {/* Host-only cell-song map: which song lives in each (row, col) scatter slot.
                          Target (songIndex=0) = GOLD, decoys = dim. Current cell is boxed. */}
                      {hostState.partsScatter && partsSongs && partsSongs.length === 3 && (
                        <div style={{ marginBottom: '10px' }}>
                          <div style={{ fontSize: '0.65rem', color: '#a0a0b0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                            Scatter (your eyes only)
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px' }}>
                            {[1, 2, 3].map(row => colNames.map((_, col) => {
                              const slot = hostState.partsScatter?.find(s => s.row === row && s.col === col);
                              const songTitle = slot ? partsSongs[slot.songIndex]?.title ?? '?' : '?';
                              const isTarget = slot?.songIndex === 0;
                              const isCurrent = col === currCol && row === currRow && !colResolved;
                              return (
                                <div key={`${row}-${col}`} style={{
                                  padding: '4px 3px', borderRadius: '3px',
                                  background: isTarget ? '#ffd70022' : '#1a1a3a',
                                  border: `1px solid ${isCurrent ? '#ffd700' : isTarget ? '#ffd70044' : '#333'}`,
                                  boxShadow: isCurrent ? '0 0 8px #ffd70080' : 'none',
                                  fontSize: '0.55rem', fontFamily: 'Montserrat', fontWeight: 700,
                                  color: isTarget ? '#ffd700' : '#a0a0b0',
                                  textAlign: 'center',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }} title={`${colNames[col]} · Row ${row} · ${songTitle}`}>
                                  {songTitle.slice(0, 12)}
                                </div>
                              );
                            }))}
                          </div>
                        </div>
                      )}

                      {/* Primary action button(s) */}
                      {!roundOver && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {notStarted ? (
                            <button
                              onClick={() => emit('host:parts-start-column', { col: 0 })}
                              style={{ ...styles.controlBtn, background: '#ffd700', color: '#000', width: '100%', fontWeight: 900 }}
                            >
                              START COLUMN 1 ({colNames[0].toUpperCase()})
                            </button>
                          ) : colResolved ? (
                            <button
                              onClick={() => emit('host:parts-next-column')}
                              style={{ ...styles.controlBtn, background: '#00d4ff', color: '#000', width: '100%', fontWeight: 900 }}
                            >
                              {currCol >= 4 ? 'FINISH ROUND' : `→ COLUMN ${currCol + 2} (${colNames[currCol + 1]?.toUpperCase() ?? ''})`}
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => emit('host:parts-next-stem')}
                                disabled={buzzedPlayer != null}
                                style={{
                                  ...styles.controlBtn,
                                  background: buzzedPlayer != null ? '#333' : '#ffd700',
                                  color: buzzedPlayer != null ? '#666' : '#000',
                                  opacity: buzzedPlayer != null ? 0.5 : 1,
                                  width: '100%', fontWeight: 900, padding: '14px',
                                }}
                              >
                                ▶ NEXT STEM (row {currRow} → {currRow === 3 ? 1 : currRow + 1})
                              </button>
                              <button
                                onClick={() => emit('host:parts-reveal')}
                                style={{ ...styles.controlBtn, background: '#666', color: '#fff', width: '100%' }}
                              >
                                REVEAL TARGET (end this column)
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      <div style={{ fontSize: '0.65rem', color: '#606080', marginTop: '6px', fontStyle: 'italic' }}>
                        Host controls pacing: press NEXT STEM when ready. Buzz claims whichever cell is currently playing. Wrong = player locked for this column. After 2 full passes NEXT STEM auto-reveals.
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* ============================================ */}
            {/* UNIVERSAL: Audio Controls                     */}
            {/* ============================================ */}
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Audio</h2>
              <div style={styles.buttonRow}>
                <button
                  onClick={() => emit(isAudioPlaying ? 'host:pause' : 'host:play')}
                  style={{
                    ...styles.controlBtn,
                    background: isAudioPlaying ? '#ff4444' : '#00ff88',
                    color: '#000',
                  }}
                >
                  {isAudioPlaying ? 'PAUSE' : 'PLAY'}
                </button>
                <button
                  onClick={() => emit('host:stop')}
                  style={{ ...styles.controlBtn, background: '#333', color: '#fff' }}
                >
                  STOP
                </button>
                <button
                  onClick={() => emit('host:reveal-song')}
                  disabled={!currentSong}
                  style={{
                    ...styles.controlBtn,
                    background: currentSong ? '#ffd700' : '#333',
                    color: '#000',
                    opacity: currentSong ? 1 : 0.4,
                    flex: 'none', padding: '12px 20px', fontWeight: 900,
                  }}
                >
                  REVEAL SONG
                </button>
                <button
                  onClick={() => emit('host:test-tone')}
                  style={{ ...styles.controlBtn, background: '#ffd70022', color: '#ffd700', border: '1px solid #ffd70044', flex: 'none', padding: '12px 20px' }}
                >
                  TEST TONE
                </button>
              </div>
            </div>

            {/* ============================================ */}
            {/* UNIVERSAL: Musician Controls                  */}
            {/* ============================================ */}
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Musicians ({activeStems.length}/{totalStems})</h2>
              <div style={styles.stemGrid}>
                {currentSong?.stems.map(stem => {
                  const isActive = activeStems.includes(stem.id);
                  return (
                    <button
                      key={stem.id}
                      onClick={() => emit('host:set-stem', { stemId: stem.id, active: !isActive })}
                      style={{
                        ...styles.stemBtn,
                        background: isActive ? `${stem.color}33` : '#1a1a3a',
                        borderColor: isActive ? stem.color : '#333',
                        color: isActive ? stem.color : '#666',
                      }}
                    >
                      <span>{stem.icon}</span>
                      <span style={{ fontSize: '0.7rem' }}>{stem.instrument}</span>
                    </button>
                  );
                })}
              </div>
              <div style={styles.buttonRow}>
                <button
                  onClick={() => emit('host:add-musician')}
                  disabled={activeStems.length >= totalStems}
                  style={{
                    ...styles.controlBtn,
                    background: activeStems.length < totalStems ? '#ffd700' : '#333',
                    color: '#000',
                    opacity: activeStems.length < totalStems ? 1 : 0.4,
                  }}
                >
                  + ADD NEXT
                </button>
                <button
                  onClick={() => emit('host:reveal-all')}
                  style={{ ...styles.controlBtn, background: '#8b5cf6', color: '#fff' }}
                >
                  REVEAL ALL
                </button>
              </div>
            </div>

            {/* ============================================ */}
            {/* UNIVERSAL: Buzz / Judge Panel (sticky to top) */}
            {/* ============================================ */}
            {buzzedPlayer && (phase === 'buzzed' || phase === 'judging' || phase === 'wrong-other-player') && (
              <div style={{
                ...styles.section,
                border: '3px solid #ffd700',
                position: 'sticky',
                top: '0',
                zIndex: 100,
                background: 'linear-gradient(180deg, #2a2010, #1a1a1a)',
                boxShadow: '0 4px 20px rgba(255, 215, 0, 0.4)',
                animation: 'glow-pulse 1.2s ease-in-out infinite',
              }}>
                <h2 style={{ ...styles.sectionTitle, color: '#ffd700', fontSize: '1.2rem' }}>
                  🔔 {players[buzzedPlayer].name} BUZZED IN — JUDGE NOW
                </h2>
                <div style={styles.buttonRow}>
                  <button onClick={() => emit('host:mark-correct')} style={{ ...styles.controlBtn, ...styles.correctBtn, fontSize: '1rem', padding: '14px' }}>
                    ✓ CORRECT (+{formatMoney(currentPrize || 1000)})
                  </button>
                  <button onClick={() => emit('host:mark-wrong')} style={{ ...styles.controlBtn, ...styles.wrongBtn, fontSize: '1rem', padding: '14px' }}>
                    ✗ WRONG
                  </button>
                </div>
                {/* Give-to-other only makes sense outside R4 (R4 uses per-column lockout instead) */}
                {roundType !== 'song-in-5-parts' && (
                  <button
                    onClick={() => emit('host:give-to-other')}
                    style={{
                      ...styles.controlBtn,
                      background: '#ff8c00',
                      color: '#000',
                      width: '100%',
                      marginTop: '8px',
                    }}
                  >
                    WRONG — GIVE TO {players[buzzedPlayer === 1 ? 2 : 1].name.toUpperCase()}
                  </button>
                )}
              </div>
            )}

            {/* ============================================ */}
            {/* UNIVERSAL: Song List                          */}
            {/* ============================================ */}
            {songList.length > 0 && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Songs in Round</h2>
                <div style={styles.songList}>
                  {songList.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => emit('host:load-song', { songIndex: i })}
                      style={{
                        ...styles.songListItem,
                        background: i === songNumber - 1 ? '#ffd70022' : '#1a1a3a',
                        borderColor: i === songNumber - 1 ? '#ffd700' : '#333',
                      }}
                    >
                      <span style={styles.songNum}>{i + 1}</span>
                      <span>{s.title}</span>
                      <span style={styles.songArtist}>{s.artist}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================ */}
            {/* UNIVERSAL: Game Flow                          */}
            {/* ============================================ */}
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Game Flow</h2>
              <div style={styles.buttonRow}>
                <button onClick={() => emit('host:next-song')} style={{ ...styles.controlBtn, background: '#00d4ff', color: '#000' }}>
                  NEXT SONG
                </button>
                <button onClick={() => emit('host:end-round')} style={{ ...styles.controlBtn, background: '#666', color: '#fff' }}>
                  END ROUND
                </button>
              </div>
            </div>
          </>
        )}

        {/* ============================================ */}
        {/* UNIVERSAL: Scores (always visible)            */}
        {/* ============================================ */}
        {phase !== 'lobby' && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Scores</h2>
            <div style={{ display: 'flex', gap: '16px' }}>
              <ScoreControl name={players[1].name} score={players[1].score} color="#00d4ff"
                onAdjust={(d) => emit('host:adjust-score', { player: 1, delta: d })} />
              <ScoreControl name={players[2].name} score={players[2].score} color="#ff00aa"
                onAdjust={(d) => emit('host:adjust-score', { player: 2, delta: d })} />
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* UNIVERSAL: Reset / Back                       */}
        {/* ============================================ */}
        <div style={styles.section}>
          <div style={styles.buttonRow}>
            <button onClick={() => emit('host:back-to-lobby')} style={{ ...styles.controlBtn, background: '#333', color: '#fff' }}>
              BACK TO LOBBY
            </button>
            <button onClick={() => { if (confirm('Reset all scores and game state?')) emit('host:reset'); }}
              style={{ ...styles.controlBtn, background: '#440000', color: '#ff4444' }}>
              FULL RESET
            </button>
          </div>
        </div>

        </div> {/* end rightCol */}
      </div>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function ConnectionRow({ label, connected, path, color }: { label: string; connected: boolean; path: string; color?: string }) {
  const baseUrl = window.location.origin;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px',
      background: connected ? '#00ff8810' : '#1a1a3a', borderRadius: '6px',
      border: `1px solid ${connected ? '#00ff8844' : '#333'}`,
    }}>
      <span style={{
        width: '10px', height: '10px', borderRadius: '50%',
        background: connected ? '#00ff88' : '#ff4444',
        boxShadow: connected ? '0 0 6px #00ff88' : 'none',
      }} />
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: color || '#fff' }}>{label}</span>
      <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#606080', fontFamily: 'monospace' }}>
        {baseUrl}{path}
      </span>
      <span style={{ fontSize: '0.65rem', color: connected ? '#00ff88' : '#666', fontWeight: 700 }}>
        {connected ? 'CONNECTED' : 'WAITING'}
      </span>
    </div>
  );
}

function ConnectionDots({ connections }: { connections: any }) {
  const dot = (label: string, ok: boolean) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: ok ? '#00ff88' : '#ff4444' }}>
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: ok ? '#00ff88' : '#ff4444', display: 'inline-block' }} />
      {label}
    </span>
  );
  return (
    <div style={{ display: 'flex', gap: '12px' }}>
      {dot('Wall', connections.wall > 0)}
      {dot('P1', connections.player1)}
      {dot('P2', connections.player2)}
    </div>
  );
}

function PlayerScoreChip({ name, score, color }: { name: string; score: number; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      background: '#1a1a3a', padding: '4px 12px', borderRadius: '16px', border: `1px solid ${color}`,
    }}>
      <span style={{ fontSize: '0.75rem', color }}>{name}</span>
      <span style={{ fontWeight: 800, color: '#ffd700', fontSize: '0.85rem' }}>{formatMoney(score)}</span>
    </div>
  );
}

function ScoreControl({ name, score, color, onAdjust }: {
  name: string; score: number; color: string; onAdjust: (delta: number) => void;
}) {
  return (
    <div style={{ flex: 1, background: '#1a1a3a', border: `1px solid ${color}`, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
      <div style={{ fontSize: '0.8rem', color, fontWeight: 700 }}>{name}</div>
      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffd700', margin: '4px 0' }}>{formatMoney(score)}</div>
      <div style={{ display: 'flex', gap: '4px' }}>
        {[-5000, -1000, 1000, 5000].map(d => (
          <button key={d} onClick={() => onAdjust(d)} style={{
            flex: 1, padding: '6px 2px', fontSize: '0.65rem', fontWeight: 700,
            background: d > 0 ? '#00ff8833' : '#ff444433', color: d > 0 ? '#00ff88' : '#ff4444',
            border: 'none', borderRadius: '4px',
          }}>
            {d > 0 ? '+' : ''}{d / 1000}k
          </button>
        ))}
      </div>
    </div>
  );
}

const roundDescs: Record<RoundType, string> = {
  '5to1': '5 songs. Song 1 plays 5 instruments, song 5 plays just 1. Fewer = harder = more money.',
  'another-level': 'Prize board with 3 levels. Stems play immediately, buzz to guess.',
  'music-auction': 'Musicians make offers, players secretly bid. Fewest musicians wins!',
  'song-in-5-parts': '3 songs scattered across 15 cells. Find the target (announced first). Vocals revealed first, then guitar → drums.',
};

const styles: Record<string, React.CSSProperties> = {
  previewContainer: {
    position: 'relative',
    width: '100%',
    paddingBottom: '56.25%', // 16:9 aspect ratio
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #333',
    background: '#0a0a1a',
  },
  previewIframe: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    border: 'none',
    pointerEvents: 'none', // Prevent accidental clicks
  },
  testToneBtn: {
    padding: '3px 10px',
    borderRadius: '6px',
    fontSize: '0.6rem',
    fontWeight: 800,
    fontFamily: 'Montserrat',
    letterSpacing: '0.08em',
    background: '#ffd70022',
    color: '#ffd700',
    border: '1px solid #ffd70044',
    cursor: 'pointer',
  },
  container: { width: '100vw', height: '100vh', background: '#0a0a1a', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '1.2rem', color: '#a0a0b0' },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: '#12122a', borderBottom: '1px solid #222', flexShrink: 0 },
  topLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  logo: { fontFamily: 'Montserrat', fontWeight: 900, fontSize: '0.9rem', color: '#ffd700' },
  topCenter: { display: 'flex', alignItems: 'center', gap: '12px' },
  phaseBadge: { background: '#ffd70033', color: '#ffd700', padding: '2px 10px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700, fontFamily: 'Montserrat', letterSpacing: '0.1em' },
  roundLabel: { fontSize: '0.85rem', fontWeight: 700, color: '#fff', fontFamily: 'Montserrat' },
  topRight: { display: 'flex', gap: '8px' },
  // Two-column layout: left column is pinned (wall preview always visible); right column scrolls.
  content: { flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'row', gap: '14px', overflow: 'hidden', minHeight: 0 },
  leftCol: { width: '42%', maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden', minHeight: 0 },
  rightCol: { flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'auto', minHeight: 0, paddingRight: '4px' },
  section: { background: '#12122a', border: '1px solid #222', borderRadius: '10px', padding: '12px' },
  sectionTitle: { fontSize: '0.8rem', fontWeight: 700, color: '#a0a0b0', fontFamily: 'Montserrat', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' },
  roundGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  roundCard: { background: '#1a1a3a', border: '2px solid #333', borderRadius: '10px', padding: '16px', textAlign: 'left', color: '#fff' },
  roundCardTitle: { fontFamily: 'Montserrat', fontWeight: 800, fontSize: '0.95rem', color: '#ffd700', marginBottom: '4px' },
  roundCardDesc: { fontSize: '0.75rem', color: '#a0a0b0', lineHeight: 1.3 },
  songInfo: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  songTitle: { fontFamily: 'Montserrat', fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 },
  songProgress: { fontSize: '0.75rem', color: '#a0a0b0', background: '#1a1a3a', padding: '2px 8px', borderRadius: '8px' },
  prizeTag: { fontSize: '0.8rem', fontWeight: 700, color: '#ffd700', background: '#ffd70022', padding: '2px 10px', borderRadius: '8px' },
  buttonRow: { display: 'flex', gap: '8px' },
  controlBtn: { flex: 1, padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 800, fontFamily: 'Montserrat', letterSpacing: '0.05em', border: 'none' },
  correctBtn: { background: '#00ff88', color: '#000' },
  wrongBtn: { background: '#ff4444', color: '#fff' },
  stemGrid: { display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' },
  stemBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '8px 12px', borderRadius: '8px', border: '2px solid', background: '#1a1a3a', minWidth: '60px', fontFamily: 'Montserrat', fontWeight: 700, cursor: 'pointer' },
  songList: { display: 'flex', flexDirection: 'column', gap: '4px' },
  songListItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '6px', border: '1px solid', background: '#1a1a3a', color: '#fff', textAlign: 'left', fontFamily: 'Inter', fontSize: '0.85rem', cursor: 'pointer' },
  songNum: { fontWeight: 800, fontFamily: 'Montserrat', color: '#ffd700', minWidth: '20px' },
  songArtist: { color: '#a0a0b0', fontSize: '0.75rem', marginLeft: 'auto' },
};
