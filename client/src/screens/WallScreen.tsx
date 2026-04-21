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
    auctionBids, auctionWinner, auctionTimer, genre,
    showdownRows, showdownController, showdownLadder, showdownSongsPlayed, showdownTier,
    wtwMusicianIndex, wtwSongsWon, wtwMusiciansThisSong, wtwCurrentOffer,
    wtwStartingScore, wtwPrizes, showScoresOverlay, demoMode } = wallState;
  const PLAYER_COLORS: Record<1 | 2 | 3, string> = { 1: '#00d4ff', 2: '#ff00aa', 3: '#ff8c00' };

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
            {([1, 2, 3] as const).map((pid, idx) => {
              const color = pid === 1 ? '#00d4ff' : pid === 2 ? '#ff00aa' : '#ff8c00';
              const p = players[pid];
              return (
                <div key={pid} style={{ display: 'contents' }}>
                  {idx > 0 && <div style={styles.lobbyVs}>VS</div>}
                  <div style={{
                    ...styles.lobbyPlayerCard,
                    borderColor: p.connected ? color : '#333',
                    boxShadow: p.connected ? `0 0 20px ${color}30` : 'none',
                  }}>
                    <div style={{ fontSize: '1.5rem' }}>🎵</div>
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 800, color, fontSize: '1.1rem' }}>
                      {p.name}
                    </div>
                    <div style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: p.connected ? '#00ff88' : '#666',
                      textTransform: 'uppercase',
                      letterSpacing: '0.15em',
                    }}>
                      {p.connected ? '● READY' : '○ WAITING'}
                    </div>
                  </div>
                </div>
              );
            })}
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
        phase === 'showdown-year-pick' ||
        phase === 'wtw-playing' || phase === 'wtw-walkaway-offer' || phase === 'wtw-gold' || phase === 'wtw-bust' ||
        (phase === 'round-intro' && wallState.roundType === 'another-level')) && (
        <div style={{ ...styles.wallContainer, position: 'relative' }}>
          <div style={styles.wallGrid}>
            {musicians.map((m) => (
              <MusicianCell key={m.id} musician={m} />
            ))}
          </div>
          {/* Song Showdown: year label pinned to each wall row. Grid overlay matches wallGrid's
              rows exactly so "1958 / 1973 / 1984" sit smack in their row's vertical band. */}
          {wallState.roundType === 'song-showdown' && showdownRows && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'grid', gridTemplateRows: 'repeat(3, 1fr)',
              pointerEvents: 'none', zIndex: 3,
            }}>
              {showdownRows.map(r => (
                <div key={r.row} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: r.selected ? 1 : r.songId ? 0.85 : 0.1,
                  transition: 'opacity 0.4s ease',
                }}>
                  <div style={{
                    fontFamily: 'Montserrat', fontWeight: 900,
                    fontSize: 'clamp(2.5rem, 7vw, 6rem)',
                    // Every year label is gold now — selected row just glows stronger so the
                    // picked year still reads as "the active one" but the others stay fully
                    // legible on-camera.
                    color: '#ffd700',
                    textShadow: r.selected
                      ? '0 0 40px #ffd700cc, 0 0 80px #ffd70080'
                      : '0 0 16px #ffd70040',
                    letterSpacing: '0.05em',
                  }}>
                    {r.year || '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* SONG SHOWDOWN prize tier + controller chip    */}
      {/* (Year labels are rendered inside the wall     */}
      {/*  container above so they pin to the rows)     */}
      {/* ============================================ */}
      {wallState.roundType === 'song-showdown' && showdownRows && phase !== 'lobby' && phase !== 'round-complete' && (
        <>
          {/* Prize ladder + controller chip */}
          <div style={{
            position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 18, zIndex: 10,
            background: '#0a0a1acc', padding: '6px 16px', borderRadius: 20,
            border: '1px solid #ffd70044',
          }}>
            <span style={{ fontSize: '0.75rem', color: '#a0a0b0', fontWeight: 700, letterSpacing: '0.1em' }}>
              SONG {(showdownSongsPlayed ?? 0) + 1}/6
            </span>
            {showdownController && (
              <span style={{
                fontSize: '0.75rem', fontWeight: 800,
                padding: '3px 10px', borderRadius: 8,
                background: `${PLAYER_COLORS[showdownController]}22`,
                border: `1px solid ${PLAYER_COLORS[showdownController]}`,
                color: PLAYER_COLORS[showdownController],
              }}>
                {players[showdownController].name} PICKS
              </span>
            )}
            {showdownLadder && (
              <span style={{ display: 'flex', gap: 6, fontSize: '0.8rem', fontWeight: 800 }}>
                {showdownLadder.map((v, i) => (
                  <span key={i} style={{
                    color: i === showdownTier ? '#ffd700' : '#666',
                    textShadow: i === showdownTier ? '0 0 12px #ffd70080' : 'none',
                  }}>
                    {formatMoney(v)}
                  </span>
                ))}
              </span>
            )}
          </div>
        </>
      )}

      {/* ============================================ */}
      {/* WIN THE WALL prize pyramid + survivor chip    */}
      {/* ============================================ */}
      {wallState.roundType === 'win-the-wall' && phase !== 'lobby' && phase !== 'round-complete' && (
        <>
          <div style={{
            position: 'absolute', top: '80px', right: '40px', zIndex: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          }}>
            {(() => {
              // 3 paying gates (3, 5, 6) pull their values from the resolved host config.
              // Songs 1, 2, 4 are blank by design — no walkaway, no milestone cash.
              const g3 = wtwPrizes?.gate3 ?? 50_000;
              const g5 = wtwPrizes?.gate5 ?? 100_000;
              const g6 = wtwPrizes?.gate6 ?? 250_000;
              return [
                { songs: 6, prize: g6 },
                { songs: 5, prize: g5 },
                { songs: 4, prize: null },
                { songs: 3, prize: g3 },
                { songs: 2, prize: null },
                { songs: 1, prize: null },
              ].map(tier => {
                const reached = (wtwSongsWon ?? 0) >= tier.songs;
                const isOffer = phase === 'wtw-walkaway-offer' && tier.prize != null && wtwCurrentOffer === tier.prize;
                const isPaying = tier.prize != null;
                const width = 100 + tier.songs * 20;
                return (
                  <div key={tier.songs} style={{
                    width: `${width}px`, padding: '4px 12px',
                    background: reached ? '#ffd70033' : isOffer ? '#ffd70055' : '#0a0a1a99',
                    border: `1px solid ${reached ? '#ffd700' : isOffer ? '#ffd700' : isPaying ? '#666' : '#222'}`,
                    borderRadius: 4, textAlign: 'center',
                    fontFamily: 'Montserrat', fontSize: '0.8rem', fontWeight: 800,
                    color: reached ? '#ffd700' : isOffer ? '#ffd700' : isPaying ? '#bbb' : '#444',
                    animation: isOffer ? 'glow-pulse 1s ease-in-out infinite' : 'none',
                  }}>
                    {isPaying ? formatMoney(tier.prize!) : '—'}
                  </div>
                );
              });
            })()}
          </div>
          {/* Musician-this-song indicator */}
          <div style={{
            position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 10,
            display: 'flex', gap: 12, background: '#0a0a1acc', padding: '6px 16px', borderRadius: 20,
            border: '1px solid #ffd70044',
          }}>
            <span style={{ fontSize: '0.75rem', color: '#a0a0b0', fontWeight: 700, letterSpacing: '0.1em' }}>
              SONG {(wtwSongsWon ?? 0) + 1} · MUSICIAN {(wtwMusicianIndex ?? 0) + 1}/15 · THIS SONG {wtwMusiciansThisSong ?? 0}/5
            </span>
          </div>
          {/* Walkaway decision overlay */}
          {phase === 'wtw-walkaway-offer' && wtwCurrentOffer != null && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              background: 'linear-gradient(180deg, #1a1a3a, #0a0a1a)',
              border: '4px solid #ffd700', borderRadius: 24,
              padding: '30px 60px', zIndex: 40,
              boxShadow: '0 0 80px #ffd70080', textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.9rem', color: '#ffd700', fontWeight: 700, letterSpacing: '0.3em' }}>
                TAKE THE CASH?
              </div>
              <div style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', fontWeight: 900, color: '#ffd700', margin: '12px 0',
                            textShadow: '0 0 40px #ffd70080' }}>
                {formatMoney(wtwCurrentOffer)}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#a0a0b0' }}>
                OR KEEP GOING FOR THE NEXT TIER
              </div>
            </div>
          )}
          {phase === 'wtw-gold' && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
              border: '4px solid #fff', borderRadius: 32,
              padding: '40px 80px', zIndex: 40,
              boxShadow: '0 0 120px #ffd700',
              animation: 'scale-in 0.5s ease-out',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.9rem', color: '#1a1a1a', fontWeight: 900, letterSpacing: '0.3em' }}>
                JACKPOT
              </div>
              <div style={{ fontSize: 'clamp(3rem, 10vw, 7rem)', fontWeight: 900, color: '#1a1a1a', margin: '8px 0' }}>
                +{formatMoney(wtwPrizes?.gate6 ?? 250_000)}
              </div>
              {wtwStartingScore != null && wtwStartingScore > 0 && (
                <div style={{ fontSize: '0.9rem', color: '#1a1a1a', fontWeight: 700, opacity: 0.8 }}>
                  On top of {formatMoney(wtwStartingScore)} banked
                </div>
              )}
            </div>
          )}
          {phase === 'wtw-bust' && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              background: '#2a0000', border: '3px solid #ff4444', borderRadius: 16,
              padding: '24px 48px', zIndex: 40, textAlign: 'center',
            }}>
              <div style={{ fontSize: 'clamp(1.3rem, 3vw, 2rem)', fontWeight: 900, color: '#ff4444' }}>
                OUT OF MUSICIANS
              </div>
              <div style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)', color: '#ffd700', marginTop: 10, fontWeight: 800 }}>
                Walk away with {formatMoney(wtwStartingScore ?? 0)}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#ff8888', marginTop: 6 }}>
                (banked from earlier rounds)
              </div>
            </div>
          )}
        </>
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
              {(() => {
                // Map bid (musician count) to prize via the standard ladder: 1→15k, 2→6k, 3→3k, 4→2k, 5→1k
                const PRIZE_LADDER = [15000, 6000, 3000, 2000, 1000];
                const p1Prize = PRIZE_LADDER[(auctionBids.player1 ?? 1) - 1] ?? 0;
                const p2Prize = PRIZE_LADDER[(auctionBids.player2 ?? 1) - 1] ?? 0;
                return (
                  <>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: isRevealPhase ? '1rem' : '0.7rem',
                  color: '#00d4ff', fontWeight: 700, fontFamily: 'Montserrat',
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>{players[1].name}</div>
                <div style={{
                  fontSize: isRevealPhase ? 'clamp(2.4rem, 5.5vw, 4rem)' : '1.3rem',
                  fontWeight: 900, fontFamily: 'Montserrat',
                  color: auctionWinner === 1 || auctionWinner === 'tied' ? '#00ff88' : '#666',
                  textShadow: isRevealPhase && (auctionWinner === 1 || auctionWinner === 'tied') ? '0 0 30px #00ff8880' : 'none',
                }}>
                  ${p1Prize.toLocaleString()}
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
                  fontSize: isRevealPhase ? 'clamp(2.4rem, 5.5vw, 4rem)' : '1.3rem',
                  fontWeight: 900, fontFamily: 'Montserrat',
                  color: auctionWinner === 2 || auctionWinner === 'tied' ? '#00ff88' : '#666',
                  textShadow: isRevealPhase && (auctionWinner === 2 || auctionWinner === 'tied') ? '0 0 30px #00ff8880' : 'none',
                }}>
                  ${p2Prize.toLocaleString()}
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
                  </>
                );
              })()}
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
        <ScoreCard name={players[1].name} score={players[1].score} isBuzzed={buzzedPlayer === 1} eliminated={players[1].eliminated} color="#00d4ff" />
        <ScoreCard name={players[2].name} score={players[2].score} isBuzzed={buzzedPlayer === 2} eliminated={players[2].eliminated} color="#ff00aa" />
        <ScoreCard name={players[3].name} score={players[3].score} isBuzzed={buzzedPlayer === 3} eliminated={players[3].eliminated} color="#ff8c00" />
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
            {([1, 2, 3] as const).map((pid) => {
              const color = pid === 1 ? '#00d4ff' : pid === 2 ? '#ff00aa' : '#ff8c00';
              const p = players[pid];
              const topScore = Math.max(players[1].score, players[2].score, players[3].score);
              const isLeader = p.score === topScore && p.score > 0;
              return (
                <div key={pid} style={{
                  textAlign: 'center',
                  padding: '12px 24px',
                  background: isLeader ? `${color}15` : 'transparent',
                  borderRadius: '8px',
                  border: isLeader ? `1px solid ${color}44` : '1px solid transparent',
                  opacity: p.eliminated ? 0.45 : 1,
                }}>
                  <div style={{ fontSize: '0.8rem', color, marginBottom: '4px', textDecoration: p.eliminated ? 'line-through' : 'none' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 900 }}>{formatMoney(p.score)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* DEMO BADGE — always visible when demoMode on  */}
      {/* ============================================ */}
      {demoMode && phase !== 'lobby' && (
        <div style={{
          position: 'absolute', top: 14, right: 14, zIndex: 60,
          background: 'linear-gradient(135deg, #ff8c00, #ff4444)',
          color: '#fff',
          padding: '6px 14px',
          borderRadius: 6,
          fontFamily: 'Montserrat', fontWeight: 900,
          fontSize: 'clamp(0.7rem, 1vw, 0.9rem)',
          letterSpacing: '0.3em',
          boxShadow: '0 0 20px #ff8c0080',
          border: '2px solid #fff',
          animation: 'glow-pulse 2s ease-in-out infinite',
        }}>
          DEMO
        </div>
      )}

      {/* ============================================ */}
      {/* HOST-TRIGGERED SCORES OVERLAY                 */}
      {/* ============================================ */}
      {/* Dark-over-everything curtain with big scoreboard. Host can trigger at any phase as a  */}
      {/* narrative "let's see where we are" beat. Audio and round state keep running          */}
      {/* underneath — this is purely a visual overlay.                                        */}
      {showScoresOverlay && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 90,
          background: 'radial-gradient(ellipse at center, #0a0a1aee 0%, #000000f5 70%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 'clamp(20px, 4vh, 40px)',
          animation: 'scale-in 0.35s ease-out',
        }}>
          <div style={{
            fontFamily: 'Montserrat', fontSize: 'clamp(1rem, 2.2vw, 1.8rem)', fontWeight: 900,
            color: '#ffd700', letterSpacing: '0.35em',
            textShadow: '0 0 30px #ffd70080',
          }}>
            WHERE WE STAND
          </div>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 2vh, 20px)',
            width: 'min(90vw, 900px)',
          }}>
            {([1, 2, 3] as const).map(pid => {
              const color = pid === 1 ? '#00d4ff' : pid === 2 ? '#ff00aa' : '#ff8c00';
              const p = players[pid];
              return (
                <div key={pid} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 'clamp(14px, 2.5vw, 26px) clamp(22px, 3.5vw, 40px)',
                  background: `linear-gradient(90deg, ${color}22 0%, ${color}08 100%)`,
                  border: `2px solid ${p.eliminated ? '#555' : color}`,
                  borderRadius: '14px',
                  boxShadow: p.eliminated ? 'none' : `0 0 30px ${color}50`,
                  opacity: p.eliminated ? 0.4 : 1,
                }}>
                  <div style={{
                    fontFamily: 'Montserrat', fontWeight: 900,
                    fontSize: 'clamp(1.4rem, 3.5vw, 2.8rem)',
                    color,
                    letterSpacing: '0.04em',
                    textDecoration: p.eliminated ? 'line-through' : 'none',
                  }}>
                    {p.name}
                    {p.eliminated && <span style={{
                      marginLeft: 16, fontSize: '0.6em', color: '#888',
                      fontWeight: 700, letterSpacing: '0.3em',
                    }}>OUT</span>}
                  </div>
                  <div style={{
                    fontFamily: 'Montserrat', fontWeight: 900,
                    fontSize: 'clamp(1.8rem, 5vw, 4rem)',
                    color: '#ffd700',
                    textShadow: '0 0 20px #ffd70060',
                  }}>
                    {formatMoney(p.score)}
                  </div>
                </div>
              );
            })}
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

function ScoreCard({ name, score, isBuzzed, eliminated, color }: {
  name: string; score: number; isBuzzed: boolean; eliminated?: boolean; color: string;
}) {
  return (
    <div style={{
      padding: '8px 20px',
      background: isBuzzed ? '#ffd70033' : '#1a1a3a',
      border: `2px solid ${isBuzzed ? '#ffd700' : eliminated ? '#444' : '#333'}`,
      borderRadius: '8px',
      textAlign: 'center',
      minWidth: '150px',
      animation: isBuzzed ? 'glow-pulse 1s ease-in-out infinite' : 'none',
      color: isBuzzed ? '#ffd700' : 'inherit',
      opacity: eliminated ? 0.45 : 1,
      position: 'relative',
    }}>
      <div style={{
        fontSize: '0.75rem', fontWeight: 600, opacity: 0.7, textTransform: 'uppercase',
        color: isBuzzed ? undefined : color,
        textDecoration: eliminated ? 'line-through' : 'none',
      }}>
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
      {eliminated && (
        <div style={{
          position: 'absolute', top: 2, right: 6,
          fontSize: '0.55rem', color: '#888', fontWeight: 800, letterSpacing: '0.15em',
        }}>
          OUT
        </div>
      )}
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
