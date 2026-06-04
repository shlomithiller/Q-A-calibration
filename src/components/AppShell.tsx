import { Grid, Home, Bell, HelpCircle, ChevronDown, ArrowLeft } from './Icons';

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
        <div className="app-launcher">
          <Grid size={18} />
        </div>
        <div className="home-tab">
          <Home size={18} />
        </div>
        <div className="spacer" />
        <button className="icon-button" aria-label="Help">
          <HelpCircle size={18} />
        </button>
        <button className="icon-button" aria-label="Notifications">
          <Bell size={18} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="avatar">SA</div>
          <ChevronDown size={14} className="avatar-chevron" />
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <button className="back-link" onClick={onBackToCalibration}>
            <ArrowLeft size={16} />
            <span>Q&amp;A Calibration</span>
          </button>
          <nav className="nav">
            {view === 'regression-test' || view === 'test-suites' ? (
              <>
                <button className="nav-item" onClick={onBackToCalibration}>All Questions</button>
                <button className="nav-item">Verified Questions</button>
                <button className="nav-item active">Regression Tests</button>
              </>
            ) : (
              <>
                <button className="nav-item active">All Questions</button>
                <button className="nav-item">Verified Questions</button>
                <button className="nav-item" onClick={onNavigateToTests}>Regression Tests</button>
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
