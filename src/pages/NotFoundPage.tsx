import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="placeholder-panel placeholder-panel--not-found">
      <div className="placeholder-panel__icon"><Compass size={24} /></div>
      <p className="eyebrow">404 / UNKNOWN DESTINATION</p>
      <h2>This route doesn't exist.</h2>
      <p>The page may move as the project grows. Head back to the workspace overview.</p>
      <Link to="/" className="button button--primary">Back to overview</Link>
    </div>
  );
}
