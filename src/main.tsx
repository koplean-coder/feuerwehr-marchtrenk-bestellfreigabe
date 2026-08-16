import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import { AppProviders } from './providers';
import './index.css';
import { registerServiceWorker } from './lib/pushNotifications';

// Register service worker for PWA functionality (v2)
if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		registerServiceWorker().then((registration) => {
			if (registration) {
				console.log('[App] Service Worker ready');
			}
		});
	});
}

/**
 * ⚠️ ROUTER LIVES HERE — Do NOT add <BrowserRouter>, <Router>, or <MemoryRouter> anywhere else.
 * All route definitions go in App.tsx using <Routes> and <Route>.
 */
createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<AppProviders>
			<BrowserRouter>
				<App />
			</BrowserRouter>
		</AppProviders>
	</StrictMode>,
);
