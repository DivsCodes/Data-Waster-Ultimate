import { HashRouter } from 'react-router-dom';
import { AppRouter } from './router/AppRouter';
import { ErrorBoundary } from '../components/system/ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <AppRouter />
      </HashRouter>
    </ErrorBoundary>
  );
}
