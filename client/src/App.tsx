import { Component, type ReactNode } from 'react';
import { WallScreen } from './screens/WallScreen';
import { PlayerScreen } from './screens/PlayerScreen';
import { HostScreen } from './screens/HostScreen';
import { SetupScreen } from './screens/SetupScreen';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: '#ff4444', background: '#0a0a1a', height: '100vh', fontFamily: 'monospace' }}>
          <h1>Error</h1>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#ff8888' }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#888', fontSize: '0.8rem' }}>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const path = window.location.pathname;

  // Route based on URL
  if (path.startsWith('/wall')) {
    return <ErrorBoundary><WallScreen /></ErrorBoundary>;
  }

  if (path.startsWith('/player/2')) {
    return <ErrorBoundary><PlayerScreen playerId={2} /></ErrorBoundary>;
  }

  if (path.startsWith('/player')) {
    return <ErrorBoundary><PlayerScreen playerId={1} /></ErrorBoundary>;
  }

  if (path.startsWith('/host')) {
    return <ErrorBoundary><HostScreen /></ErrorBoundary>;
  }

  if (path.startsWith('/setup')) {
    return <ErrorBoundary><SetupScreen /></ErrorBoundary>;
  }

  // Default: Hub site
  const screens = [
    {
      href: '/wall',
      label: 'WALL DISPLAY',
      desc: 'The main 5x3 musician grid that everyone watches. Put this on the projector or share your screen on Zoom.',
      icon: '📺',
      color: '#ffd700',
      accent: '#ff8c00',
    },
    {
      href: '/host',
      label: 'HOST CONTROLS',
      desc: 'Game operator panel. Select rounds, play/stop songs, add musicians, judge answers, manage scores.',
      icon: '🎮',
      color: '#00ff88',
      accent: '#00cc66',
    },
    {
      href: '/player/1',
      label: 'PLAYER 1',
      desc: 'Buzz controller for Player 1. Open on a phone or second device.',
      icon: '🔵',
      color: '#00d4ff',
      accent: '#0099cc',
    },
    {
      href: '/player/2',
      label: 'PLAYER 2',
      desc: 'Buzz controller for Player 2. Open on a phone or second device.',
      icon: '🟣',
      color: '#ff00aa',
      accent: '#cc0088',
    },
    {
      href: '/setup',
      label: 'SETUP / LIBRARY',
      desc: 'Browse every song and stem in the library. Customise which songs play in each round. Export/import show configs.',
      icon: '🎚️',
      color: '#8b5cf6',
      accent: '#6d28d9',
    },
  ];

  const networkUrl = window.location.origin;

  return (
    <div style={{
      width: '100vw',
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #1a1a3a 0%, #0a0a1a 60%)',
      fontFamily: 'Montserrat, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
      overflow: 'auto',
    }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h1 style={{
          fontSize: 'clamp(2.5rem, 6vw, 4rem)',
          background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 900,
          letterSpacing: '0.05em',
          margin: 0,
        }}>
          WALL OF SOUND
        </h1>
        <div style={{
          width: '80px',
          height: '3px',
          background: 'linear-gradient(90deg, transparent, #ffd700, transparent)',
          margin: '12px auto',
        }} />
        <p style={{ color: '#606080', fontSize: '0.95rem', margin: 0 }}>
          Multi-Screen Game Show Hub
        </p>
      </div>

      {/* Screen buttons */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        width: '100%',
        maxWidth: '700px',
        marginTop: '30px',
      }}>
        {screens.map(screen => (
          <a
            key={screen.href}
            href={screen.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '24px',
              background: `linear-gradient(135deg, ${screen.color}08, ${screen.color}15)`,
              border: `2px solid ${screen.color}30`,
              borderRadius: '16px',
              color: 'white',
              textDecoration: 'none',
              transition: 'all 0.25s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = screen.color;
              e.currentTarget.style.boxShadow = `0 0 25px ${screen.color}25, 0 8px 30px rgba(0,0,0,0.3)`;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = `${screen.color}30`;
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '2rem' }}>{screen.icon}</span>
              <div style={{
                fontWeight: 900,
                fontSize: '1.2rem',
                color: screen.color,
                letterSpacing: '0.08em',
              }}>
                {screen.label}
              </div>
              <span style={{
                marginLeft: 'auto',
                fontSize: '1.4rem',
                color: `${screen.color}60`,
                transition: 'color 0.2s',
              }}>
                ↗
              </span>
            </div>
            <div style={{
              fontSize: '0.8rem',
              color: '#a0a0b0',
              lineHeight: 1.5,
            }}>
              {screen.desc}
            </div>
            <div style={{
              fontSize: '0.65rem',
              color: '#444',
              fontFamily: 'monospace',
              background: '#0a0a1a',
              padding: '4px 8px',
              borderRadius: '6px',
              alignSelf: 'flex-start',
            }}>
              {networkUrl}{screen.href}
            </div>
          </a>
        ))}
      </div>

      {/* Quick start instructions */}
      <div style={{
        marginTop: '30px',
        padding: '20px 24px',
        background: '#12122a',
        border: '1px solid #222',
        borderRadius: '12px',
        maxWidth: '700px',
        width: '100%',
      }}>
        <h3 style={{
          fontSize: '0.8rem',
          color: '#ffd700',
          fontWeight: 800,
          letterSpacing: '0.15em',
          margin: '0 0 12px 0',
        }}>
          QUICK START
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: '#a0a0b0', lineHeight: 1.6 }}>
          <div><span style={{ color: '#ffd700', fontWeight: 700 }}>1.</span> Open <b style={{ color: '#ffd700' }}>Wall Display</b> on the big screen or share it via Zoom</div>
          <div><span style={{ color: '#ffd700', fontWeight: 700 }}>2.</span> Open <b style={{ color: '#00ff88' }}>Host Controls</b> on your laptop to run the game</div>
          <div><span style={{ color: '#ffd700', fontWeight: 700 }}>3.</span> Send <b style={{ color: '#00d4ff' }}>Player 1</b> and <b style={{ color: '#ff00aa' }}>Player 2</b> links to contestants (phones work great)</div>
          <div><span style={{ color: '#ffd700', fontWeight: 700 }}>4.</span> Click the <b style={{ color: '#ffd700' }}>Wall Display</b> once to enable audio, then start a round from Host</div>
        </div>
        <div style={{
          marginTop: '14px',
          padding: '10px 12px',
          background: '#0a0a1a',
          borderRadius: '8px',
          fontSize: '0.7rem',
          color: '#606080',
          lineHeight: 1.6,
        }}>
          <div><b>Same room:</b> All devices on the same WiFi can use the network URL <span style={{ fontFamily: 'monospace', color: '#888' }}>{networkUrl}</span></div>
          <div><b>Remote/Zoom:</b> Run <span style={{ fontFamily: 'monospace', color: '#888' }}>npx ngrok http 3000</span> and share the public URL</div>
        </div>
      </div>
    </div>
  );
}

export default App;
