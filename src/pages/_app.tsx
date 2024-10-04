import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { createGlobalStyle } from 'styled-components';
import { reset } from 'styled-reset';
import { appWithFleur } from '../lib/fleur';
import { MordredOut } from '@fleur/mordred';

const GlobalStyle = createGlobalStyle`
  ${reset}

  html, body {
    width: 100%;
    height: 100%;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  #__next {
    width: 100%;
    height: 100%;
  }
`;

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <GlobalStyle />
      <Component {...pageProps} />
      <MordredOut>{(children) => <>{children.children}</>}</MordredOut>
    </>
  );
}

export default appWithFleur(MyApp, { enableGetIntialProps: true });
