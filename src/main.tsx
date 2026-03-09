import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from "./components/theme-provider"

const relayLineOAuthFromPopup = () => {
    if (typeof window === 'undefined' || !window.opener) return;

    const params = new URLSearchParams(window.location.search);
    const hasLineOAuthParams = params.has('code') || params.has('error');
    if (!hasLineOAuthParams) return;

    try {
        window.opener.postMessage(
            {
                type: 'LINE_OAUTH_RESULT',
                query: params.toString(),
            },
            window.location.origin,
        );
    } catch (err) {
        console.error('Failed to relay LINE OAuth result to opener:', err);
    }

    try {
        window.close();
    } catch {
        // Ignore; some browsers block programmatic close.
    }
};

relayLineOAuthFromPopup();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
