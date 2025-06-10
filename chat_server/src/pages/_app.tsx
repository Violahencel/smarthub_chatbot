import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { WebSocketProvider } from '../contexts/WebSocketContext';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <LoadingProvider>
        <WebSocketProvider>
          <Component {...pageProps} />
        </WebSocketProvider>
      </LoadingProvider>
    </ThemeProvider>
  );
}

export default MyApp; 