import { BrowserRouter } from 'react-router-dom';

import { Toaster } from './components/ui';
import { useInitAuth } from './features/auth/useInitAuth';
import { AppRoutes } from './routes/AppRoutes';

/** App root: bootstraps auth, mounts the router and the global toast layer. */
export function App() {
  useInitAuth();
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
      <AppRoutes />
      <Toaster />
    </BrowserRouter>
  );
}
