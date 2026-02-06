import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout';
import { LoginPage } from './components/auth/LoginPage';
import { useAuthStore } from './store';
import { Loader2 } from 'lucide-react';

const SharedNoteView = lazy(() =>
  import('./components/share/SharedNoteView').then(m => ({ default: m.SharedNoteView }))
);

function App() {
  const { user, loading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? <AppShell /> : <LoginPage />} />
        <Route path="/share/:id" element={
          <Suspense fallback={
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
              <Loader2 size={32} className="animate-spin text-accent" />
            </div>
          }>
            <SharedNoteView />
          </Suspense>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
