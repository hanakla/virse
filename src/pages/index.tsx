import type { NextPage } from "next";
import { useCallback, useRef } from "react";
import { rgba } from "polished";
import { useVirseStage } from "../stage";
import {
  RiArrowLeftSFill,
  RiCameraSwitchFill,
  RiPaintFill,
  RiRefreshLine,
  RiSkullLine,
} from "react-icons/ri";
import useMeasure from "react-use-measure";
import { useObjectState } from "@hanakla/arma";
import styled, { css } from "styled-components";
import { useMousetrap } from "../utils/hooks";
import { Bone } from "three";

const Home: NextPage = () => {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [sidebarRef, sidebarBBox] = useMeasure();

  const stage = useVirseStage(canvas);
  const [state, setState] = useObjectState({
    sidebar: true,
    bones: true,
    rotation: false,
  });

  const handleClickBackgroundColor = useCallback(() => {
    stage.setBackgroundColor("#00f");
  }, [stage]);

  const handleClickSidebarOpener = useCallback(() => {
    setState((state) => {
      console.log({ ...state });
      state.sidebar = !state.sidebar;
    });
  }, [setState]);

  const handleClickDisplayBones = useCallback(() => {
    setState((s) => {
      s.bones = !s.bones;
      stage.setDisplayBones(!s.bones);
    });
  }, [setState, stage]);

  const handleClickTransform = useCallback(() => {
    setState((s) => {
      s.rotation = !s.rotation;
      stage.setControlMode(!s.rotation ? "rotate" : "translate");
    });
  }, [setState, stage]);

  useMousetrap("r", () => {
    setState((s) => {
      s.rotation = !s.rotation;
      stage.setControlMode(!s.rotation ? "rotate" : "translate");
    });
  });

  const handleClickSave = useCallback(() => {
    const vrm = Object.values(stage.vrms)[0].vrm;
    const bones: Bone[] = [];
    vrm.scene.traverse((o) => {
      if (o.isBone) bones.push(o);
    });

    localStorage.setItem(
      "pose",
      JSON.stringify(
        bones.reduce((a, b) => {
          a[b.name] = {
            position: b.position.toArray([]),
            rotation: b.rotation.toArray([]),
            quaternion: b.quaternion.toArray([]),
          };
          return a;
        }, Object.create(null))
      )
    );
  }, [stage]);

  const handleClickRestore = useCallback(() => {
    const vrm = Object.values(stage.vrms)[0].vrm;
    const pose = JSON.parse(localStorage.getItem("pose")!);
    Object.entries(pose).map(([name, bone]: [string, any]) => {
      const o = vrm.scene.getObjectByName(name)!;
      o.position.set(...(bone.position as any));
      o.rotation.set(...(bone.rotation as any));
      o.quaternion.set(...(bone.quaternion as any));
    });
  }, [stage]);

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
            /* gap: 16px; */
            width: 100%;
            height: 100%;
            /* padding: 16px; */
            background-color: ${rgba("#34c0b9", 0.8)};
            transition: all 0.2s ease-in-out;
          `}
          style={{
            transform: state.sidebar
              ? "translateX(0)"
              : "translateX(calc(-100% - 40px)",
          }}
        >
          <MenuItem>
            <RiPaintFill css={iconCss} onClick={handleClickBackgroundColor} />
          </MenuItem>
          <MenuItem onClick={() => stage.setCamMode()}>
            <RiCameraSwitchFill css={iconCss} />
            <div>
              カメラ切り替え
              <br />
              <span
                css={`
                  font-size: 12px;
                `}
              >
                {stage.camMode}
              </span>
            </div>
          </MenuItem>
          <MenuItem onClick={handleClickDisplayBones}>
            <RiSkullLine css={iconCss} />
            <div>
              ボーン表示
              <br />
              <span
                css={`
                  font-size: 12px;
                `}
              >
                {!state.bones ? "on" : "off"}
              </span>
            </div>
          </MenuItem>
          <MenuItem onClick={handleClickTransform}>
            <RiRefreshLine css={iconCss} />
            <div>
              回転
              <br />
              <span
                css={`
                  font-size: 12px;
                `}
              >
                {!state.bones ? "on" : "off"}
              </span>
            </div>
          </MenuItem>

          <button type="button" onClick={handleClickSave}>
            ほぞん
          </button>
          <button type="button" onClick={handleClickRestore}>
            復元
          </button>

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
              transition: all 0.2s ease-in-out;
              opacity: 0.8;
            `}
            style={{
              width: sidebarBBox.height,
              height: 40,
              transform: state.sidebar
                ? "scaleX(100%) translateX(40px) rotateZ(90deg)"
                : "scaleX(120%) translateX(40px) rotateZ(90deg)",
            }}
          />
        </div>
        <div
          css={`
            position: absolute;
            bottom: 16px;
            padding: 8px;
            padding-left: 16px;
            transition: all 0.2s ease-in-out;
            border-radius: 0 100px 100px 0;
            cursor: pointer;
          `}
          style={{
            backgroundColor: state.sidebar
              ? rgba("#34c0b9", 0)
              : rgba("#34c0b9", 0.8),
          }}
          onClick={handleClickSidebarOpener}
        >
          <RiArrowLeftSFill
            css={`
              font-size: 40px;
              color: #fff;
              transition: all 0.2s ease-in-out;
            `}
            style={{
              transform: state.sidebar ? "rotate(0)" : "rotate(180deg)",
            }}
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

const iconCss = css`
  font-size: 32px;
  color: #fff;
`;

const MenuItem = styled.div`
  display: flex;
  gap: 8px;
  padding: 16px;
  align-items: center;
  font-size: 14px;
  color: white;
  cursor: pointer;
  user-select: none;

  &:hover {
    background-image: linear-gradient(
      to right,
      ${rgba("#fff", 0.5)},
      ${rgba("#fff", 0)}
    );
  }
`;
