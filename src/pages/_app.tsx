import "../styles/globals.css";
import { MordredOut } from "@fleur/mordred";
import type { AppProps } from "next/app";
import { NextIntlClientProvider } from "next-intl";
import { useRouter } from "next/router";
import { appWithFleur } from "../lib/fleur";

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  return (
    <NextIntlClientProvider
      locale={router.locale}
      messages={pageProps.messages}
    >
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
    </NextIntlClientProvider>
  );
}

export default appWithFleur(MyApp, { enableGetIntialProps: true });
