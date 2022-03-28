import type { NextPage } from "next";
import { CSSProperties, MouseEvent, useRef, useState } from "react";
import { rgba } from "polished";
import { useVirseStage } from "../stage";
import {
  RiArrowLeftSFill,
  RiBodyScanLine,
  RiCamera2Line,
  RiCameraSwitchFill,
  RiFlashlightFill,
  RiLiveLine,
  RiMagicFill,
  RiPaintFill,
  RiRefreshLine,
  RiSkullFill,
} from "react-icons/ri";
import useMeasure from "react-use-measure";
import { letDownload, styleWhen, useObjectState } from "@hanakla/arma";
import styled, { css } from "styled-components";
import { useFunc, useMousetrap, useStoreState } from "../utils/hooks";
import { Bone, MathUtils } from "three";
import { useEffect } from "react";
import useMouse from "@react-hook/mouse-position";
import { VRMSchema } from "@pixiv/three-vrm";
import { useFleurContext, useStore } from "@fleur/react";
import {
  EditorMode,
  editorOps,
  EditorStore,
  UnsavedVirsePose,
  VirsePose,
} from "../domains/editor";
import { Button } from "../components/Button";
import { Checkbox } from "../components/Checkbox";
import { Input } from "../components/Input";
import { transitionCss } from "../styles/mixins";
import { Sidebar } from "../components/Sidebar";
import { InputSection } from "../components/InputSection";
import { useClickAway, useDrop, useMount } from "react-use";
import Head from "next/head";
import {
  Menu as ContextMenu,
  Item as ContextItem,
  useContextMenu,
  ItemParams,
  animation,
  Separator,
} from "react-contexify";
import "react-contexify/dist/ReactContexify.css";
import { List, ListItem } from "../components/List";
import { Recorder } from "../stage/Recorder";
import { ChromePicker, ColorChangeHandler } from "react-color";

const Home: NextPage = () => {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [sidebarRef, sidebarBBox] = useMeasure();
  const padLRef = useRef<HTMLDivElement>(null);
  const padRRef = useRef<HTMLDivElement>(null);
  const bgColoPaneRef = useRef<HTMLDivElement>(null);
  const padLMouse = useMouse(padLRef);
  const padRMouse = useMouse(padRRef);

  const { show: showContextMenu, hideAll } = useContextMenu({});

  const stage = useVirseStage(canvas);
  const [rightTab, setRightTab] = useState<"expr" | "poses">("expr");
  const [state, setState] = useObjectState({
    poseName: "",
    rotation: false,
    syncEyes: true,
    eyeLeft: { x: 0, y: 0 },
    eyeRight: { x: 0, y: 0 },
    size: { width: 1000, height: 1000 },
    showColorPane: false,
    tmpCam: null as any,
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
    })
  );

  const handleClickBackgroundColor = useFunc((e) => {
    if ((e.target as HTMLElement).closest("[data-ignore-click]")) return;

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

  useClickAway(bgColoPaneRef, ({ currentTarget }) => {
    setState({ showColorPane: false });
  });

  const handleClickSidebarOpener = useFunc(() => {
    const { menuOpened } = getStore(EditorStore).state;
    executeOperation(editorOps.setMenuOpened, !menuOpened);
  });

  const handleClickDisplayBones = useFunc(() => {
    stage.setDisplayBones(!photoModeState.visibleBones);

    executeOperation(editorOps.setPhotoModeState, {
      ...photoModeState,
      visibleBones: !photoModeState.visibleBones,
    });
  });

  const handleClickTransform = useFunc(() => {
    setState((s) => {
      s.rotation = !s.rotation;
      stage.setControlMode(!s.rotation ? "rotate" : "translate");
    });
  });

  const handleClickMotionCapture = useFunc(() => {
    const { avatar } = Object.values(stage.vrms)[0];
    console.log(stage.vrms);
    if (!avatar) return;

    if (avatar.kalidokit.isCaptureRunnging) {
      avatar.kalidokit.stop();
    } else {
      avatar.kalidokit.start();
    }
  });

  const handleClickSavePose = useFunc(() => {
    const { vrm, proxy } = Object.values(stage.vrms)[0];
    const bones: Bone[] = [];

    vrm.scene.traverse((o) => {
      if ((o as any).isBone) bones.push(o as Bone);
    });

    const pose: UnsavedVirsePose = {
      name: state.poseName,
      canvas: state.size,
      camera: {
        mode: stage.stage.camMode,
        position: stage.stage.activeCamera.position.toArray(),
        rotation: stage.stage.activeCamera.rotation.toArray(),
        quaternion: stage.stage.activeCamera.quaternion.toArray(),
      },
      blendShapeProxies: vrm.blendShapeProxy?.expressions.reduce((a, name) => {
        a[name] = vrm.blendShapeProxy?.getValue(name)!;
        return a;
      }, Object.create(null)),
      morphs: Object.entries(proxy).reduce((a, [k, proxy]) => {
        a[k] = { value: proxy.value };
        return a;
      }, Object.create(null)),
      bones: bones.reduce((a, b) => {
        a[b.name] = {
          position: b.position.toArray([]),
          rotation: b.rotation.toArray([]),
          quaternion: b.quaternion.toArray([]),
        };
        return a;
      }, Object.create(null)),
    };

    executeOperation(editorOps.savePose, pose);
  });

  const handleClickResetPose = useFunc(() => {
    const { vrm } = Object.values(stage.vrms)[0];
    if (!vrm) return;

    vrm.humanoid
      ?.getBoneNode(VRMSchema.HumanoidBoneName.RightEye)
      ?.rotation.set(0, 0, 0);

    vrm.humanoid
      ?.getBoneNode(VRMSchema.HumanoidBoneName.LeftEye)
      ?.rotation.set(0, 0, 0);

    vrm.scene.traverse((o) => {
      if (!(o as any).isBone) return;

      o.rotation.set(0, 0, 0);
      o.quaternion.set(0, 0, 0, 0);
    });
  });

  const handleClickResetStandardMorphs = useFunc(() => {
    const { vrm } = Object.values(stage.vrms)[0];
    if (!vrm) return;

    vrm.blendShapeProxy?.expressions.forEach((name) => {
      vrm.blendShapeProxy?.setValue(name, 0);
    });
  });

  const handleClickResetUnsafeMorphs = useFunc(() => {
    const { vrm, proxy } = Object.values(stage.vrms)[0];
    if (!vrm) return;

    Object.entries(proxy).forEach(([name, proxy]) => {
      proxy.value = 0;
    });
  });

  /////
  //// Pose UI Event Handlers
  /////
  const handleDblClickPose = useFunc((e: MouseEvent<HTMLLiElement>) => {
    handleClickLoadPoseOnly({
      event: e,
      triggerEvent: e.nativeEvent,
      props: {
        poseId: e.currentTarget.dataset.poseId!,
      },
    });
  });

  const handlePoseContextMenu = useFunc((e: MouseEvent<HTMLLIElement>) => {
    const poseId = parseInt(e.currentTarget.dataset.poseId!);

    showContextMenu(e, {
      id: "posemenu",
      props: {
        poseId,
      },
    });
  });

  const handleClickLoadPoseOnly = useFunc((params: ItemParams) => {
    const poseId = +params.props.poseId;
    const pose = poses.find((p) => p.id === poseId);

    const { vrm, proxy } = Object.values(stage.vrms)[0];
    if (!vrm || !pose) return;

    Object.entries(pose.morphs).map(([k, { value }]: [string, any]) => {
      if (proxy[k]) proxy[k].value = value;
    });

    Object.entries(pose.blendShapeProxies).map(
      ([name, value]: [string, number]) => {
        vrm.blendShapeProxy?.setValue(name, value);
      }
    );

    Object.entries(pose.bones).map(([name, bone]: [string, any]) => {
      const o = vrm.scene.getObjectByName(name)!;
      if (!o) return;

      o.position.set(...(bone.position as any));
      o.rotation.set(...(bone.rotation as any));
      o.quaternion.set(...(bone.quaternion as any));
    });

    setState({ poseName: pose.name });
  });

  const handleClickLoadPoseScene = useFunc((params: ItemParams) => {
    const poseId = +params.props.poseId;
    const pose = poses.find((p) => p.id === poseId);

    const { vrm, proxy } = Object.values(stage.vrms)[0];
    if (!vrm || !pose) return;

    stage.stage.setCamMode(pose.camera.mode);
    stage.stage.setSize(pose.canvas.width, pose.canvas.height);
    stage.stage.activeCamera.position.set(...pose.camera.position);
    stage.stage.activeCamera.rotation.set(...pose.camera.rotation);
    stage.stage.activeCamera.quaternion.set(...pose.camera.quaternion);
    stage.stage.orbitControls.update();

    Object.entries(pose.morphs).map(([k, { value }]: [string, any]) => {
      if (proxy[k]) proxy[k].value = value;
    });

    Object.entries(pose.blendShapeProxies).map(
      ([name, value]: [string, number]) => {
        vrm.blendShapeProxy?.setValue(name, value);
      }
    );

    Object.entries(pose.bones).map(([name, bone]: [string, any]) => {
      const o = vrm.scene.getObjectByName(name)!;
      if (!o) return;

      o.position.set(...(bone.position as any));
      o.rotation.set(...(bone.rotation as any));
      o.quaternion.set(...(bone.quaternion as any));
    });

    setState({ poseName: pose.name });
  });

  const handleClickLoadPoseCamera = useFunc((params: ItemParams) => {
    const poseId = +params.props.poseId;
    const pose = poses.find((p) => p.id === poseId);

    if (!pose) return;

    stage.stage.setCamMode(pose.camera.mode);
    stage.stage.setSize(pose.canvas.width, pose.canvas.height);
    stage.stage.activeCamera.position.set(...pose.camera.position);
    stage.stage.activeCamera.rotation.set(...pose.camera.rotation);
    stage.stage.activeCamera.quaternion.set(...pose.camera.quaternion);
    stage.stage.orbitControls.update();
  });

  const handleClickRemovePose = useFunc((params: ItemParams) => {
    executeOperation(editorOps.deletePose, params.props.poseId);
  });

  /////
  //// Models UI Event Handlers
  /////
  const handleModelsContextMenu = useFunc((e: MouseEvent<HTMLLIElement>) => {
    const modelId = e.currentTarget.dataset.modelId!;
    showContextMenu(e, { id: "modelmenu", props: { modelId } });
  });

  const handleDblClickModel = useFunc((e: MouseEvent<HTMLElement>) => {
    handleClickLoadModel({
      event: e,
      triggerEvent: e.nativeEvent,
      props: { modelId: e.currentTarget.dataset.modelId! },
    });
  });

  const handleClickLoadModel = useFunc(
    (params: ItemParams<{ modelId: string }>) => {
      const modelId = params.props!.modelId;

      executeOperation(editorOps.loadVrmBin, modelId, (blob) => {
        const url = URL.createObjectURL(blob);
        stage.stage.loadVRM(url);
      });
    }
  );

  const handleClickRemoveModel = useFunc(
    (params: ItemParams<{ modelId: string }>) => {
      executeOperation(editorOps.deleteVrm, params.props!.modelId);
    }
  );

  /////
  ///// Keyboard shortcust
  /////
  useMousetrap("r", () => {
    if (mode !== EditorMode.photo) return;

    setState((s) => {
      s.rotation = !s.rotation;
      stage.setControlMode(!s.rotation ? "rotate" : "translate");
    });
  });

  useMousetrap("b", () => {
    if (mode !== EditorMode.photo) return;

    handleClickDisplayBones();
  });

  useMousetrap("tab", (e) => {
    e.preventDefault();

    const { menuOpened } = getStore(EditorStore).state;
    executeOperation(editorOps.setMenuOpened, !menuOpened);
  });

  useMousetrap("p", () => {
    setRightTab("poses");
  });

  useMousetrap("o", () => {
    setRightTab("expr");
  });

  useMousetrap("c", () => {
    if (!stage.stage) return;

    const prev = state.tmpCam;
    const current = {
      mode: stage.stage.camMode,
      position: stage.stage.activeCamera.position.toArray(),
      rotation: stage.stage.activeCamera.rotation.toArray(),
      quaternion: stage.stage.activeCamera.quaternion.toArray(),
    };

    setState({
      tmpCam: current,
    });

    if (!prev) return;

    stage.stage.setCamMode(prev.mode);
    stage.stage.activeCamera.position.set(...prev.position);
    stage.stage.activeCamera.rotation.set(...prev.rotation);
    stage.stage.activeCamera.quaternion.set(...prev.quaternion);
    stage.stage.orbitControls.update();
  });

  useMousetrap("shift+c", () => {
    setState({
      tmpCam: null,
    });
  });

  /////
  //// Another
  /////
  useDrop({
    onFiles: async ([file]) => {
      const url = URL.createObjectURL(file);

      executeOperation(editorOps.addVrm, file);
      stage.stage.loadVRM(url);
    },
  });

  useMount(async () => {
    executeOperation(editorOps.loadPoses);
    executeOperation(editorOps.loadVrms);
    // executeOperation(editorOps.savePose, 'pose1', )
  });

  useEffect(() => {
    if (!stage.stage) return;

    executeOperation(
      editorOps.loadVrmBin,
      "4b45a65eace31e24192c09717670a3a02a4ea16aa21b7a6a14ee9c9499ba9f0e",
      (blob) => {
        const url = URL.createObjectURL(blob);
        stage.stage.loadVRM(url);
      }
    );
  }, [stage.stage]);

  useEffect(() => {
    const onResize = () => {
      if (mode === EditorMode.photo) {
        stage.stage?.setSize(state.size.x, window.innerHeight);
      } else {
        stage.stage?.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener("resize", onResize);

    return () => window.addEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const cancelContextMenu = (e: Event) => e.preventDefault();

    window.addEventListener("click", hideAll);
    window.addEventListener("contextmenu", cancelContextMenu);

    return () => {
      window.addEventListener("click", hideAll);
      window.addEventListener("contextmenu", cancelContextMenu);
    };
  }, []);

  // on mode changed
  useEffect(() => {
    if (mode === EditorMode.photo) {
      stage.setDisplayBones(photoModeState.visibleBones);
      stage.stage?.setSize(state.size.width, state.size.height);
    }

    if (mode === EditorMode.live) {
      stage.setDisplayBones(false);
      stage.stage?.setSize(window.innerWidth, window.innerHeight);
    }
  }, [mode]);

  useEffect(() => {
    if (!stage.stage) return;
    setState({ size: stage.stage?.getSize() });
  }, [stage.stage]);

  useEffect(() => {
    const vrm = stage.stage ? Object.values(stage.stage.vrms)[0]?.vrm : null;
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
      ?.getBoneNode(VRMSchema.HumanoidBoneName.RightEye)
      ?.rotation.set(rateY, rateX, 0);

    if (state.syncEyes) {
      vrm.humanoid
        ?.getBoneNode(VRMSchema.HumanoidBoneName.LeftEye)
        ?.rotation.set(rateY, rateX, 0);
    }
  }, [state.syncEyes, padLMouse.clientX, padLMouse.clientY, padLMouse.isDown]);

  useEffect(() => {
    const vrm = stage.stage ? Object.values(stage.stage.vrms)[0]?.vrm : null;
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
      ?.getBoneNode(VRMSchema.HumanoidBoneName.LeftEye)
      ?.rotation.set(rateY, rateX, 0);

    if (state.syncEyes) {
      vrm.humanoid
        ?.getBoneNode(VRMSchema.HumanoidBoneName.RightEye)
        ?.rotation.set(rateY, rateX, 0);
    }
  }, [state.syncEyes, padRMouse.clientX, padRMouse.clientY, padRMouse.isDown]);

  const model = stage.stage ? Object.values(stage.stage.vrms)[0] : null;
  const cameraMenu = (
    <MenuItem
      onClick={(e) => {
        if (e.target instanceof HTMLInputElement) return;
        stage.setCamMode();
      }}
    >
      <RiCameraSwitchFill css={menuIconCss} />
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

      {stage.camMode === "perspective" && (
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
            defaultValue={10}
            onChange={({ currentTarget }) => {
              stage.stage.pCam.fov = currentTarget.valueAsNumber;
              stage.stage.pCam.updateProjectionMatrix();
            }}
          />
        </div>
      )}
    </MenuItem>
  );

  //// Render
  return (
    <div
      css={`
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
        css={`
          position: absolute;
          display: flex;
          flex-flow: column;
          width: 100%;
          height: 100%;
          pointer-events: none;
        `}
        id="ui"
      >
        <nav
          css={`
            display: flex;
            justify-content: flex-start;
            padding: 0 24px;
            background-color: ${rgba("#fff", 0.8)};
            box-shadow: 0 4px 5px ${rgba("#aaaa", 0.1)};
            backdrop-filter: blur(4px);
            user-select: none;
            pointer-events: all;
            ${transitionCss}
          `}
          style={{
            transform: menuOpened ? "translateY(0)" : "translateY(-100%)",
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
            css={`
              display: inline-flex;
              align-items: center;
              justify-content: center;
              margin-left: auto;
              padding: 4px;
              font-size: 12px;
            `}
          >
            <span
              css={`
                padding: 4px;
                color: #fff;
                text-align: center;
                background-color: #34c0b9;
                transform: rotateZ(4deg);
              `}
            >
              <span
                css={`
                  transform: rotateZ(-4deg);
                `}
              >
                V I R S E
              </span>
            </span>
          </div>
        </nav>

        {/* Photomenu */}
        <div
          css={`
            position: relative;
            display: flex;
            flex: 1;
            align-items: center;
            justify-content: center;
            ${transitionCss}
          `}
          style={mode === EditorMode.photo ? {} : hiddenStyle}
        >
          <Sidebar
            css={`
              position: absolute;
              left: 0;
              width: 172px;
              height: 100%;
              ${styleWhen(mode === EditorMode.photo)`
                pointer-events: all;
              `}
            `}
            side="left"
            opened={menuOpened}
          >
            <div
              css={`
                padding-top: 8px;
              `}
            >
              <MenuItem
                css={`
                  position: relative;
                `}
                onClick={handleClickBackgroundColor}
              >
                <RiPaintFill css={menuIconCss} />
                背景色
                <div
                  ref={bgColoPaneRef}
                  data-ignore-click
                  css={`
                    position: absolute;
                    top: 0;
                    left: 100%;
                    z-index: 1;
                    box-shadow: 0 4px 5px ${rgba("#aaaa", 0.1)};
                  `}
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
              {cameraMenu}
              <MenuItem onClick={handleClickDisplayBones}>
                <RiSkullFill css={menuIconCss} />
                <div>
                  ボーン表示(B)
                  <br />
                  <span
                    css={`
                      font-size: 12px;
                    `}
                  >
                    {photoModeState.visibleBones ? "on" : "off"}
                  </span>
                </div>
              </MenuItem>
              <MenuItem onClick={handleClickTransform}>
                <RiRefreshLine css={menuIconCss} />
                <div>
                  回転(R)
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
              <MenuItem
                onClick={() =>
                  (stage.stage.enableEffect = !stage.stage.enableEffect)
                }
              >
                <RiMagicFill css={menuIconCss} />
                <div>Effect</div>
              </MenuItem>
              <MenuItem onClick={handleClickResetPose}>
                <RiFlashlightFill css={menuIconCss} />
                リセット
              </MenuItem>

              <div
                css={`
                  display: flex;
                  flex-flow: column;
                  padding: 8px;
                  gap: 8px;
                  color: #fff;
                `}
              >
                <InputSection title="解像度(px)">
                  <div
                    css={`
                      display: flex;
                      gap: 2px;
                      align-items: center;
                    `}
                  >
                    <Input
                      css={`
                        display: block;
                      `}
                      type="number"
                      value={state.size.width}
                      onChange={({ currentTarget }) => {
                        setState((state) => {
                          state.size.width = currentTarget.valueAsNumber;
                        });
                        stage.stage.setSize(
                          currentTarget.valueAsNumber,
                          stage.stage.getSize().height
                        );
                      }}
                    />
                    <span>×</span>
                    <Input
                      css={`
                        display: block;
                      `}
                      type="number"
                      value={state.size.height}
                      onChange={({ currentTarget }) => {
                        setState((state) => {
                          state.size.height = currentTarget.valueAsNumber;
                        });
                        stage.stage.setSize(
                          stage.stage.getSize().width,
                          currentTarget.valueAsNumber
                        );
                      }}
                    />
                  </div>
                </InputSection>

                <List
                  css={`
                    flex: 1;
                    overflow: auto;
                  `}
                >
                  {modelIndex.map((entry) => (
                    <ListItem
                      key={entry.hash}
                      data-model-id={entry.hash}
                      onDoubleClick={handleDblClickModel}
                      onContextMenu={handleModelsContextMenu}
                    >
                      <div>{entry.name}</div>
                      <div
                        css={`
                          margin-top: 6px;
                          font-size: 12px;
                          color: ${rgba("#444", 0.8)};
                        `}
                      >
                        {entry.version ? entry.version : "(バージョンなし)"}
                      </div>
                    </ListItem>
                  ))}
                </List>
              </div>
            </div>
          </Sidebar>

          <Sidebar
            css={`
              position: absolute;
              right: 0;
              display: flex;
              flex-flow: column;
              width: 172px;
              height: 100%;
              ${styleWhen(mode === EditorMode.photo)`
                pointer-events: all;
              `}
              ${transitionCss}
            `}
            side="right"
            opened={menuOpened}
          >
            <div
              id="hovers"
              css={`
                position: absolute;
                right: 100%;
                bottom: 16px;
                margin-right: 32px;
                z-index: 2;
              `}
            >
              <Button
                kind="primary"
                css={`
                  padding: 12px;
                  box-shadow: 0 4px 5px ${rgba("#aaaa", 0.5)};
                  ${transitionCss}
                `}
                style={{
                  transform: menuOpened ? "translateX(0)" : "translateX(-100%)",
                }}
                onClick={() => {
                  canvas.current?.toBlob((blob) => {
                    const url = URL.createObjectURL(blob!);
                    letDownload(url, "Untitled.png");
                  }, "image/png");
                }}
              >
                <RiCamera2Line
                  css={`
                    font-size: 32px;
                  `}
                />
              </Button>
            </div>

            <div
              css={`
                display: flex;
                height: 100%;
                padding: 8px 8px 8px 0;
                gap: 8px;
                flex-flow: column;
                flex: 1;
                color: #fff;
              `}
            >
              <TabBar>
                <Tab
                  active={rightTab === "expr"}
                  onClick={() => setRightTab("expr")}
                >
                  表情
                </Tab>
                <Tab
                  active={rightTab === "poses"}
                  onClick={() => setRightTab("poses")}
                >
                  ポーズ
                </Tab>
              </TabBar>

              <div
                css={`
                  display: flex;
                  gap: 8px;
                  padding-bottom: 16px;
                  flex-flow: column;
                  flex: 1;
                  overflow: auto;
                `}
                style={rightTab === "expr" ? {} : hiddenStyle}
              >
                <div>
                  <label
                    css={`
                      display: flex;
                      align-items: center;
                      padding: 2px 0;
                      margin-bottom: 2px;
                      font-size: 14px;
                      user-select: none;
                    `}
                  >
                    <Checkbox
                      css={`
                        margin-right: 8px;
                      `}
                      checked={state.syncEyes}
                      onChange={({ currentTarget }) =>
                        setState({ syncEyes: currentTarget.checked })
                      }
                    />
                    Sync eyes
                  </label>
                  <div
                    css={`
                      display: flex;
                      flex-flow: row;
                      gap: 8px;
                      overflow: hidden;
                    `}
                  >
                    <div
                      ref={padLRef}
                      css={`
                        position: relative;
                        width: 100%;
                        background-color: ${rgba("#fff", 0.5)};
                        &::before {
                          content: "";
                          display: block;
                          padding-top: 100%;
                        }
                      `}
                    >
                      <Circle
                        x={
                          state.syncEyes
                            ? padLMouse.x ?? padRMouse.x
                            : padLMouse.x
                        }
                        y={
                          state.syncEyes
                            ? padLMouse.y ?? padRMouse.y
                            : padLMouse.y
                        }
                        visible={padLMouse.isDown || padRMouse.isDown}
                      />
                    </div>
                    <div
                      ref={padRRef}
                      css={`
                        position: relative;
                        width: 100%;
                        background-color: ${rgba("#fff", 0.5)};
                        &::before {
                          content: "";
                          display: block;
                          padding-top: 100%;
                        }
                      `}
                    >
                      <Circle
                        x={
                          state.syncEyes
                            ? padLMouse.x ?? padRMouse.x
                            : padRMouse.x
                        }
                        y={
                          state.syncEyes
                            ? padLMouse.y ?? padRMouse.y
                            : padRMouse.y
                        }
                        visible={padLMouse.isDown || padRMouse.isDown}
                      />
                    </div>
                  </div>
                </div>

                <div
                  css={`
                    flex: 1;
                    overflow: auto;
                  `}
                >
                  <ExprHead>
                    表情
                    <Button
                      css={`
                        width: auto;
                        padding: 4px 8px;
                        margin-left: auto;
                        font-size: 10px;
                      `}
                      kind="default"
                      size="min"
                      onClick={handleClickResetStandardMorphs}
                    >
                      リセット
                    </Button>
                  </ExprHead>
                  {model?.vrm.blendShapeProxy?.expressions.map((name) => (
                    <Slider
                      key={name}
                      name={name}
                      min={0}
                      max={1}
                      onChange={(v) =>
                        model.vrm.blendShapeProxy?.setValue(name, v)
                      }
                    />
                  ))}

                  <ExprHead>
                    カスタム表情
                    <Button
                      css={`
                        width: auto;
                        padding: 4px 8px;
                        margin-left: auto;
                        font-size: 10px;
                      `}
                      kind="default"
                      size="min"
                      onClick={handleClickResetUnsafeMorphs}
                    >
                      リセット
                    </Button>
                  </ExprHead>

                  {model?.proxy &&
                    Object.entries(model?.proxy).map(([name, proxy]) => (
                      <Slider
                        key={name}
                        name={name}
                        min={0}
                        max={2.5}
                        onChange={(v) => {
                          proxy.value = v;
                        }}
                      />
                    ))}
                </div>
              </div>

              <div
                css={`
                  display: flex;
                  gap: 8px;
                  flex: 1;
                  flex-flow: column;
                `}
                style={rightTab === "poses" ? {} : hiddenStyle}
              >
                <List
                  css={`
                    flex: 1;
                    overflow: auto;
                  `}
                >
                  {poses.map((pose, idx) => (
                    <ListItem
                      key={idx}
                      onDoubleClick={handleDblClickPose}
                      onContextMenu={handlePoseContextMenu}
                      data-pose-id={pose.id}
                      tabIndex={-1}
                    >
                      <div>{pose.name}</div>
                    </ListItem>
                  ))}
                </List>
                <div
                  css={`
                    display: flex;
                    flex-flow: column;
                    gap: 4px;
                    margin-top: auto;
                  `}
                >
                  <Input
                    value={state.poseName}
                    onChange={({ currentTarget }) =>
                      setState({ poseName: currentTarget.value })
                    }
                  />
                  <Button onClick={handleClickSavePose}>ポーズを保存</Button>
                </div>
              </div>
            </div>
          </Sidebar>
        </div>

        {/* Stream menu */}
        <div
          css={`
            position: relative;
            display: flex;
            flex: 1;
            align-items: center;
            justify-content: center;
            ${transitionCss}
          `}
          style={mode === EditorMode.live ? {} : hiddenStyle}
        >
          <Sidebar
            css={`
              position: absolute;
              left: 0;
              width: 172px;
              height: 100%;
              ${styleWhen(mode === EditorMode.live)`
                pointer-events: all;
              `}
            `}
            side="left"
            opened={menuOpened}
          >
            <div
              css={`
                padding-top: 8px;
              `}
            >
              <MenuItem>
                <RiPaintFill css={menuIconCss} />
                背景色
              </MenuItem>
              {cameraMenu}
              <MenuItem onClick={handleClickMotionCapture}>
                <RiBodyScanLine css={menuIconCss} />
                <div>
                  モーキャプ
                  <br />
                  <span
                    css={`
                      font-size: 12px;
                    `}
                  >
                    {model?.avatar.kalidokit.isInitializing
                      ? "起動中…"
                      : model?.avatar.kalidokit.isCaptureRunnging
                      ? "有効"
                      : "無効"}
                  </span>
                </div>
              </MenuItem>
            </div>
          </Sidebar>
        </div>

        <>
          <div
            css={`
              position: absolute;
              left: 0;
              bottom: 16px;
              padding: 8px;
              padding-left: 16px;
              border-radius: 0 100px 100px 0;
              cursor: pointer;
              pointer-events: all;
              ${transitionCss}
            `}
            style={{
              backgroundColor: menuOpened
                ? rgba("#34c0b9", 0)
                : rgba("#34c0b9", 0.8),
            }}
            onClick={handleClickSidebarOpener}
          >
            <RiArrowLeftSFill
              css={`
                font-size: 40px;
                color: #fff;
                ${transitionCss}
              `}
              style={{
                transform: menuOpened ? "rotate(0)" : "rotate(180deg)",
              }}
            />
          </div>
        </>
      </div>

      <canvas
        css={`
          width: 100%;
          height: 100%;
          margin: auto;
          vertical-align: bottom;
          box-shadow: 0 0 5px ${rgba("#aaaa", 0.4)};
        `}
        ref={canvas}
      />

      <ContextMenu
        css={`
          padding: 4px;
          font-size: 12px;
        `}
        id="posemenu"
        animation={false}
      >
        <ContextItem onClick={handleClickLoadPoseOnly}>読み込む</ContextItem>
        <Separator />
        <ContextItem onClick={handleClickLoadPoseCamera}>
          カメラを読み込む
        </ContextItem>
        <ContextItem onClick={handleClickLoadPoseScene}>
          シーンを読み込む
        </ContextItem>
        <Separator />
        <ContextItem onClick={handleClickRemovePose}>削除</ContextItem>
      </ContextMenu>

      <ContextMenu
        css={`
          padding: 4px;
          font-size: 12px;
        `}
        id="modelmenu"
        animation={false}
      >
        <ContextItem onClick={handleClickLoadModel}>読み込む</ContextItem>
        <ContextItem onClick={handleClickRemoveModel}>削除</ContextItem>
      </ContextMenu>
    </div>
  );
};

export default Home;

const menuIconCss = css`
  font-size: 28px;
  color: #fff;
`;

const hiddenStyle: CSSProperties = {
  display: "none",
  pointerEvents: "none",
  userSelect: "none",
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
      ${rgba("#fff", 0.5)},
      ${rgba("#fff", 0)}
    );
  }
`;

const Slider = ({
  name,
  min,
  max,
  onChange,
}: {
  name: string;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) => {
  const [state, setValue] = useState(0);

  return (
    <div
      css={`
        & + & {
          margin-top: 12px;
        }
      `}
    >
      <div
        css={`
          margin-bottom: 8px;
          font-size: 14px;
        `}
      >
        {name}
      </div>
      <RangeInput
        css={`
          display: block;
          width: 100%;
        `}
        min={min}
        max={max}
        step={0.01}
        type="range"
        value={state}
        onChange={(e) => {
          setValue(e.currentTarget.valueAsNumber);
          onChange(e.currentTarget.valueAsNumber);
        }}
      />
    </div>
  );
};

const RangeInput = styled.input`
  display: block;
  width: 100%;
  height: 2px;
  margin: 0;

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
    background-color: ${rgba("#aaa", 0.3)};
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
    return prop !== "active" && valid(prop);
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
  margin: 16px 0 8px;
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
      box-shadow: 0 4px 5px ${rgba("#aaaa", 0.5)};
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