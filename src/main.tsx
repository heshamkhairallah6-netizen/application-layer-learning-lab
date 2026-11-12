import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ProgressProvider } from './lib/progress';
import './styles/global.css';
import './styles/additions.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root container missing');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <ProgressProvider>
        <App />
      </ProgressProvider>
    </BrowserRouter>
  </StrictMode>,
);
