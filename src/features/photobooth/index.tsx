import { useModalOpener } from '@fleur/mordred';
import { useFleurContext } from '@fleur/react';
import { letDownload, styleWhen, useObjectState } from '@hanakla/arma';
import { VRMExpressionPresetName, VRMHumanBoneName } from '@pixiv/three-vrm';
import useMouse from '@react-hook/mouse-position';
import { nanoid } from 'nanoid';
import { rgba } from 'polished';
import { memo, MouseEvent, useEffect, useRef, useState } from 'react';
import { ChromePicker, ColorChangeHandler } from 'react-color';
import {
  ItemParams,
  useContextMenu,
  Menu as ContextMenu,
  Item as ContextItem,
  Separator,
} from 'react-contexify';
import {
  RiArrowLeftSFill,
  RiCamera2Fill,
  RiCamera2Line,
  RiCameraSwitchFill,
  RiFlashlightFill,
  RiInformationLine,
  RiPaintFill,
  RiQuestionFill,
  RiQuestionMark,
  RiRefreshLine,
  RiSkullFill,
} from 'react-icons/ri';
import {
  useClickAway,
  useDrop,
  useEffectOnce,
  useMeasure,
  useMount,
  useUpdate,
} from 'react-use';
import useEvent from 'react-use-event-hook';
import styled, { css, CSSProperties } from 'styled-components';
import { Bone, MathUtils } from 'three';
import { Button } from '../../components/Button';
import { Checkbox } from '../../components/Checkbox';
import { Input } from '../../components/Input';
import { InputSection } from '../../components/InputSection';
import { List, ListItem } from '../../components/List';
import { Sidebar } from '../../components/Sidebar';
import { Slider } from '../../components/Slider';
import {
  EditorMode,
  editorOps,
  EditorStore,
  UnsavedVirsePose,
} from '../../domains/editor';
import { migrateV0PoseToV1 } from '../../domains/vrm';
import { KeyboardHelp } from '../../modals/KeyboardHelp';
import { SelectBones } from '../../modals/SelectBones';
import { SelectChangeBones } from '../../modals/SelectChangeBone';
import { LoadPose } from '../../modals/LoadPose';
import { CamModes, VirseStage } from '../../stage/VirseStage';
import { transitionCss } from '../../styles/mixins';
import {
  useBindMousetrap,
  useFunc,
  useStableLatestRef,
  useStoreState,
} from '../../utils/hooks';
import { useTranslation } from '../../hooks/useTranslation';
import { rightHandShortcuts } from '../../domains/ui';
import { SelectExpressions } from '../../modals/SelectExpressions';
import { VRMLicense } from '../../modals/VRMLicense';

type StashedCam = {
  mode: CamModes;
  target: number[];
  position: number[];
  quaternion: number[];
};

const replaceVRoidShapeNamePrefix = (name: string) => {
  return name.replace(/^Fcl_/g, '');
};

export const PhotoBooth = memo(function PhotoBooth({
  stage,
}: {
  stage: VirseStage | null;
}) {
  const t = useTranslation('common');
  const rerender = useUpdate();
  const { openModal } = useModalOpener();

  const shortcutBindElRef = useRef<HTMLDivElement>(
    typeof document !== 'undefined' ? document.getElementById('ui') : null
  );
  const padLRef = useRef<HTMLDivElement>(null);
  const padRRef = useRef<HTMLDivElement>(null);
  const bgColorPaneRef = useRef<HTMLDivElement>(null);
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

  useClickAway(bgColorPaneRef, ({ currentTarget }) => {
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
      rootPosition: {
        position: avatar.positionBone.position.toArray(),
        quaternion: avatar.positionBone.quaternion.toArray(),
      },
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

    setState({
      poseId: null,
      poseName: '',
    });
  });

  const handleClickResetCamera = useEvent(() => {
    if (!stage) return;
    stage.resetCamera();
  });

  const handleClickResetSelectBone = useEvent(async () => {
    const avatar = stage?.activeAvatar?.avatar;
    if (!avatar) return;

    const result = await openModal(SelectBones, {
      boneNames: avatar.allBoneNames,
    });

    if (!result) return;

    result.bones.forEach((name) => {
      const obj = avatar.vrm.scene.getObjectByName(name);
      const init = avatar.getInitialBoneState(name);

      obj?.position.fromArray(init!.position);
      obj?.quaternion.fromArray(init!.quaternion);
    });
  });

  const handleClickResetStandardMorphs = useFunc(() => {
    const { vrm } = stage?.activeAvatar;
    if (!vrm) return;

    Object.keys(vrm.expressionManager?.expressionMap ?? {}).forEach((name) => {
      vrm.expressionManager?.setValue(name, 0);
    });
  });

  const handleClickResetUnsafeMorphs = useFunc(() => {
    const avatar = stage?.activeAvatar.avatar;
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

    const avatar = stage?.activeAvatar.avatar;
    if (!avatar || !pose) return;

    Object.entries(pose.morphs).map(([k, { value }]: [string, any]) => {
      if (avatar.blendshapes?.[k]) avatar.blendshapes[k].value = value;
    });

    Object.entries(pose.blendShapeProxies).map(
      ([name, value]: [string, number]) => {
        avatar.vrm.expressionManager?.setValue(name, value);
      }
    );

    avatar.positionBone.position.fromArray(pose.rootPosition.position);
    avatar.positionBone.quaternion.fromArray(pose.rootPosition.quaternion);

    avatar.vrm.humanoid!.setRawPose(pose.vrmPose);
  });

  const handleClickLoadScene = useFunc((params: ItemParams) => {
    const poseId = params.props.poseId;
    const pose = migrateV0PoseToV1(poses.find((p) => p.uid === poseId));

    const avatar = stage?.activeAvatar.avatar;
    if (!stage || !avatar?.vrm || !pose) return;

    stage.setCamMode(pose.camera.mode, {
      fov: pose.camera.fov,
      zoom: pose.camera.zoom,
      position: pose.camera.position,
      rotation: pose.camera.rotation,
      // quaternion: pose.camera.quaternion,
      target: pose.camera.target,
    });
    stage.setSize(pose.canvas.width, pose.canvas.height);

    setState({
      poseId: null,
      poseName: undefined,
      captureCam: pose.camera,
      fov: pose.camera.fov,
      size: { width: pose.canvas.width, height: pose.canvas.height },
    });
  });

  const handleClickLoadSceneAll = useFunc((params: ItemParams) => {
    const poseId = params.props.poseId;
    const pose = migrateV0PoseToV1(poses.find((p) => p.uid === poseId));

    const avatar = stage?.activeAvatar.avatar;
    if (!stage || !avatar?.vrm || !pose) return;

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

    avatar.positionBone.position.fromArray(pose.rootPosition.position);
    avatar.positionBone.quaternion.fromArray(pose.rootPosition.quaternion);

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

    const avatar = stage?.activeAvatar.avatar;
    if (!stage || !avatar?.vrm || !pose) return;

    const boneNames = Object.keys(pose.bones);
    const result = await openModal(SelectBones, {
      boneNames,
      clickBackdropToClose: true,
    });

    if (!result) return;

    result.bones.map((name) => {
      const bone = pose.bones[name];
      const o = avatar.vrm.scene.getObjectByName(name)!;
      if (!o) return;

      o.position.set(...(bone.position as any));
      o.quaternion.set(...(bone.quaternion as any));
    });

    if (result.restorePosition) {
      avatar.positionBone.position.fromArray(pose.rootPosition.position);
      avatar.positionBone.quaternion.fromArray(pose.rootPosition.quaternion);
    }
  });

  const handleClickLoadShapes = useFunc(async (params: ItemParams) => {
    const poseId = params.props.poseId;
    const pose = migrateV0PoseToV1(poses.find((p) => p.uid === poseId));

    const avatar = stage?.activeAvatar.avatar;
    if (!stage || !avatar?.vrm || !pose) return;

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
              return migrateV0PoseToV1(pose);
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

    if (!stage || !pose) return;

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
  const handleModelsContextMenu = useFunc((e: MouseEvent<HTMLLIElement>) => {
    const modelId = e.currentTarget.dataset.modelId!;
    showContextMenu(e, { id: 'modelmenu', props: { modelId } });
  });

  const handleClickStagedModel = useEvent(
    ({ currentTarget }: MouseEvent<HTMLLIElement>) => {
      stage?.setActiveAvatar(currentTarget.dataset.uid!);
    }
  );

  const handleClickStagedModelLicense = useEvent(
    ({ currentTarget }: MouseEvent<HTMLElement>) => {
      const uid = currentTarget.dataset.uid!;
      const entry = stage?.avatarsIterator.find((m) => m.uid === uid);
      if (!stage || !entry) return;

      openModal(VRMLicense, { meta: entry.avatar.vrm?.meta });
    }
  );

  const handleDblClickModel = useFunc((e: MouseEvent<HTMLElement>) => {
    handleClickLoadModel({
      event: e,
      triggerEvent: e.nativeEvent,
      props: { modelId: e.currentTarget.dataset.modelId! },
    });
  });

  const handleClickCapture = useEvent(async () => {
    if (!stage) return;

    stage!.setShowBones(false);

    console.time('capture');

    await new Promise((r) => requestAnimationFrame(r));

    if (state.captureCam) {
      stage?.setCamMode(state.captureCam.mode, state.captureCam);
    }

    const blob = await new Promise<Blob>((resolve) => {
      stage.canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/png');
    });

    console.timeEnd('capture');

    const url = URL.createObjectURL(blob);

    letDownload(
      url,
      `${state.poseName !== '' ? state.poseName : 'Untitled'}.png`
    );

    const cam =
      state.currentCamKind === 'capture'
        ? state.captureCam
        : state.editorialCam;

    if (cam) {
      stage?.setCamMode(cam.mode, cam);
    }

    stage!.setShowBones(photoModeState.visibleBones);
  });

  const handleClickLoadModel = useFunc(
    (params: ItemParams<{ modelId: string }>) => {
      const modelId = params.props!.modelId;

      executeOperation(editorOps.loadVrmBin, modelId, (blob) => {
        const url = URL.createObjectURL(blob);
        stage?.loadVRM(url);
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

      if (state.currentCamKind === nextMode) return;

      if (nextMode === 'capture') {
        // stash current to editorial cam, restore capture cam
        const next = state.captureCam ?? current;

        stage?.setCamMode(next.mode, next);

        setState({
          currentCamKind: 'capture',
          editorialCam: current,
          captureCam: state.captureCam ?? current,
        });
      } else if (nextMode === 'editorial') {
        // stash current to capture cam, restore editorial cam
        const next = state.editorialCam ?? current;

        stage?.setCamMode(next.mode, next);

        setState({
          currentCamKind: 'editorial',
          editorialCam: state.editorialCam ?? current,
          captureCam: current,
        });
      }
    }
  );

  const handleClickChangeCam = useEvent(
    ({ currentTarget }: MouseEvent<HTMLElement>) => {
      if (!stage) return;

      const camMode: 'capture' | 'editorial' = currentTarget.dataset
        .camMode as any;

      changeCamKind.current(camMode);
    }
  );

  // const handleChangeHandMix = useFunc((_, v) => {
  //   const { vrm } = stage?.activeAvatar;
  //   if (!vrm) return;

  //   vrm.humanoid!.setRawPose({
  //     [VRMHumanBoneName.RightThumbProximal]: {
  //       rotation: new Quaternion()
  //         .setFromAxisAngle(new Vector3(0, 0, -v), Math.PI / 2)
  //         .toArray(),
  //     },
  //     [VRMHumanBoneName.RightThumbMetacarpal]: {
  //       rotation: new Quaternion()
  //         .setFromAxisAngle(new Vector3(0, 0, -v), Math.PI / 2)
  //         .toArray(),
  //     },
  //     [VRMHumanBoneName.RightThumbDistal]: {
  //       rotation: new Quaternion()
  //         .setFromAxisAngle(new Vector3(0, 0, -v), Math.PI / 2)
  //         .toArray(),
  //     },
  //     [VRMHumanBoneName.RightIndexProximal]: {
  //       rotation: new Quaternion()
  //         .setFromAxisAngle(new Vector3(0, 0, -v), Math.PI / 2)
  //         .toArray(),
  //     },
  //     [VRMHumanBoneName.RightIndexIntermediate]: {
  //       rotation: new Quaternion()
  //         .setFromAxisAngle(new Vector3(0, 0, -v), Math.PI / 2)
  //         .toArray(),
  //     },
  //     [VRMHumanBoneName.RightIndexDistal]: {
  //       rotation: new Quaternion()
  //         .setFromAxisAngle(new Vector3(0, 0, -v), Math.PI / 2)
  //         .toArray(),
  //     },
  //   });
  // });

  const handleClickHelp = useEvent(() => {
    openModal(KeyboardHelp, { temporalyShow: false });
  });

  // #endregion
  // endregion

  /////
  ///// Keyboard shortcut
  /////
  // useBindMousetrap(rootRef, 'r', () => {
  //   if (mode !== EditorMode.photo) return;

  //   setState((s) => {
  //     s.rotation = !s.rotation;
  //     stage!.setControlMode(!s.rotation ? 'rotate' : 'translate');
  //   });
  // });

  useBindMousetrap(
    shortcutBindElRef,
    rightHandShortcuts.toggleDisplaySkeleton,
    () => {
      if (mode !== EditorMode.photo) return;

      handleClickDisplayBones();
    }
  );

  useBindMousetrap(
    shortcutBindElRef,
    rightHandShortcuts.selectSiblingBone,
    async () => {
      const avatar = stage?.activeAvatar;
      const bone = avatar?.ui.activeBone;
      if (!bone) return;

      const siblBones = (bone.parent?.children ?? []).filter(
        (o: any): o is Bone => o.isBone
      );
      if (siblBones.length === 0) return;
      else if (siblBones.length === 1) avatar.ui.activeBone = siblBones[0];
      else {
        const targetBoneName = await openModal(SelectChangeBones, {
          boneNames: siblBones.map((o) => o.name),
          activeBoneName: bone.name,
        });
        if (!targetBoneName) return;

        const targetBone = siblBones.find((o) => o.name === targetBoneName);
        if (!targetBone) return;

        avatar.ui.activeBone = targetBone;
      }
    }
  );

  useBindMousetrap(
    shortcutBindElRef,
    rightHandShortcuts.selectChildBone,
    async () => {
      const avatar = stage?.activeAvatar;
      const bone = avatar?.ui.activeBone;
      if (!bone) return;

      const childBones = bone.children.filter((o: any): o is Bone => o.isBone);
      if (childBones.length === 0) return;
      else if (childBones.length === 1) avatar.ui.activeBone = childBones[0];
      else {
        const targetBoneName = await openModal(SelectChangeBones, {
          boneNames: childBones.map((o) => o.name),
        });
        if (!targetBoneName) return;

        const targetBone = childBones.find((o) => o.name === targetBoneName);
        if (!targetBone) return;

        avatar.ui.activeBone = targetBone;
      }
    }
  );

  useBindMousetrap(
    shortcutBindElRef,
    rightHandShortcuts.selectParentBone,
    () => {
      const avatar = stage?.activeAvatar;
      if (!avatar) return;

      const bone = avatar?.ui.activeBone;
      if (!bone || !(bone.parent as any).isBone) return;

      avatar.ui.activeBone = bone.parent;
    }
  );

  useBindMousetrap(
    shortcutBindElRef,
    rightHandShortcuts.toggleBoneControlMode,
    () => {
      if (mode !== EditorMode.photo) return;

      const modes = ['translate', 'rotate'] as const;
      const current = stage!.boneControlMode;

      stage!.boneControlMode =
        modes[(modes.indexOf(current) + 1) % modes.length];
    }
  );

  useBindMousetrap(shortcutBindElRef, rightHandShortcuts.nextAvatar, () => {
    const currentUid = stage?.activeAvatar?.uid;
    if (!stage || !currentUid) return;

    const avatars = stage.avatarsIterator;
    const currentIdx = avatars.findIndex((o) => o.uid === currentUid);
    if (currentIdx === -1) return;

    const nextIdx = (currentIdx + 1) % avatars.length;
    const nextAvatarUID = avatars[nextIdx].uid;
    stage.setActiveAvatar(nextAvatarUID);
  });

  useBindMousetrap(shortcutBindElRef, rightHandShortcuts.previousAvatar, () => {
    const currentUid = stage?.activeAvatar?.uid;
    if (!stage || !currentUid) return;

    const avatars = stage.avatarsIterator;
    const currentIdx = avatars.findIndex((o) => o.uid === currentUid);
    if (currentIdx === -1) return;

    const nextIdx = (currentIdx + avatars.length - 1) % avatars.length;
    const nextAvatarUID = avatars[nextIdx].uid;
    stage.setActiveAvatar(nextAvatarUID);
  });

  useBindMousetrap(shortcutBindElRef, rightHandShortcuts.axisX, (e) => {
    stage?.activeAvatar?.ui?.setAxis('X');
  });

  useBindMousetrap(shortcutBindElRef, rightHandShortcuts.axisY, (e) => {
    stage?.activeAvatar?.ui?.setAxis('Y');
  });

  useBindMousetrap(shortcutBindElRef, rightHandShortcuts.axisZ, (e) => {
    stage?.activeAvatar?.ui?.setAxis('Z');
  });

  useBindMousetrap(
    shortcutBindElRef,
    rightHandShortcuts.keyboardShortcutHelp,
    (e) => {
      if (e.repeat) return;

      const abort = new AbortController();

      window.addEventListener(
        'keyup',
        () => !abort.signal.aborted && abort.abort(),
        { once: true }
      );

      openModal(
        KeyboardHelp,
        { temporalyShow: true },
        { signal: abort.signal }
      );
    }
  );

  useBindMousetrap(shortcutBindElRef, 'p', () => {
    setRightTab('poses');
  });

  useBindMousetrap(shortcutBindElRef, 'o', () => {
    setRightTab('expr');
  });

  useBindMousetrap(shortcutBindElRef, 'c', () => {
    changeCamKind.current('editorial');
  });

  useBindMousetrap(shortcutBindElRef, 'shift+c', () => {
    changeCamKind.current('capture');
  });

  // useEffect(() => {
  //   openModal(KeyboardHelp, {});
  // });

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
    stage.events.on('updated', rerender);

    return () => {
      stage.events.off('updated', rerender);
    };
  }, [stage]);

  useEffect(() => {
    const onResize = () => {
      stage?.setSize(state.size.width, window.innerHeight);
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
  useEffectOnce(() => {
    stage?.setShowBones(photoModeState.visibleBones);
    stage?.setSize(state.size.width, state.size.height);
  });

  useEffectOnce(() => {
    if (!stage) return;
    setState({ size: stage?.getSize() });
  });

  // Sync right eye position to Avatar
  useEffect(() => {
    const vrm = stage?.activeAvatar?.vrm;
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

  // Sync left eye position to Avatar
  useEffect(() => {
    const vrm = stage?.activeAvatar?.vrm;
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

  const activeAvatar = stage ? stage.activeAvatar : null;

  //// Render
  return (
    <div
      css={css`
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        display: flex;
        flex-flow: column;
        pointer-events: none;
      `}
      tabIndex={-1}
    >
      {/* Photomenu */}
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
            <div
              css={css`
                position: absolute;
                right: -48px;
                top: 16px;
                transform: translateX(100%);
                user-select: none;
                cursor: default;
              `}
            >
              <span
                css={css`
                  display: inline-block;
                  padding: 4px;
                  background-color: rgb(255 255 255 / 68%);
                  font-weight: bold;
                `}
              >
                {activeAvatar?.ui.activeBoneName ?? t('noBoneSelected')}
              </span>

              {activeAvatar?.ui.hoveredBone && (
                <>
                  <br />
                  <span
                    css={css`
                      display: inline-block;
                      padding: 4px;
                      background-color: rgb(255 255 255 / 68%);
                      font-size: 14px;
                      opacity: 0.8;
                    `}
                  >
                    {activeAvatar?.ui.hoveredBone.name}
                  </span>
                </>
              )}
            </div>
            <div
              css={css`
                position: absolute;
                right: -48px;
                bottom: 16px;
                transform: translateX(100%);
                display: flex;
                flex-flow: row;
                gap: 8px;
                user-select: none;
                cursor: default;
              `}
            >
              <Button
                css={css`
                  white-space: nowrap;
                `}
                style={
                  state.currentCamKind === 'editorial'
                    ? { boxShadow: '0 0 0 2px #34c0b9' }
                    : {}
                }
                onClick={handleClickChangeCam}
                data-cam-mode="editorial"
              >
                {t('editorialCam')}
              </Button>
              <Button
                css={css`
                  white-space: nowrap;
                `}
                style={
                  state.currentCamKind === 'capture'
                    ? { boxShadow: '0 0 0 2px #34c0b9' }
                    : {}
                }
                onClick={handleClickChangeCam}
                data-cam-mode="capture"
              >
                {t('captureCam')}
              </Button>
            </div>

            <MenuItem
              css={`
                position: relative;
              `}
              onClick={handleClickBackgroundColor}
            >
              <RiPaintFill css={menuIconCss} />
              {t('bgColor')}
              <div
                ref={bgColorPaneRef}
                data-ignore-click
                css={`
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

                {stage && (
                  <span
                    css={css`
                      font-size: 12px;
                    `}
                  >
                    {t(`camMode/${stage.camMode}`)}
                  </span>
                )}
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

            <MenuItem onClick={handleClickDisplayBones}>
              <RiSkullFill css={menuIconCss} />
              <div>
                {t('showSkeleton')}(B)
                <br />
                <span
                  css={css`
                    font-size: 12px;
                  `}
                >
                  {photoModeState.visibleBones ? 'on' : 'off'}
                </span>
              </div>
            </MenuItem>
            <MenuItem onClick={handleClickTransform}>
              <RiRefreshLine css={menuIconCss} />
              <div>
                {t('boneMode')}(R) <br />
                <span
                  css={css`
                    font-size: 12px;
                  `}
                >
                  {stage?.boneControlMode === 'rotate'
                    ? t('boneMode/rotate')
                    : t('boneMode/translate')}
                </span>
              </div>
            </MenuItem>
            {/* <MenuItem
              onClick={() => (stage.enableEffect = !stage.enableEffect)}
            >
              <RiMagicFill css={menuIconCss} />
              <div>Effect</div>
            </MenuItem> */}
            <MenuItem
              onClick={handleClickResetPose}
              onContextMenu={handleResetContextMenu}
            >
              <RiFlashlightFill css={menuIconCss} />
              {t('resetPose')}
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
              <InputSection title={t('resolutionPx')}>
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
                      stage.setSize(
                        currentTarget.valueAsNumber,
                        stage.getSize().height
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
                      stage.setSize(
                        stage.getSize().width,
                        currentTarget.valueAsNumber
                      );
                    }}
                  />
                </div>
                <Button
                  css={`
                    margin-top: 8px;
                  `}
                  size="min"
                  onClick={() => {
                    setState({
                      size: {
                        width: window.innerWidth,
                        height: window.innerHeight,
                      },
                    });

                    stage.setSize(window.innerWidth, window.innerHeight);
                  }}
                >
                  {t('resolution/resetToScreenSize')}
                </Button>
              </InputSection>

              <InputSection title={t('onStageModels')}>
                <List
                  css={`
                    flex: 1;
                    overflow: auto;
                  `}
                >
                  {stage?.avatarsIterator.map(({ uid, avatar }) => (
                    <ListItem
                      key={uid}
                      css={css`
                        display: flex;
                      `}
                      data-uid={uid}
                      active={stage.activeAvatar?.uid === uid}
                      onClick={handleClickStagedModel}
                    >
                      <div
                        css={css`
                          flex: 1;
                        `}
                      >
                        <div>
                          {avatar.vrm.meta.metaVersion === '0'
                            ? avatar.vrm.meta.title
                            : avatar.vrm.meta.name}
                        </div>
                        <div
                          css={css`
                            margin-top: 6px;
                            font-size: 12px;
                            opacity: 0.8;
                          `}
                        >
                          {avatar.vrm.meta.version
                            ? avatar.vrm.meta.version
                            : t('noVersionInfo')}
                        </div>
                      </div>
                      <div
                        css={css`
                          display: flex;
                          align-items: center;
                          justify-content: center;
                        `}
                      >
                        <RiInformationLine
                          fontSize={16}
                          onClick={handleClickStagedModelLicense}
                          data-uid={uid}
                        />
                      </div>
                    </ListItem>
                  ))}

                  <ListItem
                    css={css`
                      margin-top: 6px;
                      font-size: 12px;
                    `}
                  >
                    Drop VRM to add on stage
                  </ListItem>
                </List>
              </InputSection>

              <InputSection title={t('recentlyUsedModels')}>
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
                          opacity: 0.8;
                        `}
                      >
                        {entry.version ? entry.version : t('noVersionInfo')}
                      </div>
                    </ListItem>
                  ))}
                </List>
              </InputSection>
            </div>
          </div>
        </Sidebar>

        <Sidebar
          css={`
            position: absolute;
            right: 0;
            display: flex;
            flex-flow: column;
            width: 240px;
            height: 100%;
            pointer-events: all;
            ${transitionCss}
          `}
          side="right"
          opened={menuOpened}
        >
          <div
            // Help button
            css={`
              position: absolute;
              right: 100%;
              top: 16px;
              margin-right: 48px;
              z-index: 2;
            `}
          >
            <Button
              kind="default"
              css={`
                padding: 8px;
                box-shadow: 0 0 5px ${rgba('#aaaa', 0.5)};
                ${transitionCss}
              `}
              style={{
                transform: menuOpened ? 'translateX(0)' : 'translateX(-100%)',
              }}
              onClick={handleClickHelp}
            >
              <RiQuestionMark
                css={`
                  font-size: 20px;
                `}
              />
            </Button>
          </div>

          <div
            // Capture button
            css={`
              position: absolute;
              right: 100%;
              bottom: 16px;
              margin-right: 48px;
              z-index: 2;
            `}
          >
            <Button
              kind="primary"
              css={`
                padding: 12px;
                box-shadow: 0 4px 5px ${rgba('#aaaa', 0.5)};
                ${transitionCss}
              `}
              style={{
                transform: menuOpened ? 'translateX(0)' : 'translateX(-100%)',
              }}
              onClick={handleClickCapture}
            >
              <RiCamera2Fill
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
                active={rightTab === 'expr'}
                onClick={() => setRightTab('expr')}
              >
                {t('facial')}
              </Tab>
              <Tab
                active={rightTab === 'poses'}
                onClick={() => setRightTab('poses')}
              >
                {t('pose')}
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
              style={rightTab === 'expr' ? {} : hiddenStyle}
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
                  {t('facial/syncEyes')}
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
                      background-color: ${rgba('#fff', 0.5)};
                      &::before {
                        content: '';
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
                      background-color: ${rgba('#fff', 0.5)};
                      &::before {
                        content: '';
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
                  margin-top: 16px;
                  padding-right: 8px;
                  flex: 1;
                  overflow: auto;
                  scrollbar-gutter: stable;

                  user-select: none;
                  &::-webkit-scrollbar {
                    width: 4px;
                  }

                  &::-webkit-scrollbar-track {
                    background-color: #ccc;
                  }

                  &::-webkit-scrollbar-thumb {
                    background-color: #17585d;
                  }
                `}
              >
                <ExprHead
                  css={css`
                    margin-top: 0;
                  `}
                >
                  {t('facial/presets')}
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
                    {t('facial/reset')}
                  </Button>
                </ExprHead>

                <div
                  css={`
                    display: flex;
                    flex-flow: column;
                    gap: 12px;
                  `}
                >
                  {Object.keys(
                    activeAvatar?.vrm.expressionManager?.expressionMap ?? {}
                  ).map((name) => (
                    <Slider
                      key={name}
                      label={
                        <>
                          {t(`vrm/exprPreset/${name}`, null, {
                            fallback: name,
                          })}
                        </>
                      }
                      title={name}
                      min={0}
                      max={1}
                      value={
                        activeAvatar?.vrm.expressionManager?.getValue(name) ?? 0
                      }
                      onChange={(v) =>
                        activeAvatar?.vrm.expressionManager?.setValue(name, v)
                      }
                    />
                  ))}
                </div>

                <ExprHead>
                  {t('facial/customs')}
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
                    {t('facial/reset')}
                  </Button>
                </ExprHead>

                <div
                  css={`
                    display: flex;
                    flex-flow: column;
                    gap: 12px;
                  `}
                >
                  {activeAvatar?.avatar.blendshapes ? (
                    Object.entries(activeAvatar.avatar.blendshapes).map(
                      ([name, proxy]) => (
                        <Slider
                          key={name}
                          label={
                            // prettier-ignore
                            name.match(/eye/i) ? <>👀 {replaceVRoidShapeNamePrefix(name)}</>
                            : name.match(/mth/i) ? <>💋 {replaceVRoidShapeNamePrefix(name)}</>
                            : name.match(/ha_/i) ? <>🦷 {replaceVRoidShapeNamePrefix(name)}</>
                            : name.match(/brw/i) ? <>⏜ {replaceVRoidShapeNamePrefix(name)}</>
                            : <>❓ {replaceVRoidShapeNamePrefix(name)}</>
                          }
                          title={replaceVRoidShapeNamePrefix(name)}
                          min={-2.5}
                          max={2.5}
                          value={proxy.value}
                          onChange={(v) => {
                            proxy.value = v;
                          }}
                        />
                      )
                    )
                  ) : (
                    <div>{t('facial/customs/noAvailable')}</div>
                  )}
                </div>
              </div>
            </div>

            <div
              css={`
                display: flex;
                gap: 16px;
                flex: 1;
                flex-flow: column;
                overflow: hidden;
              `}
              style={rightTab === 'poses' ? {} : hiddenStyle}
            >
              {/* <h3>右手</h3>

                  <div>
                    <Slider
                      title={"右手"}
                      min={0}
                      max={1}
                      value={state.handMix.right}
                      onChange={(v) => {
                        handleChangeHandMix("right", v);
                        setState({ handMix: { right: v } });
                      }}
                      step={0.01}
                    />
                  </div>

                  <h3>左手</h3> */}

              <List
                css={`
                  flex: 1;
                  overflow: auto;
                `}
              >
                {poses.map((pose, idx) => (
                  <ListItem
                    key={idx}
                    active={state.poseId === pose.uid}
                    onDoubleClick={handleDblClickPose}
                    onContextMenu={handlePoseContextMenu}
                    data-pose-id={pose.uid}
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
                  gap: 8px;
                  margin-top: auto;
                `}
              >
                <Input
                  value={state.poseName}
                  onChange={({ currentTarget }) =>
                    setState({ poseName: currentTarget.value })
                  }
                />

                <Button onClick={handleClickSavePose}>
                  {t('pose/savePose')}
                </Button>

                <Button
                  kind="primary"
                  disabled={!state.poseId}
                  onClick={handleClickOverwritePose}
                >
                  {t('pose/overwrite')}
                  {state.poseId && (
                    <span
                      css={css`
                        width: 100%;
                        display: block;
                        font-size: 8px;
                      `}
                    >
                      ({poses.find((p) => p.uid === state.poseId)?.name})
                    </span>
                  )}
                </Button>
              </div>
            </div>
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
              ? rgba('#34c0b9', 0)
              : rgba('#34c0b9', 0.8),
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
              transform: menuOpened ? 'rotate(0)' : 'rotate(180deg)',
            }}
          />
        </div>
      </>

      <ContextMenu
        css={`
          padding: 4px;
          font-size: 12px;
        `}
        id="posemenu"
        animation={false}
      >
        <ContextItem onClick={handleClickLoadSceneAll}>
          {t('posemenu/loadAll')}
        </ContextItem>
        <ContextItem onClick={handleClickLoadCamera}>
          {t('posemenu/loadCam')}
        </ContextItem>
        <ContextItem onClick={handleClickLoadScene}>
          {t('posemenu/loadScene')}
        </ContextItem>
        <ContextItem onClick={handleClickLoadBones}>
          {t('posemenu/loadBones')}
        </ContextItem>
        <ContextItem onClick={handleClickLoadShapes}>
          {t('posemenu/loadFacial')}
        </ContextItem>

        <Separator />

        <ContextItem onClick={handleClickDownloadPose}>
          {t('posemenu/download')}
        </ContextItem>

        <ContextItem onClick={handleClickDownloadPoseSet}>
          {t('posemenu/downloadAll')}
        </ContextItem>

        <Separator />

        <ContextItem onClick={handleClickRemovePose}>
          {t('posemenu/delete')}
        </ContextItem>
      </ContextMenu>

      <ContextMenu
        css={`
          padding: 4px;
          font-size: 12px;
        `}
        id="resetMenu"
        animation={false}
      >
        <ContextItem onClick={handleClickResetSelectBone}>
          {t('resetmenu/resetSelectedBones')}
        </ContextItem>

        <ContextItem onClick={handleClickResetCamera}>
          {t('resetmenu/resetCamera')}
        </ContextItem>
      </ContextMenu>

      {/* <ContextMenu
          css={`
            padding: 4px;
            font-size: 12px;
          `}
          id="scenemenu"
          animation={false}
        >
          <ContextItem onClick={handleClickResetRotation}>回転をリセット</ContextItem>
        </ContextMenu> */}

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
});

const menuIconCss = css`
  font-size: 22px;
  color: #fff;
`;

const hiddenStyle: CSSProperties = {
  display: 'none',
  pointerEvents: 'none',
  userSelect: 'none',
  opacity: 0,
};

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
  margin: 32px 0 12px;
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
