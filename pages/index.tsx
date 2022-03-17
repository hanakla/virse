import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import { rgba } from "polished";
import { useReluctStage } from "./stage";
import {
  RiArrowLeftSFill,
  RiCameraSwitchFill,
  RiPaintFill,
} from "react-icons/ri";
import useMeasure from "react-use-measure";
import { useObjectState } from "@hanakla/arma";
import styled from "styled-components";

const Home: NextPage = () => {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [sidebarRef, sidebarBBox] = useMeasure();

  const { setCamMode, setBackgroundColor } = useReluctStage(canvas);
  const [state, setState] = useObjectState({
    sidebar: true,
  });

  const handleClickBackgroundColor = useCallback(() => {
    setBackgroundColor("#00f");
  }, [setBackgroundColor]);

  const handleClickSidebarOpener = useCallback(() => {
    setState((state) => {
      console.log({ ...state });
      state.sidebar = !state.sidebar;
    });
  }, [state.sidebar, setState]);

  return (
    <div
      css={`
        position: relative;
      `}
    >
      <div
        css={`
          position: absolute;
          width: 172px;
          height: 100%;
        `}
      >
        <div
          ref={sidebarRef}
          css={`
            display: flex;
            flex-flow: column;
            gap: 16px;
            width: 100%;
            height: 100%;
            padding: 16px;
            background-color: ${rgba("#34c0b9", 0.8)};
            transition: all 0.2s ease-in-out;
          `}
          style={{
            transform: state.sidebar
              ? "translateX(0)"
              : "translateX(calc(-100% - 40px)",
          }}
        >
          <MenuItem t>
            <RiPaintFill
              css={`
                font-size: 32px;
                color: #fff;
              `}
              onClick={handleClickBackgroundColor}
            />
          </MenuItem>
          <MenuItem>
            <RiCameraSwitchFill
              css={`
                font-size: 32px;
                color: #fff;
              `}
              onClick={() => setCamMode()}
            />
            カメラ切り替え
          </MenuItem>

          <div
            css={`
              position: absolute;
              top: 0;
              left: 100%;
              background-image: url("wave.svg");
              background-size: auto 40px;
              background-position: center;
              background-repeat: repeat-x;
              transform: translateX(40px) rotateZ(90deg);
              transform-origin: top left;
              opacity: 0.8;
            `}
            style={{ width: sidebarBBox.height, height: 40 }}
          />
        </div>
        <div
          css={`
            position: absolute;
            bottom: 0;
            padding: 16px;
            transition: all 0.2s ease-in-out;
          `}
          style={{
            backgroundColor: state.sidebar
              ? rgba("#34c0b9", 0)
              : rgba("#34c0b9", 0.8),
          }}
        >
          <RiArrowLeftSFill
            css={`
              font-size: 32px;
              color: #fff;
              transition: all 0.2s ease-in-out;
            `}
            style={{
              transform: state.sidebar ? "rotate(0)" : "rotate(180deg)",
            }}
            onClick={handleClickSidebarOpener}
          />
        </div>
      </div>
      <canvas
        css={`
          width: 100%;
          height: 100%;
          vertical-align: bottom;
        `}
        ref={canvas}
      />
      {/* <RealDom
        css={`
          width: 100%;
          height: 100%;
        `}
        element={canvas}
      /> */}
    </div>
  );
};

export default Home;

const MenuItem = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  color: white;
`;
