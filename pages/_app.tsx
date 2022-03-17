import "../styles/globals.css";
import type { AppProps } from "next/app";
import styled from "styled-components";

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default MyApp;
