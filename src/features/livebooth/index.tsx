import { memo, useRef } from 'react';
import { rgba } from 'polished';
import {
  RiArrowLeftSFill,
  RiBodyScanLine,
  RiCameraSwitchFill,
  RiPaintFill,
} from 'react-icons/ri';
import { styleWhen, useObjectState } from '@hanakla/arma';
import styled, { css } from 'styled-components';
import { useFunc, useBindMousetrap, useStoreState } from '../../utils/hooks';
import { useEffect } from 'react';
import useMouse from '@react-hook/mouse-position';
import { useFleurContext } from '@fleur/react';
import { editorOps, EditorStore } from '../../domains/editor';
import { Input } from '../../components/Input';
import { transitionCss } from '../../styles/mixins';
import { Sidebar } from '../../components/Sidebar';
import { useClickAway, useDrop, useMount, useUpdate } from 'react-use';
import { useContextMenu } from 'react-contexify';
import 'react-contexify/dist/ReactContexify.css';
import { ChromePicker, ColorChangeHandler } from 'react-color';
import { useModalOpener } from '@fleur/mordred';
import { LoadPose } from '../../modals/LoadPose';
import { CamModes } from '../../stage/VirseStage';
import { VirseStage } from '../../stage/VirseStage';
import { useTranslation } from '../../hooks/useTranslation';

type StashedCam = {
  mode: CamModes;
  target: number[];
  position: number[];
  quaternion: number[];
};

export const LiveBooth = memo(function LiveBooth({
  stage,
}: {
  stage: VirseStage | null;
}) {
  const t = useTranslation('common');
  const rerender = useUpdate();
  const { openModal } = useModalOpener();

  const rootRef = useRef<HTMLDivElement>(null);
  const bgColorPaneRef = useRef<HTMLDivElement>(null);

  const { show: showContextMenu, hideAll } = useContextMenu({});

  const [state, setState] = useObjectState({
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

  const handleClickBackgroundColor = useFunc((e) => {
    if ((e.target as HTMLElement).closest('[data-ignore-click]')) return;

    setState((state) => {
      state.showColorPane = !state.showColorPane;
    });
  });

  const handleChangeBgColor = useFunc<ColorChangeHandler>((color) => {
    stage.setBackgroundColor({ ...color.rgb, a: color.rgb.a! });
    setState({
      color: { hex: color.hex, rgb: color.rgb, alpha: color.rgb.a! },
    });
  });

  const handleChangeBgColorComplete = useFunc<ColorChangeHandler>((color) => {
    stage.setBackgroundColor({ ...color.rgb, a: color.rgb.a! });
    setState({
      color: { hex: color.hex, rgb: color.rgb, alpha: color.rgb.a! },
    });
  });

  useClickAway(bgColorPaneRef, ({ currentTarget }) => {
    setState({ showColorPane: false });
  });

  const handleClickSidebarOpener = useFunc(() => {
    const { menuOpened } = getStore(EditorStore).state;
    executeOperation(editorOps.setMenuOpened, !menuOpened);
  });

  const handleClickMotionCapture = useFunc(() => {
    const avatar = stage?.activeAvatar.avatar;

    if (!avatar) return;

    avatar.kalidokit?.events.off('statusChanged', rerender);
    avatar.kalidokit?.events.on('statusChanged', rerender);

    if (avatar.kalidokit?.isCaptureRunnging) {
      avatar.kalidokit.stop();
    } else {
      avatar.kalidokit?.start();
    }
  });

  /////
  //// Pose UI Event Handlers
  /////
  // #region Pose UI Event Handlers
  // #endregion
  // endregion

  /////
  //// Models UI Event Handlers
  /////
  // #region Models UI Event Handlers

  /////
  ///// Keyboard shortcut
  /////

  useBindMousetrap(rootRef, 'tab', (e) => {
    e.preventDefault();

    const { menuOpened } = getStore(EditorStore).state;
    executeOperation(editorOps.setMenuOpened, !menuOpened);
  });

  useBindMousetrap(rootRef, 'h', (e) => {
    if (e.repeat) return;

    // const abort = new AbortController();

    // window.addEventListener(
    //   'keyup',
    //   () => !abort.signal.aborted && abort.abort(),
    //   { once: true }
    // );

    // openModal(KeyboardHelp, {}, { signal: abort.signal });
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
    const onResize = () => {
      stage?.setSize(window.innerWidth, window.innerHeight);
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
    if (!stage) return;

    stage.setShowBones(false);
    stage.setSize(window.innerWidth, window.innerHeight);
    stage.enablePhys = true;
  }, [stage, mode]);

  useEffect(() => {
    if (!stage) return;
    setState({ size: stage?.getSize() });
  }, [stage]);

  const model = stage ? Object.values(stage.avatars)[0] : null;

  //// Render
  return (
    <div
      ref={rootRef}
      css={css`
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        z-index: 1;
        display: flex;
        flex-flow: column;
        pointer-events: none;
      `}
      tabIndex={-1}
    >
      <div
        css={css`
          position: relative;
          display: flex;
          flex: 1;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          ${transitionCss}
        `}
      >
        <Sidebar
          css={`
            position: absolute;
            left: 0;
            width: 172px;
            height: 100%;
            pointer-events: all;
          `}
          side="left"
          opened={menuOpened}
        >
          <div
            css={css`
              padding-top: 8px;
            `}
          >
            <MenuItem onClick={handleClickBackgroundColor}>
              <RiPaintFill css={menuIconCss} />
              {t('bgColor')}

              <div
                ref={bgColorPaneRef}
                data-ignore-click
                css={css`
                  position: absolute;
                  top: 0;
                  left: 100%;
                  z-index: 1;
                  box-shadow: 0 4px 5px ${rgba('#aaaa', 0.1)};
                `}
                style={{ display: state.showColorPane ? 'block' : 'none' }}
              >
                <ChromePicker
                  disableAlpha={false}
                  color={{ ...state.color.rgb, a: state.color.alpha }}
                  onChange={handleChangeBgColor}
                  onChangeComplete={handleChangeBgColorComplete}
                />
              </div>
            </MenuItem>

            <MenuItem
              onClick={(e) => {
                if (e.target instanceof HTMLInputElement) return;
                stage.setCamMode();
              }}
            >
              <RiCameraSwitchFill css={menuIconCss} />
              <div>
                {t('camMode')}
                <br />
                <span
                  css={`
                    font-size: 12px;
                  `}
                >
                  {t(`camMode/${stage?.camMode}`)}
                </span>
              </div>

              {stage?.camMode === 'perspective' && (
                <div
                  css={`
                    display: flex;
                    align-items: center;
                  `}
                >
                  <span>Fov: </span>
                  <Input
                    css={`
                      flex: 1;
                      margin-left: 4px;
                    `}
                    type="number"
                    size="min"
                    value={state.fov}
                    onChange={({ currentTarget }) => {
                      stage.camFov = currentTarget.valueAsNumber;
                      setState({ fov: currentTarget.valueAsNumber });
                      stage.pCam.updateProjectionMatrix();
                    }}
                  />
                </div>
              )}
            </MenuItem>

            <MenuItem onClick={handleClickMotionCapture}>
              <RiBodyScanLine css={menuIconCss} />
              <div>
                {t('motionCapture')}
                <br />
                <span
                  css={css`
                    font-size: 12px;
                  `}
                >
                  {model?.avatar.kalidokit.isInitializing
                    ? t('motionCapture/loading')
                    : model?.avatar.kalidokit.isCaptureRunnging
                    ? t('motionCapture/enabled')
                    : t('motionCapture/disabled')}
                </span>
              </div>
            </MenuItem>
          </div>
        </Sidebar>
      </div>

      <>
        <div
          css={css`
            position: absolute;
            left: 0;
            bottom: 16px;
            padding: 8px;
            padding-left: 16px;
            border-radius: 0 100px 100px 0;
            cursor: pointer;
            pointer-events: all;
            color: #fff;
            ${transitionCss}
            opacity: 1;

            ${styleWhen(!menuOpened)`
              color: rgba(255, 255, 255, 0);
            `}

            &:hover {
              opacity: 1 !important;

              background-color: ${rgba('#34c0b9', 0.4)};
            }
          `}
          style={{ opacity: menuOpened ? 1 : 0 }}
          onClick={handleClickSidebarOpener}
        >
          <RiArrowLeftSFill
            css={css`
              color: #fff;
              font-size: 40px;
              ${transitionCss}
            `}
            style={{
              transform: menuOpened ? 'rotate(0)' : 'rotate(180deg)',
            }}
          />
        </div>
      </>
    </div>
  );
});

const menuIconCss = css`
  font-size: 22px;
  color: #fff;
`;

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
