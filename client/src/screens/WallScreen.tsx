import { useMemo } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useAudioEngine } from '../hooks/useAudioEngine';
import type { WallMusician } from '@shared/types';
import { formatMoney } from '@shared/types';

// Generate confetti particles once
const CONFETTI_COLORS = ['#ffd700', '#ff8c00', '#00ff88', '#00d4ff', '#ff00aa', '#8b5cf6', '#ff4444'];
function makeConfetti(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
  }));
}

export function WallScreen() {
  const isPreview = window.location.search.includes('preview');
  const audioEngine = useAudioEngine();
  const { connected, wallState } = useSocket({
    role: 'wall',
    onAudioCommand: isPreview ? undefined : audioEngine.handleAudioCommand,
  });
  const confetti = useMemo(() => makeConfetti(40), []);

  if (!connected) {
    return (
      <div style={styles.container}>
        <div style={styles.connecting}>Connecting to server...</div>
      </div>
    );
  }

  if (!wallState) {
    return (
      <div style={styles.container}>
        <div style={styles.connecting}>Waiting for game state...</div>
      </div>
    );
  }

  const { phase, roundName, songNumber, totalSongs, musicians, currentPrize,
    players, buzzedPlayer, visualEffect, songTitle, revealText, message,
    auctionBids, auctionWinner, auctionTimer, genre } = wallState;

  return (
    <div style={styles.container}>
      {/* Background overlay for effects */}
      {visualEffect === 'correct' && (
        <>
          <div style={styles.correctOverlay} />
          {/* Confetti particles */}
          {confetti.map(p => (
            <div key={p.id} style={{
              position: 'absolute',
              left: `${p.left}%`,
              top: '-20px',
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: p.color,
              borderRadius: p.id % 3 === 0 ? '50%' : '2px',
              animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
              zIndex: 30,
              transform: `rotate(${p.rotation}deg)`,
            }} />
          ))}
        </>
      )}
      {visualEffect === 'wrong' && <div style={styles.wrongOverlay} />}
      {visualEffect === 'buzz' && <div style={styles.buzzOverlay} />}
      {visualEffect === 'gold' && <div style={styles.goldOverlay} />}

      {/* Round info header */}
      {phase !== 'lobby' && (
        <div style={styles.header}>
          <div style={styles.roundBadge}>{roundName}</div>
          {totalSongs > 0 && (
            <div style={styles.songCount}>SONG {songNumber} OF {totalSongs}</div>
          )}
        </div>
      )}

      {/* Song title for rounds that show it upfront */}
      {songTitle && !revealText && (phase === 'playing' || phase === 'parts-intro' || phase === 'parts-playing') && (
        <div style={styles.songTitleOverlay}>
          {wallState.roundType === 'song-in-5-parts' ? `FIND: ${songTitle}` : songTitle}
        </div>
      )}

      {/* Host pressed "Reveal Song" — big overlay with title + artist, all rounds */}
      {revealText && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'linear-gradient(180deg, #1a1a3a, #0a0a1a)',
          border: '3px solid #ffd700',
          borderRadius: '20px',
          padding: 'clamp(20px, 3vw, 40px) clamp(40px, 6vw, 80px)',
          boxShadow: '0 0 60px #ffd70060, 0 0 120px #ffd70030',
          zIndex: 50,
          textAlign: 'center',
          animation: 'scale-in 0.4s ease-out',
        }}>
          <div style={{
            fontSize: 'clamp(0.8rem, 1.5vw, 1.2rem)',
            fontWeight: 700, fontFamily: 'Montserrat',
            color: '#a0a0b0', letterSpacing: '0.2em', textTransform: 'uppercase',
            marginBottom: '8px',
          }}>
            The song was
          </div>
          <div style={{
            fontSize: 'clamp(1.5rem, 4vw, 3rem)',
            fontWeight: 900, fontFamily: 'Montserrat',
            color: '#ffd700',
            textShadow: '0 0 20px #ffd70080',
            lineHeight: 1.1,
          }}>
            {revealText}
          </div>
        </div>
      )}

      {/* Center message overlay */}
      {message && (phase === 'result' || phase === 'wrong-other-player') && (
        <div style={{
          ...styles.messageOverlay,
          color: visualEffect === 'correct' ? '#00ff88' : visualEffect === 'wrong' ? '#ff4444' : '#ffd700',
          animation: visualEffect === 'correct' ? 'scale-in 0.4s ease-out' : visualEffect === 'wrong' ? 'shake 0.5s ease-out' : 'slide-up 0.3s ease-out',
        }}>
          {message}
        </div>
      )}

      {/* Lobby state */}
      {phase === 'lobby' && (
        <div style={styles.lobby}>
          <div style={styles.logoGlow} />
          <h1 style={styles.title}>WALL OF SOUND</h1>
          <div style={styles.lobbyDivider} />
          <div style={styles.playerCards}>
            <div style={{
              ...styles.lobbyPlayerCard,
              borderColor: players[1].connected ? '#00d4ff' : '#333',
              boxShadow: players[1].connected ? '0 0 20px #00d4ff30' : 'none',
            }}>
              <div style={{ fontSize: '1.5rem' }}>🎵</div>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 800, color: '#00d4ff', fontSize: '1.1rem' }}>
                {players[1].name}
              </div>
              <div style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: players[1].connected ? '#00ff88' : '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
              }}>
                {players[1].connected ? '● READY' : '○ WAITING'}
              </div>
            </div>
            <div style={styles.lobbyVs}>VS</div>
            <div style={{
              ...styles.lobbyPlayerCard,
              borderColor: players[2].connected ? '#ff00aa' : '#333',
              boxShadow: players[2].connected ? '0 0 20px #ff00aa30' : 'none',
            }}>
              <div style={{ fontSize: '1.5rem' }}>🎵</div>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 800, color: '#ff00aa', fontSize: '1.1rem' }}>
                {players[2].name}
              </div>
              <div style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: players[2].connected ? '#00ff88' : '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
              }}>
                {players[2].connected ? '● READY' : '○ WAITING'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Round intro — show title only (except Another Level which shows the board) */}
      {phase === 'round-intro' && wallState.roundType !== 'another-level' && (
        <div style={styles.roundIntro}>
          <h1 style={styles.roundIntroTitle}>{roundName}</h1>
        </div>
      )}

      {/* The Wall - 5x3 musician grid */}
      {(phase === 'playing' || phase === 'buzzed' || phase === 'judging' ||
        phase === 'result' || phase === 'wrong-other-player' ||
        phase === 'auction-offers' || phase === 'auction-bidding' || phase === 'auction-reveal' ||
        phase === 'parts-intro' || phase === 'parts-playing' ||
        phase === 'another-level-board' ||
        (phase === 'round-intro' && wallState.roundType === 'another-level')) && (
        <div style={styles.wallContainer}>
          <div style={styles.wallGrid}>
            {musicians.map((m) => (
              <MusicianCell key={m.id} musician={m} />
            ))}
          </div>
        </div>
      )}

      {/* Genre label for auction */}
      {genre && phase !== 'lobby' && phase !== 'round-complete' && (
        <div style={{
          position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)',
          fontSize: '1.2rem', fontFamily: 'Montserrat', fontWeight: 700,
          color: '#00d4ff', background: '#0a0a1a99', padding: '4px 20px',
          borderRadius: '20px', border: '1px solid #00d4ff44', zIndex: 10,
          letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>
          {genre}
        </div>
      )}

      {/* Auction timer */}
      {auctionTimer != null && auctionTimer > 0 && (
        <div style={{
          position: 'absolute', top: '50%', right: '40px', transform: 'translateY(-50%)',
          fontSize: 'clamp(2rem, 5vw, 4rem)', fontFamily: 'Montserrat', fontWeight: 900,
          color: auctionTimer <= 10 ? '#ff4444' : '#ffd700',
          textShadow: auctionTimer <= 10 ? '0 0 30px #ff444480' : '0 0 20px #ffd70060',
          zIndex: 15,
          animation: auctionTimer <= 10 ? 'pulse 1s ease-in-out infinite' : 'none',
        }}>
          {auctionTimer}
        </div>
      )}

      {/* Auction bidding status */}
      {phase === 'auction-bidding' && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', fontFamily: 'Montserrat', fontWeight: 900,
          color: '#ffd700', textShadow: '0 0 20px #ffd70060', zIndex: 15,
          textAlign: 'center', animation: 'pulse 2s ease-in-out infinite',
        }}>
          PLAYERS ARE BIDDING...
        </div>
      )}

      {/* Auction bid reveal overlay — big during the reveal pause, shrinks once music plays */}
      {auctionBids && auctionBids.player1 != null && auctionBids.player2 != null &&
        (phase === 'auction-reveal' || phase === 'playing' || phase === 'buzzed' || phase === 'judging' || phase === 'result' || phase === 'wrong-other-player') && (() => {
          const isRevealPhase = phase === 'auction-reveal';
          return (
            <div style={{
              position: 'absolute',
              top: isRevealPhase ? '50%' : '80px',
              left: '50%',
              transform: isRevealPhase ? 'translate(-50%, -50%)' : 'translateX(-50%)',
              display: 'flex',
              gap: isRevealPhase ? '60px' : '30px',
              alignItems: 'center',
              zIndex: 40,
              background: isRevealPhase ? 'linear-gradient(180deg, #1a1a3a, #0a0a1a)' : '#0a0a1acc',
              padding: isRevealPhase ? '32px 60px' : '10px 30px',
              borderRadius: isRevealPhase ? '20px' : '12px',
              border: isRevealPhase ? '3px solid #ffd700' : '1px solid #333',
              boxShadow: isRevealPhase ? '0 0 60px #ffd70060' : 'none',
              animation: isRevealPhase ? 'scale-in 0.4s ease-out' : 'none',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: isRevealPhase ? '1rem' : '0.7rem',
                  color: '#00d4ff', fontWeight: 700, fontFamily: 'Montserrat',
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>{players[1].name}</div>
                <div style={{
                  fontSize: isRevealPhase ? 'clamp(3rem, 7vw, 5rem)' : '1.5rem',
                  fontWeight: 900, fontFamily: 'Montserrat',
                  color: auctionWinner === 1 || auctionWinner === 'tied' ? '#00ff88' : '#666',
                  textShadow: isRevealPhase && (auctionWinner === 1 || auctionWinner === 'tied') ? '0 0 30px #00ff8880' : 'none',
                }}>
                  {auctionBids.player1}
                </div>
                {isRevealPhase && auctionWinner === 1 && (
                  <div style={{ fontSize: '0.85rem', color: '#00ff88', fontWeight: 900, letterSpacing: '0.15em', marginTop: '6px' }}>
                    WINNER
                  </div>
                )}
              </div>
              <div style={{ fontSize: isRevealPhase ? '1.6rem' : '1rem', color: '#ffd700', fontWeight: 900 }}>VS</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: isRevealPhase ? '1rem' : '0.7rem',
                  color: '#ff00aa', fontWeight: 700, fontFamily: 'Montserrat',
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>{players[2].name}</div>
                <div style={{
                  fontSize: isRevealPhase ? 'clamp(3rem, 7vw, 5rem)' : '1.5rem',
                  fontWeight: 900, fontFamily: 'Montserrat',
                  color: auctionWinner === 2 || auctionWinner === 'tied' ? '#00ff88' : '#666',
                  textShadow: isRevealPhase && (auctionWinner === 2 || auctionWinner === 'tied') ? '0 0 30px #00ff8880' : 'none',
                }}>
                  {auctionBids.player2}
                </div>
                {isRevealPhase && auctionWinner === 2 && (
                  <div style={{ fontSize: '0.85rem', color: '#00ff88', fontWeight: 900, letterSpacing: '0.15em', marginTop: '6px' }}>
                    WINNER
                  </div>
                )}
              </div>
              {auctionWinner === 'tied' && (
                <div style={{ fontSize: isRevealPhase ? '1rem' : '0.8rem', color: '#ffd700', fontWeight: 900, letterSpacing: '0.15em' }}>
                  TIE!
                </div>
              )}
            </div>
          );
        })()}

      {/* Current part label for Song in 5 Parts */}
      {wallState.currentPartLabel && (phase === 'parts-playing') && (
        <div style={styles.partLabel}>{wallState.currentPartLabel}</div>
      )}

      {/* Prize display */}
      {currentPrize > 0 && phase !== 'lobby' && phase !== 'round-intro' && (
        <div style={styles.prizeDisplay}>
          <span style={styles.prizeLabel}>PRIZE</span>
          <span style={styles.prizeAmount}>{formatMoney(currentPrize)}</span>
        </div>
      )}

      {/* Buzz indicator */}
      {buzzedPlayer && (phase === 'buzzed' || phase === 'judging') && (
        <div style={styles.buzzIndicator}>
          {players[buzzedPlayer].name} BUZZED!
        </div>
      )}

      {/* Scoreboard */}
      <div style={styles.scoreboard}>
        <ScoreCard name={players[1].name} score={players[1].score} isBuzzed={buzzedPlayer === 1} side="left" />
        <ScoreCard name={players[2].name} score={players[2].score} isBuzzed={buzzedPlayer === 2} side="right" />
      </div>

      {/* Round complete */}
      {phase === 'round-complete' && (
        <div style={styles.roundComplete}>
          <h2 style={{ color: '#a0a0b0', fontSize: '1rem', letterSpacing: '0.3em', fontFamily: 'Montserrat' }}>
            {roundName}
          </h2>
          <h1 style={{ ...styles.title, animation: 'scale-in 0.5s ease-out' }}>ROUND COMPLETE</h1>
          <div style={styles.lobbyDivider} />
          <div style={styles.finalScores}>
            <div style={{
              textAlign: 'center',
              padding: '12px 24px',
              background: players[1].score >= players[2].score ? '#00d4ff15' : 'transparent',
              borderRadius: '8px',
              border: players[1].score > players[2].score ? '1px solid #00d4ff44' : '1px solid transparent',
            }}>
              <div style={{ fontSize: '0.8rem', color: '#00d4ff', marginBottom: '4px' }}>{players[1].name}</div>
              <div style={{ fontSize: '2rem', fontWeight: 900 }}>{formatMoney(players[1].score)}</div>
            </div>
            <div style={{
              textAlign: 'center',
              padding: '12px 24px',
              background: players[2].score >= players[1].score ? '#ff00aa15' : 'transparent',
              borderRadius: '8px',
              border: players[2].score > players[1].score ? '1px solid #ff00aa44' : '1px solid transparent',
            }}>
              <div style={{ fontSize: '0.8rem', color: '#ff00aa', marginBottom: '4px' }}>{players[2].name}</div>
              <div style={{ fontSize: '2rem', fontWeight: 900 }}>{formatMoney(players[2].score)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Individual musician cell on the wall
function MusicianCell({ musician }: { musician: WallMusician }) {
  const { isActive, isPlaying, color, instrument, icon, label, speechText } = musician;

  // Prize board mode: label is set + instrument is empty
  const isPrizeBoard = !!label && !instrument;

  const cellStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: isPrizeBoard
      ? (isActive
        ? `linear-gradient(180deg, ${color}30 0%, ${color}55 50%, ${color}30 100%)`
        : `linear-gradient(180deg, ${color}10 0%, ${color}18 50%, ${color}10 100%)`)
      : (isActive
        ? `linear-gradient(180deg, ${color}15 0%, ${color}35 50%, ${color}15 100%)`
        : 'linear-gradient(180deg, #0d0d20 0%, #080818 100%)'),
    border: `2px solid ${isActive ? color + '88' : isPrizeBoard ? color + '33' : '#1a1a33'}`,
    borderRadius: '10px',
    padding: '8px',
    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    // Let the R3 speech bubble overflow the cell bounds (otherwise it gets clipped above the cell)
    overflow: speechText ? 'visible' : 'hidden',
    zIndex: speechText ? 5 : 'auto',
    boxShadow: isPlaying
      ? `0 0 20px ${color}90, 0 0 40px ${color}50, 0 0 80px ${color}30, inset 0 0 20px ${color}30`
      : isActive
        ? `0 0 10px ${color}40, inset 0 0 8px ${color}15`
        : isPrizeBoard
          ? `inset 0 0 15px ${color}08`
          : 'inset 0 0 20px #00000080',
    animation: isPlaying ? 'cell-playing 2s ease-in-out infinite' : 'none',
    ['--cell-color' as any]: color,
  };

  // Prize board cell: show dollar amount as large centered text
  if (isPrizeBoard) {
    return (
      <div style={cellStyle}>
        {isPlaying && (
          <div style={{
            position: 'absolute',
            inset: '-2px',
            borderRadius: '12px',
            border: `2px solid ${color}`,
            boxShadow: `inset 0 0 30px ${color}30`,
            animation: 'glow-pulse 1.5s ease-in-out infinite',
            color: color,
          }} />
        )}
        <div style={{
          fontSize: 'clamp(1.2rem, 2.5vw, 2rem)',
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 900,
          color: isActive ? '#fff' : color,
          opacity: isActive ? 1 : 0.45,
          textShadow: isActive ? `0 0 15px ${color}` : 'none',
          letterSpacing: '0.05em',
          transition: 'all 0.5s ease',
        }}>
          {label}
        </div>
        {/* Sound waves when playing */}
        {isPlaying && (
          <div style={{
            display: 'flex',
            gap: '3px',
            alignItems: 'flex-end',
            height: '16px',
            position: 'absolute',
            bottom: '8px',
          }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{
                width: '3px',
                background: `linear-gradient(to top, ${color}, ${color}40)`,
                borderRadius: '2px',
                animation: `sound-wave 0.8s ease-in-out infinite`,
                animationDelay: `${i * 0.12}s`,
              }} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Standard musician cell
  return (
    <div style={cellStyle}>
      {/* Background glow ring when playing */}
      {isPlaying && (
        <div style={{
          position: 'absolute',
          inset: '-2px',
          borderRadius: '12px',
          border: `2px solid ${color}`,
          boxShadow: `inset 0 0 30px ${color}30`,
          animation: 'glow-pulse 1.5s ease-in-out infinite',
          color: color,
        }} />
      )}
      <div style={{
        fontSize: 'clamp(1.8rem, 3.5vw, 3rem)',
        lineHeight: 1,
        filter: isActive ? 'none' : 'grayscale(1) brightness(0.3)',
        transition: 'filter 0.5s ease',
      }}>
        {icon}
      </div>
      <div style={{
        fontSize: 'clamp(0.55rem, 1.1vw, 0.8rem)',
        fontWeight: 800,
        fontFamily: 'Montserrat, sans-serif',
        color: isActive ? color : '#333355',
        marginTop: '6px',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        textShadow: isPlaying ? `0 0 10px ${color}` : 'none',
      }}>
        {instrument}
      </div>
      {/* Sound waves when playing */}
      {isPlaying && (
        <div style={{
          display: 'flex',
          gap: '3px',
          alignItems: 'flex-end',
          height: '16px',
          position: 'absolute',
          bottom: '8px',
        }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{
              width: '3px',
              background: `linear-gradient(to top, ${color}, ${color}40)`,
              borderRadius: '2px',
              animation: `sound-wave 0.8s ease-in-out infinite`,
              animationDelay: `${i * 0.12}s`,
            }} />
          ))}
        </div>
      )}
      {/* Silhouette/question mark for inactive */}
      {!isActive && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
          opacity: 0.15,
          color: '#ffffff',
        }}>
          ?
        </div>
      )}
      {/* Small bottom label (legacy) */}
      {label && (
        <div style={{
          position: 'absolute',
          bottom: '6px',
          fontSize: 'clamp(0.55rem, 1vw, 0.75rem)',
          fontWeight: 800,
          color: '#ffd700',
          fontFamily: 'Montserrat',
          textShadow: '0 0 8px #ffd70080',
          letterSpacing: '0.05em',
        }}>
          {label}
        </div>
      )}

      {/* Speech bubble (R3 auction offers) — floats above the cell with a downward pointer */}
      {speechText && (
        <div style={{
          position: 'absolute',
          top: '-44px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#fff',
          color: '#0a0a1a',
          padding: '6px 12px',
          borderRadius: '14px',
          fontSize: 'clamp(0.65rem, 1.1vw, 0.9rem)',
          fontWeight: 800,
          fontFamily: 'Montserrat, sans-serif',
          whiteSpace: 'nowrap',
          boxShadow: `0 4px 14px rgba(0,0,0,0.5), 0 0 0 2px ${color}88`,
          zIndex: 30,
          letterSpacing: '0.02em',
          animation: isPlaying ? 'glow-pulse 1.2s ease-in-out infinite' : 'none',
        }}>
          {speechText}
          {/* Pointer triangle */}
          <div style={{
            position: 'absolute',
            bottom: '-7px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderTop: '7px solid #fff',
          }} />
        </div>
      )}
    </div>
  );
}

function ScoreCard({ name, score, isBuzzed, side }: {
  name: string; score: number; isBuzzed: boolean; side: 'left' | 'right';
}) {
  return (
    <div style={{
      padding: '8px 20px',
      background: isBuzzed ? '#ffd70033' : '#1a1a3a',
      border: `2px solid ${isBuzzed ? '#ffd700' : '#333'}`,
      borderRadius: '8px',
      textAlign: 'center',
      minWidth: '150px',
      animation: isBuzzed ? 'glow-pulse 1s ease-in-out infinite' : 'none',
      color: isBuzzed ? '#ffd700' : 'inherit',
    }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.7, textTransform: 'uppercase' }}>
        {name}
      </div>
      <div style={{
        fontSize: '1.3rem',
        fontWeight: 800,
        fontFamily: 'Montserrat',
        color: '#ffd700',
      }}>
        {formatMoney(score)}
      </div>
    </div>
  );
}

// ============================================
// STYLES
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100vw',
    height: '100vh',
    background: 'radial-gradient(ellipse at center, #12122a 0%, #0a0a1a 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  connecting: {
    fontSize: '1.5rem',
    color: '#a0a0b0',
    fontFamily: 'Montserrat',
  },
  header: {
    position: 'absolute',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    zIndex: 10,
  },
  roundBadge: {
    background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
    color: '#000',
    padding: '6px 24px',
    borderRadius: '20px',
    fontFamily: 'Montserrat',
    fontWeight: 800,
    fontSize: '1rem',
    letterSpacing: '0.1em',
  },
  songCount: {
    fontSize: '0.75rem',
    color: '#a0a0b0',
    fontWeight: 600,
    letterSpacing: '0.15em',
  },
  songTitleOverlay: {
    position: 'absolute',
    top: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '2rem',
    fontFamily: 'Montserrat',
    fontWeight: 800,
    color: '#ffd700',
    textAlign: 'center',
    textShadow: '0 0 20px #ffd70080',
    zIndex: 10,
  },
  messageOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: 'clamp(2rem, 6vw, 4rem)',
    fontFamily: 'Montserrat',
    fontWeight: 900,
    textAlign: 'center',
    textShadow: '0 0 30px currentColor',
    zIndex: 20,
    animation: 'slide-up 0.3s ease-out',
  },
  lobby: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    top: '-80px',
    width: '300px',
    height: '200px',
    background: 'radial-gradient(ellipse, #ffd70020, transparent 70%)',
    pointerEvents: 'none' as const,
  },
  lobbyDivider: {
    width: '120px',
    height: '2px',
    background: 'linear-gradient(90deg, transparent, #ffd700, transparent)',
  },
  playerCards: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginTop: '10px',
  },
  lobbyPlayerCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
    padding: '20px 30px',
    background: '#1a1a3a',
    border: '2px solid #333',
    borderRadius: '12px',
    minWidth: '160px',
    transition: 'all 0.3s ease',
  },
  lobbyVs: {
    fontFamily: 'Montserrat',
    fontWeight: 900,
    fontSize: '1.5rem',
    color: '#ffd700',
    textShadow: '0 0 15px #ffd70050',
  },
  title: {
    fontSize: 'clamp(2rem, 5vw, 4rem)',
    fontFamily: 'Montserrat',
    fontWeight: 900,
    background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#a0a0b0',
  },
  roundIntro: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    animation: 'slide-up 0.5s ease-out',
  },
  roundIntroTitle: {
    fontSize: 'clamp(2.5rem, 6vw, 5rem)',
    fontFamily: 'Montserrat',
    fontWeight: 900,
    color: '#ffd700',
    textShadow: '0 0 30px #ffd70060',
  },
  wallContainer: {
    width: '90vw',
    maxWidth: '1000px',
    aspectRatio: '5/3',
    maxHeight: '65vh',
  },
  wallGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gridTemplateRows: 'repeat(3, 1fr)',
    gap: 'clamp(4px, 0.8vw, 10px)',
    width: '100%',
    height: '100%',
  },
  prizeDisplay: {
    position: 'absolute',
    bottom: '70px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 10,
  },
  prizeLabel: {
    fontSize: '0.7rem',
    color: '#a0a0b0',
    fontWeight: 700,
    letterSpacing: '0.2em',
  },
  prizeAmount: {
    fontSize: '2rem',
    fontFamily: 'Montserrat',
    fontWeight: 900,
    color: '#ffd700',
    textShadow: '0 0 15px #ffd70060',
  },
  buzzIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: 'clamp(1.5rem, 4vw, 3rem)',
    fontFamily: 'Montserrat',
    fontWeight: 900,
    color: '#ff4444',
    textShadow: '0 0 20px #ff444480',
    animation: 'pulse 0.5s ease-in-out infinite',
    zIndex: 15,
  },
  scoreboard: {
    position: 'absolute',
    bottom: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '30px',
    zIndex: 10,
  },
  correctOverlay: {
    position: 'absolute',
    inset: 0,
    background: '#00ff8815',
    border: '4px solid #00ff88',
    zIndex: 5,
    animation: 'fade-in 0.3s ease-out',
  },
  wrongOverlay: {
    position: 'absolute',
    inset: 0,
    background: '#ff444420',
    border: '4px solid #ff4444',
    zIndex: 5,
    animation: 'wrong-pulse 0.4s ease-in-out 3',
  },
  buzzOverlay: {
    position: 'absolute',
    inset: 0,
    background: '#ffd70010',
    zIndex: 5,
    animation: 'buzz-flash 0.5s ease-out',
  },
  goldOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(135deg, #ffd70015, #ff8c0015)',
    border: '3px solid #ffd70066',
    zIndex: 5,
    animation: 'gold-pulse 1.5s ease-in-out infinite',
  },
  roundComplete: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    animation: 'slide-up 0.5s ease-out',
  },
  finalScores: {
    display: 'flex',
    gap: '40px',
    fontSize: '1.5rem',
    fontFamily: 'Montserrat',
    fontWeight: 700,
    color: '#ffd700',
  },
  partLabel: {
    position: 'absolute',
    bottom: '100px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '1.2rem',
    fontFamily: 'Montserrat',
    fontWeight: 700,
    color: '#00d4ff',
    background: '#0a0a1a99',
    padding: '6px 20px',
    borderRadius: '20px',
    border: '1px solid #00d4ff44',
    zIndex: 10,
  },
};
