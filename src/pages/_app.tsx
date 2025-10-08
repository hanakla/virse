import "../styles/globals.css";
import type { AppProps } from "next/app";
import { appWithFleur } from "../lib/fleur";
import { MordredOut } from "@fleur/mordred";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <MordredOut>{(children) => <>{children.children}</>}</MordredOut>
      <svg className="hidden">
        <filter id="glass_filter" primitiveUnits="objectBoundingBox">
          <feImage result="map" width="100%" height="100%" x="0" y="0" />

          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation="0.01"
            result="blur"
          />
          <feDisplacementMap
            id="disp"
            in="blur"
            in2="map"
            scale="0.5"
            xChannelSelector="R"
            yChannelSelector="G"
          ></feDisplacementMap>
        </filter>
      </svg>
    </>
  );
}

export default appWithFleur(MyApp, { enableGetIntialProps: true });
