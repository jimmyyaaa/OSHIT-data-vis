import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from './contexts/ThemeContext'
import { LocaleProvider } from './contexts/LocaleContext'
import { DateRangeProvider } from './contexts/DateRangeContext'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'
import App from './App.tsx'

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

createRoot(rootElement).render(
    <StrictMode>
        <LocaleProvider>
            <ThemeProvider>
                <AuthProvider>
                    <DateRangeProvider>
                        <App />
                    </DateRangeProvider>
                </AuthProvider>
            </ThemeProvider>
        </LocaleProvider>
    </StrictMode>,
)
