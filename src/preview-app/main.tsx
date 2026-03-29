import { createRoot } from 'react-dom/client';
import PreviewApp from './App.js';
import './styles.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Missing preview root element.');
}

createRoot(container).render(<PreviewApp />);