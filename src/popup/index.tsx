import { createRoot } from 'react-dom/client';
import { Popup } from './Popup';

const root = document.getElementById('root')!;
root.style.background = '#0d1117';
root.style.color = '#c9d1d9';
createRoot(root).render(<Popup />);
