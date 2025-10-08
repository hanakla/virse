import { ComponentProps, memo, useRef } from "react";
import {
  RiArrowLeftSFill,
  RiBodyScanLine,
  RiCameraSwitchFill,
  RiPaintFill,
} from "react-icons/ri";
import { useObjectState } from "@hanakla/arma/react-hooks";
import { useFunc, useBindMousetrap, useStoreState } from "../../utils/hooks";
import { useEffect } from "react";
import { useFleurContext } from "@fleur/react";
import { editorOps, EditorStore } from "../../domains/editor";
import { Input } from "../../components/Input";
import { Sidebar } from "../../components/Sidebar";
import { useClickAway, useDrop, useMount, useUpdate } from "react-use";
import "react-contexify/dist/ReactContexify.css";
import { ChromePicker, ColorChangeHandler } from "react-color";
import { useModalOpener } from "@fleur/mordred";
import { LoadPose } from "../../modals/LoadPose";
import { VirseStage } from "../../stage/VirseStage";
import { useTranslation } from "../../hooks/useTranslation";
import { twx } from "@/utils/twx";

export const LiveBooth = memo(function LiveBooth({
  stage,
}: {
  stage: VirseStage | null;
}) {
  const t = useTranslation("common");
  const rerender = useUpdate();
  const { openModal } = useModalOpener();

  const rootRef = useRef<HTMLDivElement>(null);
  const bgColorPaneRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useObjectState({
    size: { width: 1000, height: 1000 },
    fov: 15,
    showColorPane: false,
    color: {
      hex: "#fff",
      rgb: { r: 255, g: 255, b: 255 },
      alpha: 0,
    },
  });

  const { executeOperation, getStore } = useFleurContext();
  const { mode, menuOpened, poses, photoModeState, modelIndex } = useStoreState(
    (get) => ({
      ...get(EditorStore),
    }),
  );

  const handleClickBackgroundColor = useFunc((e) => {
    if ((e.target as HTMLElement).closest("[data-ignore-click]")) return;

    setState((state) => {
      state.showColorPane = !state.showColorPane;
    });
  });

  const handleChangeBgColor = useFunc<ColorChangeHandler>((color) => {
    stage!.setBackgroundColor({ ...color.rgb, a: color.rgb.a! });
    setState({
      color: { hex: color.hex, rgb: color.rgb, alpha: color.rgb.a! },
    });
  });

  const handleChangeBgColorComplete = useFunc<ColorChangeHandler>((color) => {
    stage!.setBackgroundColor({ ...color.rgb, a: color.rgb.a! });
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

    avatar.kalidokit?.events.off("statusChanged", rerender);
    avatar.kalidokit?.events.on("statusChanged", rerender);

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

  useBindMousetrap(
    [
      {
        keys: "tab",
        preventDefault: true,
        handler: (e) => {
          const { menuOpened } = getStore(EditorStore).state;
          executeOperation(editorOps.setMenuOpened, !menuOpened);
        },
      },
    ],
    {},
    rootRef,
  );

  /////
  //// Another
  /////
  useDrop({
    onFiles: async ([file]) => {
      const url = URL.createObjectURL(file);

      if (file.name.endsWith(".vrm")) {
        executeOperation(editorOps.addVrm, file);
        stage!.loadVRM(url);
      } else if (file.name.endsWith(".json")) {
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
    stage.events.on("boneChanged", rerender);

    return () => {
      stage.events.off("boneChanged", rerender);
    };
  }, [stage]);

  useEffect(() => {
    const onResize = () => {
      stage?.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", onResize);

    return () => window.removeEventListener("resize", onResize);
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
      className="absolute inset-0 z-[1] flex flex-col pointer-events-none"
      tabIndex={-1}
    >
      <div className="relative flex flex-1 items-center justify-center pointer-events-none">
        <Sidebar
          side="left"
          className="absolute left-0 w-[172px] h-full pointer-events-auto"
          opened={menuOpened}
        >
          <div className="pt-2">
            <MenuItem onClick={handleClickBackgroundColor}>
              <RiPaintFill className={menuIconCss} />
              {t("bgColor")}

              <div
                ref={bgColorPaneRef}
                data-ignore-click
                className="absolute top-0 left-full z-[1] shadow-[0_4px_5px_rgba(170,170,170,0.1)]"
                style={{ display: state.showColorPane ? "block" : "none" }}
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
                stage?.setCamMode();
              }}
            >
              <RiCameraSwitchFill className={menuIconCss} />
              <div>
                {t("camMode")}
                <br />
                <span
                  css={`
                    font-size: 12px;
                  `}
                >
                  {t(`camMode/${stage?.camMode!}`)}
                </span>
              </div>

              {stage?.camMode === "perspective" && (
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
                    $size="min"
                    value={state.fov}
                    onChange={({ currentTarget }) => {
                      stage.camFov = currentTarget.valueAsNumber;
                      setState({ fov: currentTarget.valueAsNumber });
                    }}
                  />
                </div>
              )}
            </MenuItem>

            <MenuItem onClick={handleClickMotionCapture}>
              <RiBodyScanLine className={menuIconCss} />
              <div>
                {t("motionCapture")}
                <br />
                <span className="text-xs">
                  {model?.avatar.kalidokit?.isInitializing
                    ? t("motionCapture/loading")
                    : model?.avatar.kalidokit?.isCaptureRunnging
                      ? t("motionCapture/enabled")
                      : t("motionCapture/disabled")}
                </span>
              </div>
            </MenuItem>
          </div>
        </Sidebar>
      </div>

      <>
        <div
          className={twx(
            "absolute left-0 bottom-4 p-2 pl-4 rounded-r-full cursor-pointer pointer-events-auto text-white transition opacity-100",
            !menuOpened && "text-[rgba(255,255,255,0)]",
            "hover:opacity-100! hover:bg-[rgba(52,192,185,0.4)]",
          )}
          style={{ opacity: menuOpened ? 1 : 0 }}
          onClick={handleClickSidebarOpener}
        >
          <RiArrowLeftSFill
            className="text-white font-[40px] transition-transform"
            style={{
              transform: menuOpened ? "rotate(0)" : "rotate(180deg)",
            }}
          />
        </div>
      </>
    </div>
  );
});

const menuIconCss = twx("text-white text-[22px]");

const MenuItem = memo(function MenuItem({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={twx(
        "flex flex-wrap gap-2 py-2 px-4 items-center text-sm text-white cursor-pointer select-none",
        "hover:bg-[linear-gradient(to_right,rgba(255,255,255,0.5),rgba(255,255,255,0))]",
        className,
      )}
      {...props}
    />
  );
});
