import type { NextPage } from 'next';
import {
  CSSProperties,
  memo,
  MouseEvent,
  ReactNode,
  useMemo,
  useRef,
  useState,
} from 'react';
import { rgba } from 'polished';
import { useVirseStage } from '../stage';
import {
  RiArrowLeftSFill,
  RiBodyScanLine,
  RiCamera2Line,
  RiCameraSwitchFill,
  RiEyeLine,
  RiFlashlightFill,
  RiLiveLine,
  RiMagicFill,
  RiPaintFill,
  RiRefreshLine,
  RiSkullFill,
} from 'react-icons/ri';
import useMeasure from 'react-use-measure';
import { letDownload, styleWhen, useObjectState } from '@hanakla/arma';
import styled, { css } from 'styled-components';
import {
  useBufferedState,
  useFunc,
  useBindMousetrap,
  useStableLatestRef,
  useStoreState,
} from '../utils/hooks';
import { Bone, MathUtils } from 'three';
import { useEffect } from 'react';
import useMouse from '@react-hook/mouse-position';
import { VRMExpressionPresetName, VRMHumanBoneName } from '@pixiv/three-vrm';
import { useFleurContext, useStore } from '@fleur/react';
import {
  EditorMode,
  editorOps,
  EditorStore,
  UnsavedVirsePose,
} from '../domains/editor';
import { Button } from '../components/Button';
import { Checkbox } from '../components/Checkbox';
import { Input } from '../components/Input';
import { transitionCss } from '../styles/mixins';
import { Sidebar } from '../components/Sidebar';
import { InputSection } from '../components/InputSection';
import { useClickAway, useDrop, useMount, useUpdate } from 'react-use';
import Head from 'next/head';
import {
  Menu as ContextMenu,
  Item as ContextItem,
  useContextMenu,
  ItemParams,
  animation,
  Separator,
} from 'react-contexify';
import 'react-contexify/dist/ReactContexify.css';
import { List, ListItem } from '../components/List';
import { Recorder } from '../stage/Recorder';
import { ChromePicker, ColorChangeHandler } from 'react-color';
import { Mordred, MordredRenderer, useModalOpener } from '@fleur/mordred';
import { SelectBones } from '../modals/SelectBones';
import { SelectPose } from '../modals/SelectPose';
import { KeyboardHelp } from '../modals/KeyboardHelp';
import { nanoid } from 'nanoid';
import { SelectExpressions } from '../modals/SelectExpressions';
import { migrateV0PoseToV1 } from '../domains/vrm';
import useEvent from 'react-use-event-hook';
import { SelectChangeBones } from '../modals/SelectChangeBone';
import { CamModes } from '../stage/VirseStage';
import { PhotoBooth } from '../features/photobooth';
import LiveBooth from '../features/livebooth';

const replaceVRoidShapeNamePrefix = (name: string) => {
  return name.replace(/^Fcl_/g, '');
};

type StashedCam = {
  mode: CamModes;
  target: number[];
  position: number[];
  quaternion: number[];
};

export default function Home() {
  const rerender = useUpdate();
  const { openModal } = useModalOpener();

  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [sidebarRef, sidebarBBox] = useMeasure();
  const rootRef = useRef<HTMLDivElement>(null);
  const padLRef = useRef<HTMLDivElement>(null);
  const padRRef = useRef<HTMLDivElement>(null);
  const bgColoPaneRef = useRef<HTMLDivElement>(null);
  const padLMouse = useMouse(padLRef);
  const padRMouse = useMouse(padRRef);

  const { show: showContextMenu, hideAll } = useContextMenu({});

  const stage = useVirseStage(canvas);

  const [state, setState] = useObjectState({
    poseId: null as string | null,
    poseName: '',
    rotation: false,
    syncEyes: true,
    eyeLeft: { x: 0, y: 0 },
    eyeRight: { x: 0, y: 0 },
    size: { width: 1000, height: 1000 },
    fov: 15,
    showColorPane: false,
    currentCamKind: 'capture' as 'editorial' | 'capture',
    captureCam: null as StashedCam | null,
    editorialCam: null as StashedCam | null,
    color: {
      hex: '#fff',
      rgb: { r: 255, g: 255, b: 255 },
      alpha: 0,
    },
    handMix: {
      right: 0,
      left: 0,
    },
  });

  const { executeOperation, getStore } = useFleurContext();
  const { mode, menuOpened, poses, photoModeState, modelIndex } = useStoreState(
    (get) => ({
      ...get(EditorStore),
    })
  );

  /////
  //// UI Event Handlers
  /////
  const handleSceneContextMenu = useFunc((e: MouseEvent<HTMLCanvasElement>) => {
    const poseId = parseInt(e.currentTarget.dataset.poseId!);

    showContextMenu(e, {
      id: 'scene',
      props: {
        poseId,
      },
    });
  });

  /////
  ///// Keyboard shortcut
  /////

  useBindMousetrap(rootRef, 'tab', (e) => {
    e.preventDefault();

    const { menuOpened } = getStore(EditorStore).state;
    executeOperation(editorOps.setMenuOpened, !menuOpened);
  });

  /////
  //// Another
  /////
  useDrop({
    onFiles: async ([file]) => {
      const url = URL.createObjectURL(file);

      if (file.name.endsWith('.vrm')) {
        executeOperation(editorOps.addVrm, file);
        stage!.loadVRM(url);
      } else if (file.name.endsWith('.json')) {
        const json = JSON.parse(await file.text());

        if (json.poseset) {
          const result = await openModal(SelectPose, { poses: json.poseset });
          if (!result) return;

          executeOperation(editorOps.installPoseSet, result.poses, {
            clear: result.clearPoseSet,
          });
        } else {
          executeOperation(editorOps.savePose, json);
        }
      }
    },
  });

  useMount(async () => {
    executeOperation(editorOps.loadPoses);
    executeOperation(editorOps.loadVrms);
    // executeOperation(editorOps.savePose, 'pose1', )
  });

  useEffect(() => {
    if (!stage) return;
    stage.events.on('boneChanged', rerender);

    return () => {
      stage.events.off('boneChanged', rerender);
    };
  }, [stage]);

  useEffect(() => {
    if (!stage) return;

    executeOperation(
      editorOps.loadVrmBin,
      '4b45a65eace31e24192c09717670a3a02a4ea16aa21b7a6a14ee9c9499ba9f0e',
      (blob) => {
        const url = URL.createObjectURL(blob);
        stage.loadVRM(url);
      }
    );
  }, [stage]);

  useEffect(() => {
    const onResize = () => {
      if (mode === EditorMode.photo) {
        stage?.setSize(state.size.width, window.innerHeight);
      } else {
        stage?.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', onResize);

    return () => window.addEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const cancelContextMenu = (e: Event) => e.preventDefault();

    window.addEventListener('click', hideAll);
    window.addEventListener('contextmenu', cancelContextMenu);

    return () => {
      window.addEventListener('click', hideAll);
      window.addEventListener('contextmenu', cancelContextMenu);
    };
  }, []);

  // on mode changed
  useEffect(() => {
    if (mode === EditorMode.photo) {
      stage?.setShowBones(photoModeState.visibleBones);
      stage?.setSize(state.size.width, state.size.height);
    }

    if (mode === EditorMode.live) {
      stage?.setShowBones(false);
      stage?.setSize(window.innerWidth, window.innerHeight);
    }
  }, [mode]);

  useEffect(() => {
    if (!stage) return;
    setState({ size: stage?.getSize() });
  }, [stage]);

  useEffect(() => {
    const vrm = stage ? Object.values(stage.avatars)[0]?.vrm : null;
    if (!vrm || !padLMouse || !padLMouse.isDown) return;

    const rateX = MathUtils.lerp(
      -0.3,
      0.3,
      padLMouse.x! / padLMouse.elementWidth!
    );
    const rateY = MathUtils.lerp(
      -0.3,
      0.3,
      1 - padLMouse.y! / padLMouse.elementHeight!
    );

    vrm.humanoid
      ?.getRawBoneNode(VRMHumanBoneName.RightEye)
      ?.rotation.set(rateY, rateX, 0);

    if (state.syncEyes) {
      vrm.humanoid
        ?.getRawBoneNode(VRMHumanBoneName.LeftEye)
        ?.rotation.set(rateY, rateX, 0);
    }
  }, [state.syncEyes, padLMouse.clientX, padLMouse.clientY, padLMouse.isDown]);

  useEffect(() => {
    const vrm = stage ? Object.values(stage.avatars)[0]?.vrm : null;
    if (!vrm || !padRMouse || !padRMouse.isDown) return;

    const rateX = MathUtils.lerp(
      -0.3,
      0.3,
      padRMouse.x! / padRMouse.elementWidth!
    );
    const rateY = MathUtils.lerp(
      -0.3,
      0.3,
      1 - padRMouse.y! / padRMouse.elementHeight!
    );

    vrm.humanoid
      ?.getRawBoneNode(VRMHumanBoneName.LeftEye)
      ?.rotation.set(rateY, rateX, 0);

    if (state.syncEyes) {
      vrm.humanoid
        ?.getRawBoneNode(VRMHumanBoneName.RightEye)
        ?.rotation.set(rateY, rateX, 0);
    }
  }, [state.syncEyes, padRMouse.clientX, padRMouse.clientY, padRMouse.isDown]);

  return (
    <div
      ref={rootRef}
      css={css`
        position: relative;
        display: flex;
        width: 100%;
        height: 100%;
        background-color: #fafafa;
      `}
    >
      <Head>
        <title>Virse</title>
      </Head>

      <div
        css={css`
          position: absolute;
          z-index: 1;
          display: flex;
          flex-flow: column;
          width: 100%;
          height: 100%;
          pointer-events: none;
          outline: none;

          &:focus,
          &:active {
            outline: none;
          }
        `}
        id="ui"
        tabIndex={-1}
      >
        <nav
          css={css`
            position: relative;
            z-index: 1;
            display: flex;
            justify-content: flex-start;
            padding: 0 24px;
            background-color: ${rgba('#fff', 0.8)};
            box-shadow: 0 4px 5px ${rgba('#aaaa', 0.1)};
            backdrop-filter: blur(4px);
            user-select: none;
            pointer-events: all;
            ${transitionCss}
          `}
          style={{
            transform: menuOpened ? 'translateY(0)' : 'translateY(-100%)',
          }}
        >
          <NavItem
            active={mode === EditorMode.photo}
            onClick={() =>
              executeOperation(editorOps.setMode, EditorMode.photo)
            }
          >
            <RiCamera2Line
              css={`
                margin-right: 8px;
                font-size: 24px;
              `}
            />
            Photo
          </NavItem>
          <NavItem
            active={mode === EditorMode.live}
            onClick={() => executeOperation(editorOps.setMode, EditorMode.live)}
          >
            <RiLiveLine
              css={`
                margin-right: 8px;
                font-size: 24px;
              `}
            />
            Live
          </NavItem>

          <div
            css={css`
              display: inline-flex;
              align-items: center;
              justify-content: center;
              margin-left: auto;
              padding: 4px;
              font-size: 12px;
            `}
          >
            <span
              css={css`
                padding: 4px;
                color: #fff;
                text-align: center;
                background-color: #34c0b9;
                transform: rotateZ(4deg);
              `}
            >
              <span
                css={css`
                  transform: rotateZ(-4deg);
                `}
              >
                V I R S E
              </span>
            </span>
          </div>
        </nav>

        <canvas
          css={css`
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            margin: auto;
            vertical-align: bottom;
            box-shadow: 0 0 5px ${rgba('#aaaa', 0.4)};
            user-select: none;
            pointer-events: all;
          `}
          ref={canvas}
          onContextMenu={handleSceneContextMenu}
        />

        <div
          css={css`
            position: relative;
            display: flex;
            width: 100%;
            height: 100%;
            flex: 1;
          `}
        >
          {mode === EditorMode.photo ? (
            <PhotoBooth stage={stage} />
          ) : (
            <LiveBooth stage={stage} />
          )}
        </div>
      </div>
    </div>
  );
}

const menuIconCss = css`
  font-size: 28px;
  color: #fff;
`;

const hiddenStyle: CSSProperties = {
  display: 'none',
  pointerEvents: 'none',
  userSelect: 'none',
  opacity: 0,
};

const MenuItem = styled.div`
  display: flex;
  flex-flow: row wrap;
  gap: 8px;
  padding: 8px 16px;
  align-items: center;
  font-size: 14px;
  color: white;
  cursor: pointer;
  user-select: none;

  &:hover {
    background-image: linear-gradient(
      to right,
      ${rgba('#fff', 0.5)},
      ${rgba('#fff', 0)}
    );
  }
`;

const Slider = memo(function Slider({
  label,
  title,
  min,
  max,
  step = 0.01,
  value,
  onChange,
}: {
  label: ReactNode;
  title: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const [bufferedValue, setValue] = useBufferedState(value);

  return (
    <div>
      <div
        css={`
          display: flex;
          margin-bottom: 8px;
          font-size: 14px;
        `}
        title={title}
      >
        <div
          css={`
            flex: 1;
            /* text-overflow: ellipsis; */
            white-space: nowrap;
            overflow: auto;
            font-weight: bold;

            &::-webkit-scrollbar {
              width: 0;
              height: 0;
            }
          `}
        >
          {label}
        </div>

        <Input
          css={`
            width: 4em;
            margin: 0 4px;
            padding: 2px;

            &::-webkit-inner-spin-button {
              display: none;
            }
          `}
          type="number"
          size="min"
          step={step}
          value={bufferedValue}
          onChange={(e) => {
            const val = e.currentTarget.valueAsNumber;
            if (Number.isNaN(val)) return;
            setValue(val);
          }}
          onKeyDown={(e) => {
            const val = e.currentTarget.valueAsNumber;
            if (Number.isNaN(val)) return;
            if (e.key === 'Enter') onChange(val);
          }}
          onFocus={(e) => {
            e.currentTarget.select();
          }}
          onBlur={(e) => {
            onChange(e.currentTarget.valueAsNumber);
          }}
        />

        <Button
          css={`
            margin-left: auto;
            flex: 0;
            line-height: 1;
          `}
          kind="default"
          size="min"
          onClick={() => onChange(0)}
        >
          <RiRefreshLine />
        </Button>
      </div>

      <RangeInput
        css={`
          display: block;
          width: calc(100% - 8px);
          margin-left: 8px;
        `}
        min={min}
        max={max}
        step={step}
        type="range"
        value={bufferedValue}
        onChange={(e) => {
          setValue(e.currentTarget.valueAsNumber);
          onChange(e.currentTarget.valueAsNumber);
        }}
      />
    </div>
  );
});

const RangeInput = styled.input`
  display: block;
  width: 100%;
  height: 2px;
  margin: 4px 0;

  appearance: none;
  --webkit-touch-callout: none;
  outline: none;
  line-height: 1;

  /* &::-ms-fill-lower,
  &::-moz-range-track,
  &::-webkit-slider-runnable-track {
    background: #28b8f1 !important;
  } */

  &::-webkit-slider-thumb {
    width: 12px;
    height: 12px;
    appearance: none;
    background: #fff;
    border-radius: 100px;

    box-shadow: 0 0 2px #aaa;
  }
`;

const NavItem = styled.div<{ active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px;

  color: #34c0b9;
  font-size: 12px;
  text-transform: uppercase;
  user-select: none;
  cursor: pointer;

  &:hover {
    color: #34c0b9;
    background-color: ${rgba('#aaa', 0.3)};
  }

  ${({ active }) => styleWhen(active)`
    color: #fff;
    background-color: #34c0b9;

    &:hover {
      color: #fff;
      background-color: #23a8a2;
    }
  `}
`;

const TabBar = styled.div`
  display: flex;
  padding: 4px;
  background-color: #34c0b9;
  border-radius: 100px;
`;

const Tab = styled.div.withConfig<{ active: boolean }>({
  shouldForwardProp(prop, valid) {
    return prop !== 'active' && valid(prop);
  },
})`
  flex: 1;
  padding: 4px;
  border-radius: 100px;
  text-align: center;
  user-select: none;

  ${transitionCss}

  ${({ active }) => styleWhen(active)`
    color: #34c0b9;
    background-color: #fff;
  `}

  ${({ active }) => styleWhen(!active)`
    &:hover {
      color: #fff;
      background-color: #23a8a2;
    }
  `}
`;

const ExprHead = styled.div`
  display: flex;
  align-items: center;
  margin: 16px 0 16px;
  font-size: 14px;
  font-weight: bold;
`;

const Circle = ({
  x,
  y,
  visible,
}: {
  x: number | null;
  y: number | null;
  visible: boolean;
}) => (
  <div
    css={`
      position: absolute;
      width: 10px;
      height: 10px;
      box-shadow: 0 4px 5px ${rgba('#aaaa', 0.5)};
      border-radius: 100px;
      background-color: #fff;
      transform: translate(-50%, -50%);
    `}
    style={{
      top: y ?? undefined,
      left: x ?? undefined,
      opacity: visible ? 1 : 0,
    }}
  />
);
