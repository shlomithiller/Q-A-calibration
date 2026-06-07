import { Grid, Home, Bell, AgentAstro, ChevronDown, ArrowLeft } from './Icons';

interface AppShellProps {
  view: 'list' | 'detail' | 'test-suites' | 'regression-test';
  onBackToCalibration: () => void;
  onNavigateToTests?: () => void;
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export function AppShell({
  view,
  onBackToCalibration,
  onNavigateToTests,
  children,
  rightPanel,
}: AppShellProps) {
  return (
    <div className="app">
      <header className="global-header">
        <div className="header-left">
          <div className="app-launcher">
            <Grid size={16} />
          </div>
          <div className="home-tab">
            <Home size={20} />
            <div className="home-tab-indicator" />
          </div>
        </div>
        <div className="header-center" />
        <div className="header-right">
          <div className="header-controls">
            <button className="icon-button" aria-label="Agentforce">
              <AgentAstro size={20} />
            </button>
            <button className="icon-button" aria-label="Notifications">
              <Bell size={20} />
            </button>
          </div>
          <div className="header-user">
            <img className="avatar" src="/avatars/header-avatar.svg" alt="User" />
            <ChevronDown size={12} className="avatar-chevron" />
          </div>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <div className="sidebar-header">
            <button className="back-arrow" onClick={onBackToCalibration} aria-label="Back">
              <ArrowLeft size={16} />
            </button>
            <span className="sidebar-title">Q&amp;A Calibration</span>
          </div>
          <nav className="nav">
            {view === 'regression-test' || view === 'test-suites' ? (
              <>
                <button className="nav-item" onClick={onBackToCalibration}>All Questions</button>
                <button className="nav-item active" onClick={onNavigateToTests}>Regression Tests</button>
                <div className="nav-divider" />
                <button className="nav-item">Verified Questions</button>
              </>
            ) : (
              <>
                <button className="nav-item active">All Questions</button>
                <button className="nav-item" onClick={onNavigateToTests}>Regression Tests</button>
                <div className="nav-divider" />
                <button className="nav-item">Verified Questions</button>
              </>
            )}
          </nav>
        </aside>

        <main className={`canvas ${rightPanel ? 'canvas-with-rail' : ''}`}>
          {children}
        </main>
        {rightPanel && <aside className="builder-rail">{rightPanel}</aside>}
      </div>
    </div>
  );
}
