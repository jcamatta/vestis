import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './index.css';
import { AppPage } from './controllers/app-page';

const root = document.getElementById('root');
if (root === null) throw new Error('Missing #root');

createRoot(root).render(
  <StrictMode>
    <div className="isolate h-full">
      <AppPage />
    </div>
  </StrictMode>,
);
