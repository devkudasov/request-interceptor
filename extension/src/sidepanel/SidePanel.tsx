import { useEffect } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';
import { useLogPanelStore, useLogStore } from '@/features/logging';
import { useAuthStore } from '@/features/auth';
import { BottomBar } from './components/BottomBar';
import { LogPanel } from '@/features/logging/widgets/LogPanel';
import { WorkspacePage } from '@/screens/WorkspacePage';
import { RuleEditorPage } from '@/screens/RuleEditorPage';
import { VersionHistoryPage } from '@/screens/VersionHistoryPage';
import { BillingPage } from '@/screens/BillingPage';

export function SidePanel() {
  const { isOpen, togglePanel, unseenCount } = useLogPanelStore();

  useEffect(() => {
    useAuthStore.getState().fetchUser();
    useAuthStore.getState().startAuthListener();
    useLogStore.getState().startListening();
  }, []);

  return (
    <ThemeProvider>
      <MemoryRouter>
        <div className="h-screen flex flex-col bg-surface-primary text-content-primary">
          <main className="flex-1 overflow-y-auto min-h-0 p-md">
            <Routes>
              <Route path="/" element={<WorkspacePage />} />
              <Route path="/rules/new" element={<RuleEditorPage />} />
              <Route path="/rules/:id/edit" element={<RuleEditorPage />} />
              <Route path="/collections/:id/versions" element={<VersionHistoryPage />} />
              <Route path="/billing" element={<BillingPage />} />
            </Routes>
          </main>
          <LogPanel isOpen={isOpen} onClose={togglePanel} />
          <BottomBar onToggleLog={togglePanel} logUnseenCount={unseenCount} />
        </div>
      </MemoryRouter>
    </ThemeProvider>
  );
}
