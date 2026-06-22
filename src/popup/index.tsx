import { createRoot } from 'react-dom/client';
import { authStore } from '@/auth/auth-store';
import '@/ui/styles.css';
import { Popup } from './Popup';

const root = document.getElementById('root')!;

// Apply persisted theme to documentElement (popup is the extension's own page,
// so toggling <html>.dark is safe here — unlike the stars-page content script).
authStore.getTheme().then((t) => {
  document.documentElement.classList.toggle('dark', t === 'dark');
});

createRoot(root).render(<Popup />);
