import { MouseEvent, useRef } from 'react';
import { rgba } from 'polished';
import { useVirseStage } from '../stage';
import { RiCamera2Line, RiLiveLine } from 'react-icons/ri';
import useMeasure from 'react-use-measure';
import { styleWhen, useObjectState } from '@hanakla/arma';
import styled, { css } from 'styled-components';
import { useFunc, useBindMousetrap, useStoreState } from '../utils/hooks';
import { MathUtils } from 'three';
import { useEffect } from 'react';
import useMouse from '@react-hook/mouse-position';
import { VRMHumanBoneName } from '@pixiv/three-vrm';
import { useFleurContext } from '@fleur/react';
import { EditorMode, editorOps, EditorStore } from '../domains/editor';
import { transitionCss } from '../styles/mixins';
import { useDrop, useMount, useUpdate } from 'react-use';
import Head from 'next/head';
import { useContextMenu } from 'react-contexify';
import 'react-contexify/dist/ReactContexify.css';
import { useModalOpener } from '@fleur/mordred';
import { LoadPose } from '../modals/LoadPose';
import { CamModes } from '../stage/VirseStage';
import { PhotoBooth } from '../features/photobooth';
import { LiveBooth } from '../features/livebooth';
import { useRouter } from 'next/router';
import { Link } from '../components/Link';

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
  const router = useRouter();
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
          const result = await openModal(LoadPose, { poses: json.poseset });
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
            <div
              css={css`
                margin-right: 16px;
              `}
            >
              <Link href="/" aria-disabled={router.locale === 'ja'} locale="ja">
                JA
              </Link>
              <span
                css={css`
                  display: inline-block;
                  margin: 0 4px;
                `}
              >
                ￤
              </span>
              <Link href="/" aria-disabled={router.locale === 'en'} locale="en">
                EN
              </Link>
            </div>
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
