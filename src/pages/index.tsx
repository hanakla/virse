import { MouseEvent, useRef } from 'react';
import { rgba } from 'polished';
import { useVirseStage } from '../stage';
import { RiCamera2Line, RiLiveLine } from 'react-icons/ri';
import { styleWhen } from '@hanakla/arma';
import styled, { css } from 'styled-components';
import { useFunc, useBindMousetrap, useStoreState } from '../utils/hooks';
import { useEffect } from 'react';
import { useFleurContext } from '@fleur/react';
import { Packr } from 'msgpackr';
import {
  EditorMode,
  editorOps,
  EditorStore,
  VirseProject,
} from '../domains/editor';
import { transitionCss } from '../styles/mixins';
import {
  useDrop,
  useEffectOnce,
  useLocalStorage,
  useMount,
  useUpdate,
} from 'react-use';
import Head from 'next/head';
import { useContextMenu } from 'react-contexify';
import 'react-contexify/dist/ReactContexify.css';
import { useModalOpener } from '@fleur/mordred';
import { LoadPose } from '../modals/LoadPose';
import { PhotoBooth } from '../features/photobooth';
import { LiveBooth } from '../features/livebooth';
import { useRouter } from 'next/router';
import { Link } from '../components/Link';
import { ConfirmAgreement } from '../modals/ConrirmAgreement';
import { fitAndPosition } from 'object-fit-math';
import { shallowEquals } from '../utils/object';
import { LoadProjectOption } from '../modals/LoadProjectOption';

export default function Home() {
  const router = useRouter();
  const rerender = useUpdate();
  const { openModal } = useModalOpener();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [isAgreed, setAgreement] = useLocalStorage('virseAgreement', false);

  const { show: showContextMenu, hideAll } = useContextMenu({});

  const stage = useVirseStage(canvasRef);

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
      } else if (file.name.endsWith('.virse')) {
        const options = await openModal(LoadProjectOption, {});
        if (!options) return;

        const buf = await file.arrayBuffer();
        const bin = new Uint8Array(buf);
        const packr = new Packr({ structuredClone: true });
        const data: VirseProject = packr.unpack(bin);

        if (options.loadPoseSet) {
          executeOperation(editorOps.importPoseSet, data.poseset, {
            clear: options.clearCurrentPoses,
          });
        }

        stage?.loadScene(data);
      } else if (file.name.endsWith('.json')) {
        const json = JSON.parse(await file.text());

        if (json.poseset) {
          const result = await openModal(LoadPose, { poses: json.poseset });
          if (!result) return;

          executeOperation(editorOps.importPoseSet, result.poses, {
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
    let id: number;
    let latestSyncTime: number = 0;
    let prevSize: number[] | null = null;
    let windowSize: { width: number; height: number } | null = null;

    const onResize = () => {
      windowSize = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    };

    window.addEventListener('resize', onResize, { passive: true });

    id = requestAnimationFrame(function updatePosition() {
      id = requestAnimationFrame(updatePosition);

      const canvas = canvasRef.current;
      const size = stage?.getSize();

      if (!canvas || !size || !windowSize) return;

      const deps = [
        windowSize!.width,
        windowSize!.height,
        size.width,
        size.height,
      ];

      if (shallowEquals(prevSize, deps)) return;
      if (Date.now() - latestSyncTime < 1000) return;

      // console.log('updatePosition', deps);

      prevSize = deps;
      latestSyncTime = Date.now();

      const result = fitAndPosition(
        { width: windowSize.width, height: windowSize.height },
        {
          width: size.width,
          height: size.height,
        },
        'contain',
        '50%',
        '50%'
      );

      canvas.style.left = `${result.x}px`;
      canvas.style.top = `${result.y}px`;
      canvas.style.width = `${result.width}px`;
      canvas.style.height = `${result.height}px`;
    });

    onResize();

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(id);
    };
  });

  useEffect(() => {
    const cancelContextMenu = (e: Event) => e.preventDefault();

    window.addEventListener('click', hideAll);
    window.addEventListener('contextmenu', cancelContextMenu);

    return () => {
      window.addEventListener('click', hideAll);
      window.addEventListener('contextmenu', cancelContextMenu);
    };
  }, []);

  useEffectOnce(() => {
    if (isAgreed) return;

    openModal(ConfirmAgreement, {}).then(() => {
      setAgreement(true);
    });
  });

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
          ref={canvasRef}
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
