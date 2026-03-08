import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';
import { Navigation } from './components/Navigation';
import { AccountButton } from './components/AccountButton';
import { WorkspacePage } from './pages/WorkspacePage';
import { RuleEditorPage } from './pages/RuleEditorPage';
import { RequestLogPage } from './pages/RequestLogPage';
import { RecordingPage } from './pages/RecordingPage';
import { VersionHistoryPage } from './pages/VersionHistoryPage';

export function SidePanel() {
  return (
    <ThemeProvider>
      <MemoryRouter>
        <div className="min-h-screen bg-surface-primary text-content-primary flex flex-col">
          <Navigation />
          <main className="flex-1 overflow-y-auto p-md">
            <Routes>
              <Route path="/" element={<WorkspacePage />} />
              <Route path="/rules/new" element={<RuleEditorPage />} />
              <Route path="/rules/:id/edit" element={<RuleEditorPage />} />
              <Route path="/collections/:id/versions" element={<VersionHistoryPage />} />
              <Route path="/log" element={<RequestLogPage />} />
              <Route path="/recording" element={<RecordingPage />} />
            </Routes>
          </main>
          <div className="border-t border-border-primary px-md py-sm">
            <AccountButton />
          </div>
        </div>
      </MemoryRouter>
    </ThemeProvider>
  );
}
