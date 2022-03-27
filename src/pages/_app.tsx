import "../styles/globals.css";
import type { AppProps } from "next/app";
import { createGlobalStyle } from "styled-components";
import { reset } from "styled-reset";
import { appWithFleur } from "../lib/fleur";

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
  return (
    <>
      <GlobalStyle />
      <Component {...pageProps} />
    </>
  );
}

export default appWithFleur(MyApp, { enableGetIntialProps: true });
