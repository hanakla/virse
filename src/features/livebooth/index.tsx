import { MouseEvent, useRef, useState } from 'react';
import { rgba } from 'polished';
import {
  RiArrowLeftSFill,
  RiBodyScanLine,
  RiCameraSwitchFill,
  RiPaintFill,
} from 'react-icons/ri';
import useMeasure from 'react-use-measure';
import { letDownload, styleWhen, useObjectState } from '@hanakla/arma';
import styled, { css } from 'styled-components';
import {
  useFunc,
  useBindMousetrap,
  useStableLatestRef,
  useStoreState,
} from '../../utils/hooks';
import { Bone, MathUtils } from 'three';
import { useEffect } from 'react';
import useMouse from '@react-hook/mouse-position';
import { VRMExpressionPresetName, VRMHumanBoneName } from '@pixiv/three-vrm';
import { useFleurContext } from '@fleur/react';
import {
  EditorMode,
  editorOps,
  EditorStore,
  UnsavedVirsePose,
} from '../../domains/editor';
import { Input } from '../../components/Input';
import { transitionCss } from '../../styles/mixins';
import { Sidebar } from '../../components/Sidebar';
import { useClickAway, useDrop, useMount, useUpdate } from 'react-use';
import {
  Menu as ContextMenu,
  Item as ContextItem,
  useContextMenu,
  ItemParams,
} from 'react-contexify';
import 'react-contexify/dist/ReactContexify.css';
import { ColorChangeHandler } from 'react-color';
import { useModalOpener } from '@fleur/mordred';
import { SelectBones } from '../../modals/SelectBones';
import { SelectPose } from '../../modals/SelectPose';
import { KeyboardHelp } from '../../modals/KeyboardHelp';
import { nanoid } from 'nanoid';
import { SelectExpressions } from '../../modals/SelectExpressions';
import { migrateV0PoseToV1 } from '../../domains/vrm';
import useEvent from 'react-use-event-hook';
import { CamModes } from '../../stage/VirseStage';
import { VirseStage } from '../../stage/VirseStage';

const replaceVRoidShapeNamePrefix = (name: string) => {
  return name.replace(/^Fcl_/g, '');
};

type StashedCam = {
  mode: CamModes;
  target: number[];
  position: number[];
  quaternion: number[];
};

export default function LiveBooth({ stage }: { stage: VirseStage | null }) {
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

  const [rightTab, setRightTab] = useState<'expr' | 'poses'>('expr');
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

  useClickAway(bgColoPaneRef, ({ currentTarget }) => {
    setState({ showColorPane: false });
  });

  const handleClickSidebarOpener = useFunc(() => {
    const { menuOpened } = getStore(EditorStore).state;
    executeOperation(editorOps.setMenuOpened, !menuOpened);
  });

  const handleClickDisplayBones = useFunc(() => {
    stage!.setShowBones(!photoModeState.visibleBones);

    executeOperation(editorOps.setPhotoModeState, {
      ...photoModeState,
      visibleBones: !photoModeState.visibleBones,
    });
  });

  const handleClickTransform = useFunc(() => {
    setState((s) => {
      s.rotation = !s.rotation;
      stage!.setControlMode(!s.rotation ? 'rotate' : 'translate');
    });
  });

  const handleClickMotionCapture = useFunc(() => {
    const { avatar } = Object.values(stage.vrms)[0];

    if (!avatar) return;

    if (avatar.kalidokit.isCaptureRunnging) {
      avatar.kalidokit.stop();
    } else {
      avatar.kalidokit.start();
    }
  });

  const serializeCurrentPose = useStableLatestRef(() => {
    if (!stage?.activeAvatar) return;

    const { vrm, avatar } = stage.activeAvatar;
    const bones: Bone[] = [];

    vrm.scene.traverse((o) => {
      if ((o as any).isBone) bones.push(o as Bone);
    });
    const vrmPose = vrm.humanoid!.getPose();

    const original = state.poseId
      ? poses.find((p) => p.uid === state.poseId!)
      : null;

    const pose: UnsavedVirsePose = {
      name: state.poseName,
      canvas: state.size,
      camera: {
        mode: stage.camMode,
        fov: stage.camFov,
        zoom: stage.activeCamera.zoom,
        position: stage.activeCamera.position.toArray(),
        target: stage.orbitControls.target.toArray(),
        rotation: stage.activeCamera.rotation.toArray(),
        quaternion: stage.activeCamera.quaternion.toArray(),
      },
      blendShapeProxies: Object.values(VRMExpressionPresetName).reduce(
        (a, name) => {
          a[name] = vrm.expressionManager?.getValue(name)!;
          return a;
        },
        Object.create(null)
      ),
      morphs: {
        ...original?.morphs,
        ...Object.entries(avatar.blendshapes ?? {}).reduce((a, [k, proxy]) => {
          a[k] = { value: proxy.value };
          return a;
        }, Object.create(null)),
      },
      vrmPose,
      bones: {
        ...original?.bones,
        ...bones.reduce((a, b) => {
          a[b.name] = {
            position: b.position.toArray([]),
            rotation: b.rotation.toArray([]),
            quaternion: b.quaternion.toArray([]),
          };
          return a;
        }, Object.create(null)),
      },
    };

    return pose;
  });

  const handleClickOverwritePose = useEvent(() => {
    const pose = serializeCurrentPose.current();
    if (!pose || !state.poseId) return;

    executeOperation(
      editorOps.savePose,
      { ...pose, uid: state.poseId },
      { overwrite: true }
    );
  });

  const handleClickSavePose = useEvent(() => {
    const pose = serializeCurrentPose.current();
    if (!pose) return;

    executeOperation(editorOps.savePose, pose);
  });

  const handleClickResetPose = useFunc(() => {
    const avatar = stage?.activeAvatar?.avatar;
    if (!avatar) return;

    avatar.resetPose();
    avatar.resetExpressions();
    stage.resetCamera();

    setState({
      poseId: null,
      poseName: '',
    });
  });

  const handleClickResetPoses = useEvent(() => {
    const avatar = stage?.activeAvatar?.avatar;
    if (!avatar) return;

    avatar.resetPose();
    avatar.resetExpressions();
  });

  const handleClickResetSelectBone = useEvent(async () => {
    const avatar = stage?.activeAvatar?.avatar;
    if (!avatar) return;

    const bones = await openModal(SelectBones, {
      boneNames: avatar.allBoneNames,
    });

    if (!bones) return;

    bones.forEach((name) => {
      const obj = avatar.vrm.scene.getObjectByName(name);
      const init = avatar.getInitialBoneState(name);

      obj?.position.fromArray(init!.position);
      obj?.quaternion.fromArray(init!.quaternion);
    });
  });

  const handleClickResetStandardMorphs = useFunc(() => {
    const { vrm } = Object.values(stage.vrms)[0];
    if (!vrm) return;

    Object.keys(vrm.expressionManager?.expressionMap ?? {}).forEach((name) => {
      vrm.expressionManager?.setValue(name, 0);
    });
  });

  const handleClickResetUnsafeMorphs = useFunc(() => {
    const { avatar } = Object.values(stage.vrms)[0];
    if (!avatar.blendshapes) return;

    Object.entries(avatar.blendshapes).forEach(([name, proxy]) => {
      proxy.value = 0;
    });
  });

  /////
  //// Pose UI Event Handlers
  /////
  // #region Pose UI Event Handlers
  const handleDblClickPose = useFunc((e: MouseEvent<HTMLLIElement>) => {
    handleClickLoadPoseOnly({
      event: e,
      triggerEvent: e.nativeEvent,
      props: {
        poseId: e.currentTarget.dataset.poseId!,
      },
    });
  });

  const handleSceneContextMenu = useFunc((e: MouseEvent<HTMLCanvasElement>) => {
    const poseId = parseInt(e.currentTarget.dataset.poseId!);

    showContextMenu(e, {
      id: 'scene',
      props: {
        poseId,
      },
    });
  });

  const handlePoseContextMenu = useFunc((e: MouseEvent<HTMLLIElement>) => {
    const poseId = e.currentTarget.dataset.poseId!;

    showContextMenu(e, {
      id: 'posemenu',
      props: {
        poseId,
      },
    });
  });

  const handleResetContextMenu = useEvent((e: MouseEvent<HTMLElement>) => {
    showContextMenu(e, {
      id: 'resetMenu',
      props: {},
    });
  });

  const handleClickLoadPoseOnly = useFunc((params: ItemParams) => {
    const poseId = params.props.poseId;
    const pose = migrateV0PoseToV1(poses.find((p) => p.uid === poseId));

    const { avatar } = Object.values(stage.vrms)[0];
    if (!avatar || !pose) return;

    Object.entries(pose.morphs).map(([k, { value }]: [string, any]) => {
      if (avatar.blendshapes?.[k]) avatar.blendshapes[k].value = value;
    });

    Object.entries(pose.blendShapeProxies).map(
      ([name, value]: [string, number]) => {
        avatar.vrm.expressionManager?.setValue(name, value);
      }
    );

    avatar.vrm.humanoid!.setRawPose(pose.vrmPose);
  });

  const handleClickLoadScene = useFunc((params: ItemParams) => {
    const poseId = params.props.poseId;
    const pose = migrateV0PoseToV1(poses.find((p) => p.uid === poseId));

    const { avatar } = Object.values(stage.vrms)[0];
    if (!avatar.vrm || !pose) return;

    stage.setCamMode(pose.camera.mode, {
      fov: pose.camera.fov,
      zoom: pose.camera.zoom,
      position: pose.camera.position,
      rotation: pose.camera.rotation,
      // quaternion: pose.camera.quaternion,
      target: pose.camera.target,
    });
    stage.setSize(pose.canvas.width, pose.canvas.height);

    // Object.entries(pose.morphs).map(([k, { value }]: [string, any]) => {
    //   if (proxy[k]) proxy[k].value = value;
    // });

    // Object.entries(pose.blendShapeProxies).map(
    //   ([name, value]: [string, number]) => {
    //     vrm.blendShapeProxy?.setValue(name, value);
    //   }
    // );

    // Object.entries(pose.bones).map(([name, bone]: [string, any]) => {
    //   const o = vrm.scene.getObjectByName(name)!;
    //   if (!o) return;

    //   o.position.set(...(bone.position as any));
    //   o.rotation.set(...(bone.rotation as any));
    //   o.quaternion.set(...(bone.quaternion as any));
    // });

    setState({
      poseId: poseId!,
      poseName: pose.name,
      captureCam: pose.camera,
      fov: pose.camera.fov,
      size: { width: pose.canvas.width, height: pose.canvas.height },
    });
  });

  const handleClickLoadSceneAll = useFunc((params: ItemParams) => {
    const poseId = params.props.poseId;
    const pose = migrateV0PoseToV1(poses.find((p) => p.uid === poseId));

    const { avatar } = Object.values(stage.vrms)[0];
    if (!avatar.vrm || !pose) return;

    stage.setCamMode(pose.camera.mode, {
      fov: pose.camera.fov,
      zoom: pose.camera.zoom,
      position: pose.camera.position,
      rotation: pose.camera.rotation,
      // quaternion: pose.camera.quaternion,
      target: pose.camera.target,
    });
    stage.setSize(pose.canvas.width, pose.canvas.height);

    Object.entries(pose.morphs).map(([k, { value }]: [string, any]) => {
      if (avatar.blendshapes?.[k]) avatar.blendshapes[k].value = value;
    });

    Object.entries(pose.blendShapeProxies).map(
      ([name, value]: [string, number]) => {
        avatar.vrm.expressionManager?.setValue(name, value);
      }
    );

    avatar.vrm.humanoid!.setRawPose(pose.vrmPose);

    setState({
      poseId: poseId!,
      poseName: pose.name,
      captureCam: pose.camera,
      fov: pose.camera.fov,
      size: { width: pose.canvas.width, height: pose.canvas.height },
    });
  });

  const handleClickLoadBones = useFunc(async (params: ItemParams) => {
    const poseId = params.props.poseId;
    const pose = migrateV0PoseToV1(poses.find((p) => p.uid === poseId));

    const { avatar } = Object.values(stage.vrms)[0];
    if (!avatar.vrm || !pose) return;

    const boneNames = Object.keys(pose.bones);
    const bones = await openModal(SelectBones, {
      boneNames,
      clickBackdropToClose: true,
    });
    if (!bones) return;

    bones.map((name) => {
      const bone = pose.bones[name];
      const o = avatar.vrm.scene.getObjectByName(name)!;
      if (!o) return;

      o.position.set(...(bone.position as any));
      o.quaternion.set(...(bone.quaternion as any));
    });
  });

  const handleClickLoadShapes = useFunc(async (params: ItemParams) => {
    const poseId = params.props.poseId;
    const pose = migrateV0PoseToV1(poses.find((p) => p.uid === poseId));

    const { avatar } = Object.values(stage.vrms)[0];
    if (!avatar.vrm || !pose) return;

    const poseNames = [
      ...Object.keys(pose.blendShapeProxies),
      ...Object.keys(pose.morphs),
    ];

    const morphs = await openModal(SelectExpressions, {
      expressionNames: poseNames,
      clickBackdropToClose: true,
    });
    if (!morphs) return;

    Object.entries(pose.morphs).map(([k, { value }]: [string, any]) => {
      if (!morphs.includes(k)) return;
      if (avatar.blendshapes?.[k]) avatar.blendshapes[k].value = value;
    });

    Object.entries(pose.blendShapeProxies).map(
      ([name, value]: [string, number]) => {
        if (!morphs.includes(name)) return;
        avatar.vrm.expressionManager?.setValue(name, value);
      }
    );
  });

  const handleClickDownloadPose = useFunc((params: ItemParams) => {
    const poseId = params.props.poseId;
    const pose = migrateV0PoseToV1(poses.find((p) => p.uid === poseId));
    if (!pose) return;

    const json = new Blob([JSON.stringify(pose, null, '  ')], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(json);

    letDownload(url, `pose-${pose.name}.json`);
  });

  const handleClickDownloadPoseSet = useFunc((params: ItemParams) => {
    const json = new Blob(
      [
        JSON.stringify(
          {
            poseset: (poses ?? []).map(({ ...pose }) => {
              pose.uid ??= nanoid();
              return pose;
            }),
          },
          null,
          '  '
        ),
      ],
      {
        type: 'application/json',
      }
    );
    const url = URL.createObjectURL(json);

    letDownload(url, `poseset.json`);
  });

  const handleClickLoadCamera = useFunc((params: ItemParams) => {
    const poseId = params.props.poseId;
    const pose = migrateV0PoseToV1(poses.find((p) => p.uid === poseId));

    if (!pose) return;

    stage.setCamMode(pose.camera.mode, {
      fov: pose.camera.fov,
      zoom: pose.camera.zoom,
      position: pose.camera.position,
      rotation: pose.camera.rotation,
      // quaternion: pose.camera.quaternion,
      target: pose.camera.target,
    });
    // stage.setSize(pose.canvas.width, pose.canvas.height);

    setState({
      fov: pose.camera.fov,
      size: { width: pose.canvas.width, height: pose.canvas.height },
    });
  });

  const handleClickRemovePose = useFunc((params: ItemParams) => {
    executeOperation(editorOps.deletePose, params.props.poseId);
  });

  // #endregion
  // endregion

  /////
  //// Models UI Event Handlers
  /////
  // #region Models UI Event Handlers
  const handleClickLoadModel = useFunc(
    (params: ItemParams<{ modelId: string }>) => {
      const modelId = params.props!.modelId;

      executeOperation(editorOps.loadVrmBin, modelId, (blob) => {
        const url = URL.createObjectURL(blob);
        stage.loadVRM(url);
      });
    }
  );

  const handleClickRemoveModel = useFunc(
    (params: ItemParams<{ modelId: string }>) => {
      executeOperation(editorOps.deleteVrm, params.props!.modelId);
    }
  );

  const changeCamKind = useStableLatestRef(
    (nextMode: 'editorial' | 'capture') => {
      if (!stage) return;

      const current = {
        mode: stage.camMode,
        target: stage.orbitControls.target.toArray(),
        position: stage.activeCamera.position.toArray(),
        quaternion: stage.activeCamera.quaternion.toArray(),
      };

      if (nextMode === 'capture') {
        // stash current to editorial cam, restore capture cam
        const next = state.captureCam ?? current;

        stage.setCamMode(next.mode, next);

        setState({
          currentCamKind: 'capture',
          editorialCam: current,
          captureCam: state.captureCam ?? current,
        });
      } else if (nextMode === 'editorial') {
        // stash current to capture cam, restore editorial cam
        const next = state.editorialCam ?? current;

        stage.setCamMode(next.mode, next);

        setState({
          currentCamKind: 'editorial',
          editorialCam: state.editorialCam ?? current,
          captureCam: current,
        });
      }
    }
  );

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

    const abort = new AbortController();

    window.addEventListener(
      'keyup',
      () => !abort.signal.aborted && abort.abort(),
      { once: true }
    );

    openModal(KeyboardHelp, {}, { signal: abort.signal });
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

  const model = stage ? Object.values(stage.avatars)[0] : null;
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
          {stage?.camMode}
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
  );

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
                  css={css`
                    font-size: 12px;
                  `}
                >
                  {model?.avatar.kalidokit.isInitializing
                    ? '起動中…'
                    : model?.avatar.kalidokit.isCaptureRunnging
                    ? '有効'
                    : '無効'}
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
            ${transitionCss}
          `}
          style={{
            backgroundColor: menuOpened
              ? rgba('#34c0b9', 0)
              : rgba('#34c0b9', 0.8),
          }}
          onClick={handleClickSidebarOpener}
        >
          <RiArrowLeftSFill
            css={css`
              font-size: 40px;
              color: #fff;
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
}

const menuIconCss = css`
  font-size: 28px;
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
