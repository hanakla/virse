import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { appWithFleur } from '../lib/fleur';
import { MordredOut } from '@fleur/mordred';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <MordredOut>{(children) => <>{children.children}</>}</MordredOut>
    </>
  );
}

export default appWithFleur(MyApp, { enableGetIntialProps: true });
