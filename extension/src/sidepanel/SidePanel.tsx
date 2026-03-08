import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';
import { Navigation } from './components/Navigation';
import { RulesPage } from './pages/RulesPage';
import { RuleEditorPage } from './pages/RuleEditorPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { RequestLogPage } from './pages/RequestLogPage';
import { RecordingPage } from './pages/RecordingPage';
import { AccountPage } from './pages/AccountPage';

export function SidePanel() {
  return (
    <ThemeProvider>
      <MemoryRouter>
        <div className="min-h-screen bg-surface-primary text-content-primary flex flex-col">
          <Navigation />
          <main className="flex-1 overflow-y-auto p-md">
            <Routes>
              <Route path="/" element={<RulesPage />} />
              <Route path="/rules/new" element={<RuleEditorPage />} />
              <Route path="/rules/:id/edit" element={<RuleEditorPage />} />
              <Route path="/collections" element={<CollectionsPage />} />
              <Route path="/log" element={<RequestLogPage />} />
              <Route path="/recording" element={<RecordingPage />} />
              <Route path="/account" element={<AccountPage />} />
            </Routes>
          </main>
        </div>
      </MemoryRouter>
    </ThemeProvider>
  );
}
