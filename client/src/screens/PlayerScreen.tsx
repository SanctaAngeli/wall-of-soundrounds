import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { formatMoney } from '@shared/types';
import type { PlayerId } from '@shared/types';

interface PlayerScreenProps {
  playerId: PlayerId;
}

// Orange for Player 3 is distinct from P1 cyan and P2 magenta, avoids green (correct)
// and yellow (warning). Matches the hub tile accent.
const PLAYER_COLORS: Record<PlayerId, string> = {
  1: '#00d4ff',
  2: '#ff00aa',
  3: '#ff8c00',
};

export function PlayerScreen({ playerId }: PlayerScreenProps) {
  const audioEngine = useAudioEngine();
  const { connected, playerState, emit } = useSocket({
    role: 'player',
    playerId,
    onAudioCommand: audioEngine.handleAudioCommand,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  // Tracks whether the player has ever submitted/confirmed their name this session.
  // If false and their name is still the "Player N" default, show a blocking modal.
  const [nameConfirmed, setNameConfirmed] = useState(false);

  const handleBuzz = useCallback(() => {
    if (playerState?.canBuzz) {
      emit('player:buzz', { playerId, timestamp: Date.now() });
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(200);
    }
  }, [playerState?.canBuzz, playerId, emit]);

  const handleAuctionBid = useCallback((musicianCount: number) => {
    emit('player:auction-bid', { playerId, musicianCount });
    if (navigator.vibrate) navigator.vibrate(100);
  }, [playerId, emit]);

  const handleNameSubmit = useCallback(() => {
    if (nameInput.trim()) {
      emit('player:set-name', { playerId, name: nameInput.trim() });
      setNameConfirmed(true);
    }
    setIsEditing(false);
  }, [nameInput, playerId, emit]);

  if (!connected) {
    return (
      <div style={styles.container}>
        <div style={styles.status}>Connecting...</div>
      </div>
    );
  }

  if (!playerState) {
    return (
      <div style={styles.container}>
        <div style={styles.status}>Waiting for game...</div>
      </div>
    );
  }

  const { name, score, canBuzz, hasBuzzed, otherBuzzed, phase, roundName,
    songNumber, totalSongs, resultMessage, currentPrize,
    auctionOffers, auctionCanBid, auctionMyBid, auctionOtherBid, auctionWinner, auctionTimer, genre } = playerState;

  // Player color based on ID
  const playerColor = PLAYER_COLORS[playerId];

  // First-time name prompt: block until they enter a real name
  const isDefaultName = name === `Player ${playerId}`;
  if (!nameConfirmed && isDefaultName) {
    return (
      <div style={{
        ...styles.container,
        borderTop: `4px solid ${playerColor}`,
        justifyContent: 'center', alignItems: 'center', gap: '20px', padding: '24px',
      }}>
        <div style={{
          fontSize: '0.8rem', fontWeight: 700, fontFamily: 'Montserrat',
          color: playerColor, letterSpacing: '0.2em', textTransform: 'uppercase',
        }}>
          Player {playerId}
        </div>
        <div style={{
          fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 900, fontFamily: 'Montserrat',
          color: '#fff', textAlign: 'center',
        }}>
          What's your name?
        </div>
        <input
          type="text"
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
          placeholder="Type your name"
          autoFocus
          style={{
            fontSize: '1.2rem', padding: '12px 16px', borderRadius: '10px',
            border: `2px solid ${playerColor}`, background: '#1a1a3a', color: '#fff',
            fontFamily: 'Montserrat', width: '80%', maxWidth: '320px', textAlign: 'center',
            outline: 'none',
          }}
        />
        <button
          onClick={handleNameSubmit}
          disabled={!nameInput.trim()}
          style={{
            padding: '14px 32px', borderRadius: '12px', border: 'none',
            background: nameInput.trim() ? playerColor : '#333',
            color: nameInput.trim() ? '#000' : '#666',
            fontSize: '1rem', fontFamily: 'Montserrat', fontWeight: 900,
            letterSpacing: '0.1em', cursor: nameInput.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          START
        </button>
      </div>
    );
  }

  // Status message based on phase
  let statusText = '';
  if (phase === 'lobby') statusText = 'Waiting for host...';
  else if (phase === 'round-intro') statusText = `${roundName} starting...`;
  else if (phase === 'playing' && !canBuzz) statusText = 'Listen...';
  else if (phase === 'playing' && canBuzz) statusText = 'LISTEN & BUZZ!';
  else if (phase === 'parts-intro') statusText = 'Get ready...';
  else if (phase === 'parts-playing' && canBuzz) statusText = 'LISTEN & BUZZ!';
  else if (phase === 'parts-playing' && !canBuzz) statusText = 'Listen...';
  else if (phase === 'auction-offers') statusText = 'Musicians are making offers...';
  else if (phase === 'auction-bidding' && auctionCanBid) statusText = 'HOW MANY MUSICIANS?';
  else if (phase === 'auction-bidding' && auctionMyBid !== null) statusText = 'Waiting for other player...';
  else if (phase === 'auction-reveal') statusText = 'Revealing bids...';
  else if (phase === 'buzzed' && hasBuzzed) statusText = 'YOU BUZZED!';
  else if (phase === 'buzzed' && otherBuzzed) statusText = 'Other player buzzed';
  else if (phase === 'judging') statusText = 'Waiting for host...';
  else if (phase === 'wrong-other-player' && canBuzz) statusText = 'YOUR TURN! LISTEN & BUZZ!';
  else if (phase === 'wrong-other-player') statusText = 'Other player\'s turn...';
  else if (phase === 'result') statusText = resultMessage || '';
  else if (phase === 'round-complete') statusText = 'Round complete!';

  const isAuctionBidding = phase === 'auction-bidding' || phase === 'auction-offers';

  // Lobby: centered column layout (no wall preview)
  if (phase === 'lobby') {
    return (
      <div style={{
        ...styles.container,
        borderTop: `4px solid ${playerColor}`,
        justifyContent: 'center',
        gap: '16px',
      }}>
        <div style={{ ...styles.playerName, color: playerColor, fontSize: '2rem', textAlign: 'center' }}
          onClick={() => { setNameInput(name); setIsEditing(true); }}>
          {isEditing ? (
            <div style={styles.nameEdit}>
              <input type="text" value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
                placeholder="Your name" autoFocus style={styles.nameInput} />
              <button onClick={handleNameSubmit} style={styles.nameBtn}>OK</button>
            </div>
          ) : (
            <>{name}<span style={styles.editHint}> (tap to edit)</span></>
          )}
        </div>
        <div style={styles.score}>{formatMoney(score)}</div>
        <div style={styles.statusText}>{statusText}</div>
      </div>
    );
  }

  // Game: side-by-side layout — wall preview left, buzz panel right
  return (
    <div style={{
      ...styles.container,
      borderTop: `4px solid ${playerColor}`,
    }}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.topLeft}>
          <span style={{ ...styles.playerName, color: playerColor }}>{name}</span>
        </div>
        <div style={styles.topRight}>
          <div style={styles.roundBadge}>{roundName}</div>
          {totalSongs > 0 && <span style={styles.songInfo}>Song {songNumber}/{totalSongs}</span>}
          <div style={styles.score}>{formatMoney(score)}</div>
        </div>
      </div>

      {/* Main area: preview + buzz side by side */}
      <div style={styles.mainRow}>
        {/* Left: Wall Preview */}
        <div style={styles.previewSide}>
          <div style={styles.previewWrapper}>
            <iframe src="/wall?preview" style={styles.previewIframe} title="Wall Preview" />
          </div>
        </div>

        {/* Right: Buzz / Auction panel */}
        <div style={styles.buzzPanel}>
          {/* Genre label for auction */}
          {genre && (
            <div style={{
              fontSize: '0.7rem', fontWeight: 700, fontFamily: 'Montserrat',
              color: '#ffd700', background: '#1a1a3a', padding: '3px 10px',
              borderRadius: '10px', letterSpacing: '0.1em',
            }}>
              {genre.toUpperCase()}
            </div>
          )}

          {currentPrize > 0 && (
            <div style={styles.prizeInfo}>{formatMoney(currentPrize)}</div>
          )}

          {/* Timer display */}
          {auctionTimer != null && auctionTimer > 0 && (
            <div style={{
              fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 900, fontFamily: 'Montserrat',
              color: auctionTimer <= 10 ? '#ff4444' : '#ffd700',
              textShadow: auctionTimer <= 10 ? '0 0 20px #ff444480' : '0 0 10px #ffd70040',
            }}>
              {auctionTimer}s
            </div>
          )}

          <div style={{
            ...styles.statusText,
            color: resultMessage?.includes('CORRECT') ? '#00ff88' :
              resultMessage?.includes('WRONG') ? '#ff4444' :
              (canBuzz || auctionCanBid) ? '#fff' : '#a0a0b0',
            fontSize: (canBuzz || auctionCanBid) ? 'clamp(0.9rem, 2vw, 1.3rem)' : 'clamp(0.75rem, 1.5vw, 1rem)',
          }}>
            {statusText}
          </div>

          {/* Auction bidding buttons — only during bidding phase */}
          {phase === 'auction-bidding' && auctionOffers && auctionOffers.length > 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '6px',
              width: '100%', maxWidth: '200px',
            }}>
              {auctionOffers.map(offer => {
                const isMyBid = auctionMyBid === offer.musicians;
                const disabled = !auctionCanBid && !isMyBid;
                return (
                  <button
                    key={offer.musicians}
                    onClick={() => auctionCanBid && handleAuctionBid(offer.musicians)}
                    disabled={!auctionCanBid}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: isMyBid ? `2px solid ${playerColor}` : '2px solid #333',
                      background: isMyBid ? `${playerColor}30` : auctionCanBid ? '#1a1a3a' : '#111',
                      color: isMyBid ? playerColor : disabled ? '#555' : '#fff',
                      fontFamily: 'Montserrat', fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: auctionCanBid ? 'pointer' : 'default',
                      opacity: disabled ? 0.4 : 1,
                      display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{offer.musicians} musician{offer.musicians > 1 ? 's' : ''}</span>
                      <span style={{ color: '#ffd700', fontWeight: 900 }}>{formatMoney(offer.prize)}</span>
                    </div>
                    {offer.instruments && offer.instruments.length > 0 && (
                      <div style={{
                        fontSize: '0.65rem', color: disabled ? '#555' : '#a0a0b0',
                        fontWeight: 500, letterSpacing: '0.02em',
                      }}>
                        {offer.instruments.join(' + ')}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Bid result display after reveal */}
          {auctionOtherBid != null && auctionMyBid != null && (
            <div style={{
              padding: '8px', borderRadius: '8px', background: '#1a1a3a',
              textAlign: 'center', fontSize: '0.75rem', fontFamily: 'Montserrat',
              color: '#a0a0b0', width: '100%', maxWidth: '200px',
            }}>
              <div>You: <b style={{ color: playerColor }}>{auctionMyBid}</b></div>
              <div>Them: <b style={{ color: playerId === 1 ? '#ff00aa' : '#00d4ff' }}>{auctionOtherBid}</b></div>
              {auctionWinner && (
                <div style={{
                  color: auctionWinner === playerId ? '#00ff88' : auctionWinner === 'tied' ? '#ffd700' : '#ff4444',
                  fontWeight: 900, marginTop: '4px',
                }}>
                  {auctionWinner === playerId ? 'YOU WIN!' : auctionWinner === 'tied' ? 'TIE — BUZZ RACE!' : 'THEY WIN'}
                </div>
              )}
            </div>
          )}

          {/* Buzz button (hidden during auction bidding) */}
          {!isAuctionBidding && (
            <button
              onClick={handleBuzz}
              disabled={!canBuzz}
              style={{
                ...styles.buzzButton,
                background: canBuzz
                  ? `radial-gradient(circle, ${playerColor}, ${playerColor}99)`
                  : hasBuzzed ? '#ffd700' : '#333',
                boxShadow: canBuzz
                  ? `0 0 30px ${playerColor}80, 0 0 60px ${playerColor}40`
                  : hasBuzzed ? '0 0 30px #ffd70060' : 'none',
                cursor: canBuzz ? 'pointer' : 'default',
                opacity: canBuzz || hasBuzzed ? 1 : 0.4,
                animation: canBuzz ? 'pulse 2s ease-in-out infinite' : 'none',
              }}
            >
              {hasBuzzed ? 'BUZZED!' : 'BUZZ'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100vw',
    height: '100dvh',
    background: '#0a0a1a',
    display: 'flex',
    flexDirection: 'column',
    padding: '8px 12px',
    gap: '8px',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  status: {
    fontSize: '1.2rem',
    color: '#a0a0b0',
    fontFamily: 'Montserrat',
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    flexShrink: 0,
  },
  topLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  topRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  playerName: {
    fontSize: '1.1rem',
    fontFamily: 'Montserrat',
    fontWeight: 800,
  },
  editHint: {
    fontSize: '0.6rem',
    color: '#606080',
    fontWeight: 400,
  },
  nameEdit: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  nameInput: {
    background: '#1a1a3a',
    border: '2px solid #ffd700',
    borderRadius: '6px',
    color: 'white',
    padding: '6px 12px',
    fontSize: '0.95rem',
    fontFamily: 'Montserrat',
    fontWeight: 700,
    outline: 'none',
    width: '150px',
    textAlign: 'center',
  },
  nameBtn: {
    background: '#ffd700',
    color: '#000',
    padding: '6px 12px',
    borderRadius: '6px',
    fontWeight: 700,
    fontSize: '0.85rem',
  },
  score: {
    fontSize: '1.3rem',
    fontFamily: 'Montserrat',
    fontWeight: 900,
    color: '#ffd700',
  },
  roundBadge: {
    background: '#1a1a3a',
    padding: '3px 10px',
    borderRadius: '10px',
    fontSize: '0.65rem',
    fontWeight: 700,
    fontFamily: 'Montserrat',
    letterSpacing: '0.08em',
    color: '#ffd700',
  },
  // Side-by-side main area
  mainRow: {
    flex: 1,
    display: 'flex',
    gap: '12px',
    width: '100%',
    minHeight: 0, // allow flex children to shrink
  },
  previewSide: {
    flex: 3, // 75% of width
    display: 'flex',
    alignItems: 'center',
    minWidth: 0,
  },
  previewWrapper: {
    position: 'relative',
    width: '100%',
    paddingBottom: '56.25%', // true 16:9
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
    pointerEvents: 'none',
  },
  buzzPanel: {
    flex: 1, // 25% of width
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    minWidth: '120px',
  },
  songInfo: {
    fontSize: '0.7rem',
    color: '#a0a0b0',
    fontWeight: 600,
  },
  prizeInfo: {
    fontSize: 'clamp(1rem, 2vw, 1.5rem)',
    color: '#ffd700',
    fontWeight: 900,
    fontFamily: 'Montserrat',
    textShadow: '0 0 10px #ffd70040',
  },
  statusText: {
    fontSize: '0.85rem',
    fontFamily: 'Montserrat',
    fontWeight: 700,
    textAlign: 'center',
    letterSpacing: '0.05em',
  },
  buzzButton: {
    width: 'min(20vw, 140px)',
    height: 'min(20vw, 140px)',
    borderRadius: '50%',
    border: '3px solid rgba(255,255,255,0.2)',
    fontSize: 'clamp(1rem, 3vw, 1.8rem)',
    fontFamily: 'Montserrat',
    fontWeight: 900,
    color: 'white',
    letterSpacing: '0.1em',
    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
    transition: 'all 0.15s ease',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none',
    flexShrink: 0,
  },
};
