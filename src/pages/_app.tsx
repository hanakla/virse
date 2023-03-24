import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { createGlobalStyle } from 'styled-components';
import { reset } from 'styled-reset';
import { appWithFleur } from '../lib/fleur';
import { Mordred, MordredRenderer } from '@fleur/mordred';
import { useMemo } from 'react';

const GlobalStyle = createGlobalStyle`
  ${reset}

  html, body {
    width: 100%;
    height: 100%;
  }

  #__next {
    width: 100%;
    height: 100%;
  }
`;

function MyApp({ Component, pageProps }: AppProps) {
  useMemo(() => {
    !Mordred._instance && Mordred.init();
  }, []);

  return (
    <>
      <GlobalStyle />
      <Component {...pageProps} />
      <MordredRenderer>
        {(children) => <>{children.children}</>}
      </MordredRenderer>
    </>
  );
}

export default appWithFleur(MyApp, { enableGetIntialProps: true });
