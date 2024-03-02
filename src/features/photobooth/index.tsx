import { useModalOpener } from '@fleur/mordred';
import { useFleurContext } from '@fleur/react';
import {
  letDownload,
  selectFile,
  styleWhen,
  useChangedEffect,
} from '@hanakla/arma';
import { VRMExpressionPresetName, VRMHumanBoneName } from '@pixiv/three-vrm';
import useMouse from '@react-hook/mouse-position';
import { nanoid } from 'nanoid';
import { rgba } from 'polished';
import {
  type ChangeEvent,
  memo,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ChromePicker, ColorChangeHandler } from 'react-color';
import {
  ItemParams,
  useContextMenu,
  Menu as ContextMenu,
  Item as ContextItem,
  Separator,
} from 'react-contexify';
import { useLongPress } from 'use-long-press';
import {
  RiArrowLeftLine,
  RiArrowLeftRightFill,
  RiArrowLeftSFill,
  RiArrowRightLine,
  RiCamera2Fill,
  RiCameraSwitchFill,
  RiEyeCloseFill,
  RiEyeFill,
  RiFlashlightFill,
  RiInformationLine,
  RiPaintFill,
  RiQuestionMark,
  RiRefreshLine,
  RiSkullFill,
  RiSplitCellsHorizontal,
} from 'react-icons/ri';
import { useClickAway, useMount, useUpdate } from 'react-use';
import { Packr } from 'msgpackr';
import useEvent from 'react-use-event-hook';
import styled, { css, CSSProperties } from 'styled-components';
import { Bone, MathUtils, Quaternion, Vector3Tuple, Vector4Tuple } from 'three';
import { Button } from '../../components/Button';
import { Checkbox } from '../../components/Checkbox';
import { Input } from '../../components/Input';
import { InputSection, InputSectionDiv } from '../../components/InputSection';
import { List, ListItem } from '../../components/List';
import { Sidebar } from '../../components/Sidebar';
import { Slider } from '../../components/Slider';
import {
  EditorMode,
  editorOps,
  EditorStore,
  UnsavedVirsePose,
  VirsePose,
  VirseProject,
} from '../../domains/editor';
import { migrateVRM0PoseToV1 } from '../../domains/vrm';
import { KeyboardHelp } from '../../modals/KeyboardHelp';
import { SelectBones } from '../../modals/SelectBones';
import { SelectChangeBones } from '../../modals/SelectChangeBone';
import { CamModes, VirseStage } from '../../stage/VirseStage';
import { transitionCss } from '../../styles/mixins';
import {
  useBindMousetrap,
  useFunc,
  useObjectStateWithRef,
  useStableLatestRef,
  useStoreState,
} from '../../utils/hooks';
import { useTranslation } from '../../hooks/useTranslation';
import { rightHandShortcuts } from '../../domains/ui';
import { SelectExpressions } from '../../modals/SelectExpressions';
import { VRMLicense } from '../../modals/VRMLicense';
import { ConfirmModal } from '../../modals/ConfirmModal';
import { Trans } from '../../components/Trans';
import { emptyCoalesce } from '../../utils/lang';
import { SelectModel } from '../../modals/SelectModel';
import escapeStringRegexp from 'escape-string-regexp';

type StashedCam = {
  mode: CamModes;
  fov: number;
  zoom: number;
  target: Vector3Tuple;
  position: Vector3Tuple;
  quaternion: Vector4Tuple;
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

  const shortcutBindElRef = useRef<HTMLElement | null>(
    typeof document !== 'undefined' ? document.getElementById('ui') : null
  );
  const padLRef = useRef<HTMLDivElement>(null);
  const padRRef = useRef<HTMLDivElement>(null);
  const bgColorPaneRef = useRef<HTMLDivElement>(null);
  const padLMouse = useMouse(padLRef);
  const padRMouse = useMouse(padRRef);

  const { show: showContextMenu, hideAll } = useContextMenu({});

  const [rightTab, setRightTab] = useState<'expr' | 'poses'>('expr');
  const [state, setState] = useObjectStateWithRef({
    loadedPoses: {
      '': {
        poseId: null,
        poseName: '',
      },
    } as {
      [avatarUid: string]: { poseId: string | null; poseName: string };
    },
    rotation: false,
    syncEyes: true,
    eyeLeft: { x: 0, y: 0 },
    eyeRight: { x: 0, y: 0 },
    showColorPane: false,
    currentCamKind: 'capture' as 'editorial' | 'capture',
    captureCam: null as StashedCam | null,
    editorialCam: null as StashedCam | null,
    handMix: {
      right: 0,
      left: 0,
    },
  });

  const { executeOperation, getStore } = useFleurContext();
  const {
    mode,
    menuOpened,
    poses,
    photoModeState,
    modelIndex,
    latestSavedPoseUid,
  } = useStoreState((get) => ({
    ...get(EditorStore),
  }));

  const [facialFilter, setFacialFilter] = useState<RegExp | null>(null);

  const handleClickBackgroundColor = useFunc((e) => {
    if ((e.target as HTMLElement).closest('[data-ignore-click]')) return;

    setState((state) => {
      state.showColorPane = !state.showColorPane;
    });
  });

  const handleClickBGTransparent = useEvent(() => {
    stage?.setBackgroundColor({ r: 255, g: 255, b: 255, a: 0 });
  });

  const handleClickBGBlue = useEvent(() => {
    stage?.setBackgroundColor({ r: 0, g: 0, b: 255, a: 1 });
  });

  const handleClickBGGreen = useEvent(() => {
    stage?.setBackgroundColor({ r: 0, g: 255, b: 0, a: 1 });
  });

  const handleChangeBgColor = useFunc<ColorChangeHandler>((color) => {
    stage?.setBackgroundColor({ ...color.rgb, a: color.rgb.a! });
  });

  const handleChangeBgColorComplete = useFunc<ColorChangeHandler>((color) => {
    stage?.setBackgroundColor({ ...color.rgb, a: color.rgb.a! });
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
      stage!.boneControlMode = !s.rotation ? 'rotate' : 'translate';
    });
  });

  const serializeCurrentPose = useStableLatestRef(() => {
    if (!stage?.activeAvatar) return;

    return serializeAvatarPose.current(stage.activeAvatar.uid);
  });

  const serializeAvatarPose = useStableLatestRef((avatarUid: string) => {
    const avatarData = stage?.getAvatar(avatarUid);
    if (!stage || !avatarData) return;

    const { vrm, avatar } = avatarData;

    const bones: Bone[] = [];
    vrm.scene.traverse((o) => {
      if ((o as any).isBone) bones.push(o as Bone);
    });

    const vrmPose = vrm.humanoid.getRawPose();

    const original = state.loadedPoses[avatarUid]
      ? poses.find((p) => p.uid === state.loadedPoses[avatarUid]?.poseId)
      : null;

    const pose: UnsavedVirsePose = {
      name: emptyCoalesce(state.loadedPoses[avatarUid]?.poseName, 'New Pose'),
      canvas: stage.getSize(),
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
      vrmVersion: avatar.vrm.meta.metaVersion,
      vrmPose,
      rootPosition: {
        position: avatar.positionBone.position.toArray(),
        quaternion: avatar.positionBone.quaternion.toArray(),
      },
      bones: {
        ...original?.bones,
        ...bones.reduce((a, b) => {
          a[b.name] = {
            position: b.position.toArray([]) as Vector3Tuple,
            quaternion: b.quaternion.toArray([]) as Vector4Tuple,
            scale: b.scale.toArray([]) as Vector3Tuple,
          } satisfies VirsePose['bones'][string];
          return a;
        }, Object.create(null)),
      },
    };

    return pose;
  });

  const handleClickOverwritePose = useEvent(() => {
    const { activeAvatar } = stage!;
    const pose = serializeCurrentPose.current();

    const originalPoseId = state.loadedPoses[activeAvatar.uid].poseId;
    if (!pose || !originalPoseId) return;

    executeOperation(
      editorOps.savePose,
      { ...pose, uid: originalPoseId },
      { overwrite: true }
    );
  });

  const handleClickSavePose = useEvent(() => {
    const pose = serializeCurrentPose.current();
    if (!pose) return;

    executeOperation(editorOps.savePose, pose);
  });

  useChangedEffect(() => {
    const pose = poses.find((p) => p.uid === latestSavedPoseUid);
    if (!pose) return;

    setState((next) => {
      next.loadedPoses[stage!.activeAvatar!.uid] = {
        poseId: pose.uid,
        poseName: pose.name,
      };
    });
  }, [latestSavedPoseUid]);

  const handleClickResetPose = useFunc(() => {
    const activeAvatar = stage?.activeAvatar;
    if (!activeAvatar) return;

    activeAvatar.avatar.resetPose();
    activeAvatar.avatar.resetExpressions();

    setState((next) => {
      next.loadedPoses[activeAvatar.uid] = {
        poseId: null,
        poseName: '',
      };
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
    if (!avatar || !avatar.blendshapes) return;

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

  const handleChangePoseName = useEvent(
    ({ currentTarget }: ChangeEvent<HTMLInputElement>) => {
      if (!stage?.activeAvatar) return;

      setState((next) => {
        next.loadedPoses[stage.activeAvatar.uid] ??= {
          poseId: null,
          poseName: '',
        };
        next.loadedPoses[stage.activeAvatar.uid].poseName = currentTarget.value;
      });
    }
  );

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

  const applyPoseToActiveAvatar = useStableLatestRef(
    (
      pose: UnsavedVirsePose,
      {
        camera,
        presetExpressions,
        extraBlendShapes,
        nonStandardBones,
      }: {
        camera: boolean;
        presetExpressions: boolean;
        extraBlendShapes: boolean;
        nonStandardBones: boolean | string[];
      }
    ) => {
      if (!stage?.activeAvatar) return;

      const { avatar } = stage.activeAvatar;

      if (camera) {
        stage.setCamMode(pose.camera.mode, {
          fov: pose.camera.fov,
          zoom: pose.camera.zoom,
          position: pose.camera.position,
          rotation: pose.camera.rotation,
          // quaternion: pose.camera.quaternion,
          target: pose.camera.target,
        });

        stage.setSize(pose.canvas.width, pose.canvas.height);
      }

      if (extraBlendShapes) {
        Object.entries(pose.morphs).map(([k, { value }]: [string, any]) => {
          if (avatar.blendshapes?.[k]) avatar.blendshapes[k].value = value;
        });
      }

      if (presetExpressions) {
        Object.entries(pose.blendShapeProxies).map(
          ([name, value]: [string, number]) => {
            avatar.vrm.expressionManager?.setValue(name, value);
          }
        );
      }

      if (nonStandardBones) {
        if (nonStandardBones === true) {
          nonStandardBones = Object.keys(pose.bones);
        }

        nonStandardBones.map((name) => {
          const bone = pose.bones[name];
          const o = avatar.vrm.scene.getObjectByName(name)!;
          if (!bone || !o) return;

          o.position.set(...bone.position);
          o.quaternion.set(...bone.quaternion);
        });
      }

      avatar.vrm.humanoid.setRawPose(pose.vrmPose);

      if (pose.rootPosition) {
        avatar.positionBone.position.fromArray(pose.rootPosition.position);
        avatar.positionBone.quaternion.fromArray(pose.rootPosition.quaternion);
      }
    }
  );

  const handleClickLoadPoseOnly = useFunc((params: ItemParams) => {
    const { avatar, uid } = stage?.activeAvatar ?? {};

    const poseId = params.props.poseId;
    let pose = poses.find((p) => p.uid === poseId);

    if (!avatar || !uid || !pose) return;
    pose = migrateVRM0PoseToV1(pose, avatar.vrm.meta.metaVersion);

    applyPoseToActiveAvatar.current(pose, {
      camera: false,
      presetExpressions: true,
      extraBlendShapes: true,
      nonStandardBones: false,
    });

    setState((next) => {
      next.loadedPoses[uid] = {
        poseId,
        poseName: pose.name,
      };
    });
  });

  const handleClickLoadScene = useFunc((params: ItemParams) => {
    const avatar = stage?.activeAvatar?.avatar;

    const poseId = params.props.poseId;
    let pose = poses.find((p) => p.uid === poseId);

    if (!stage || !avatar?.vrm || !pose) return;
    pose = migrateVRM0PoseToV1(pose, avatar.vrm.meta.metaVersion);

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
      captureCam: pose.camera,
    });
  });

  const handleClickLoadSceneAll = useFunc((params: ItemParams) => {
    const avatar = stage?.activeAvatar?.avatar;

    const poseId = params.props.poseId;
    let pose = poses.find((p) => p.uid === poseId);

    if (!avatar || !pose) return;
    pose = migrateVRM0PoseToV1(pose, avatar.vrm.meta.metaVersion);

    if (avatar) {
      applyPoseToActiveAvatar.current(pose, {
        camera: true,
        presetExpressions: true,
        extraBlendShapes: true,
        nonStandardBones: false,
      });

      setState((next) => {
        next.loadedPoses[stage.activeAvatar.uid] = {
          poseId,
          poseName: pose.name,
        };
      });
    }

    setState({
      captureCam: pose.camera,
    });
  });

  const handleClickLoadBones = useFunc(async (params: ItemParams) => {
    const avatar = stage?.activeAvatar?.avatar;

    const poseId = params.props.poseId;
    let pose = poses.find((p) => p.uid === poseId);

    if (!stage || !avatar?.vrm || !pose) return;
    pose = migrateVRM0PoseToV1(pose, avatar.vrm.meta.metaVersion);

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

      o.position.set(...bone.position);
      o.quaternion.set(...bone.quaternion);
    });

    if (result.restorePosition) {
      avatar.positionBone.position.fromArray(pose.rootPosition.position);
      avatar.positionBone.quaternion.fromArray(pose.rootPosition.quaternion);
    }
  });

  const handleClickLoadBlendShapes = useFunc(async (params: ItemParams) => {
    const avatar = stage?.activeAvatar?.avatar;

    const poseId = params.props.poseId;
    let pose = poses.find((p) => p.uid === poseId);

    if (!stage || !avatar?.vrm || !pose) return;
    pose = migrateVRM0PoseToV1(pose, avatar.vrm.meta.metaVersion);

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
    const pose = migrateVRM0PoseToV1(
      poses.find((p) => p.uid === poseId),
      '1'
    );
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
              return migrateVRM0PoseToV1(pose, '1');
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

  const handleClickOverwritePoseMenu = useEvent((params: ItemParams) => {
    if (!stage?.activeAvatar) return;

    const originalPoseId = params.props.poseId;

    const original = poses.find((p) => p.uid === originalPoseId);
    const currentPose = serializeCurrentPose.current();
    if (!original || !currentPose) return;

    executeOperation(
      editorOps.savePose,
      { ...currentPose, name: original.name, uid: originalPoseId },
      { overwrite: true }
    );

    setState((next) => {
      next.loadedPoses[stage.activeAvatar.uid] = {
        poseId: originalPoseId,
        poseName: original.name,
      };
    });
  });

  const handleClickLoadCamera = useFunc((params: ItemParams) => {
    const poseId = params.props.poseId;
    const pose = migrateVRM0PoseToV1(
      poses.find((p) => p.uid === poseId),
      '1'
    );

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
  const handleChangeSizeWidth = useEvent(
    ({ currentTarget }: ChangeEvent<HTMLInputElement>) => {
      const num = Number.isNaN(currentTarget.valueAsNumber)
        ? 1
        : currentTarget.valueAsNumber;

      stage?.setSize(num, stage.getSize().height);
      rerender();
    }
  );

  const handleChangeSizeHeight = useEvent(
    ({ currentTarget }: ChangeEvent<HTMLInputElement>) => {
      const num = Number.isNaN(currentTarget.valueAsNumber)
        ? 1
        : currentTarget.valueAsNumber;
      stage?.setSize(stage.getSize().width, num);
      rerender();
    }
  );

  const handleClickSwapSize = useEvent(() => {
    const size = stage?.getSize();
    if (!size) return;

    stage?.setSize(size.height, size.width);
  });

  const handleClickSizeToScreen = useEvent(() => {
    stage?.setSize(window.innerWidth, window.innerHeight);
  });

  const handleStagedModelsContextMenu = useEvent(
    (e: MouseEvent<HTMLElement>) => {
      const avatarUid = e.currentTarget.dataset.avatarUid!;
      showContextMenu(e, { id: 'stagedModelMenu', props: { avatarUid } });
    }
  );

  const handleClickReplaceModel = useEvent(
    async (params: ItemParams<{ avatarUid: string }>) => {
      if (!stage) return;

      const prevAvatarUid = params.props!.avatarUid;
      const pose = serializeAvatarPose.current(prevAvatarUid);

      if (!pose) return;

      const result = await openModal(SelectModel, {
        clickBackdropToClose: true,
      });
      if (!result) return;

      executeOperation(editorOps.addVrm, result.file);

      const url = URL.createObjectURL(result.file);
      const avatar = await stage.loadVRM(url);
      URL.revokeObjectURL(url);

      stage.setActiveAvatar(avatar.uid);

      applyPoseToActiveAvatar.current(
        migrateVRM0PoseToV1(pose, avatar.vrm.meta.metaVersion),
        {
          camera: false,
          nonStandardBones: true,
          extraBlendShapes: true,
          presetExpressions: true,
        }
      );

      stage.removeAvatar(prevAvatarUid);

      setState((next) => {
        next.loadedPoses[avatar.uid] = {
          poseId: next.loadedPoses[prevAvatarUid]?.poseId ?? null,
          poseName: next.loadedPoses[prevAvatarUid]?.poseName ?? '',
        };

        delete next.loadedPoses[prevAvatarUid];
      });
    }
  );

  const handleClickRemoveStagedModel = useEvent(
    async (params: ItemParams<{ avatarUid: string }>) => {
      const uid = params.props!.avatarUid;

      const result = await openModal(ConfirmModal, {
        message: <Trans i18nKey="stagedModelMenu/removeAvatarConfirm" />,
        primaryButtonKind: 'danger',
        okText: t('stagedModelMenu/removeAvatarConfirm/continue'),
      });

      if (result !== true) return;

      stage?.removeAvatar(uid);
    }
  );

  const handleClickResetCurrentBone = useEvent(() => {
    const avatar = stage?.activeAvatar?.avatar;
    if (!avatar) return;

    const name = avatar.ui.activeBoneName;
    if (!name) return;

    const obj = avatar.vrm.scene.getObjectByName(name);
    const init = avatar.getInitialBoneState(name);

    obj?.position.fromArray(init!.position);
    obj?.quaternion.fromArray(init!.quaternion);
    obj?.scale.fromArray([1, 1, 1]);
  });

  const handleModelsContextMenu = useFunc((e: MouseEvent<HTMLLIElement>) => {
    const modelId = e.currentTarget.dataset.modelId!;
    showContextMenu(e, { id: 'modelmenu', props: { modelId } });
  });

  const handleClickStagedModel = useEvent(
    ({ currentTarget }: MouseEvent<HTMLLIElement>) => {
      stage?.setActiveAvatar(currentTarget.dataset.avatarUid!);
    }
  );

  const handleClickStagedModelToggleVisible = useEvent(
    ({ currentTarget }: MouseEvent<SVGElement>) => {
      const uid = currentTarget.dataset.avatarUid!;
      const entry = stage?.avatarsIterator.find((m) => m.uid === uid);
      if (!stage || !entry) return;

      entry.avatar.visible = !entry.avatar.visible;
    }
  );

  const handleClickStagedModelLicense = useEvent(
    ({ currentTarget }: MouseEvent<SVGElement>) => {
      const uid = currentTarget.dataset.avatarUid!;
      const entry = stage?.avatarsIterator.find((m) => m.uid === uid);
      if (!stage || !entry) return;

      openModal(VRMLicense, { meta: entry.avatar.vrm?.meta });
    }
  );

  const handleClickSelectVRM = useEvent(async () => {
    const files = await selectFile({ extensions: ['.vrm'], multiple: true });

    if (files.length === 0) return;

    for (const file of files) {
      const url = URL.createObjectURL(file);

      executeOperation(editorOps.addVrm, file);
      await stage!.loadVRM(url);

      URL.revokeObjectURL(url);
    }
  });

  const handleDblClickModel = useFunc((e: MouseEvent<HTMLElement>) => {
    handleClickLoadModel({
      event: e,
      triggerEvent: e.nativeEvent,
      props: { modelId: e.currentTarget.dataset.modelId! },
    });
  });

  const captureAndSave = useStableLatestRef(
    async (
      type: 'png' | 'jpeg',
      filenameWithoutExt: string,
      save: boolean = true
    ) => {
      if (!stage) return;

      const blob = await captureStage.current(type);
      const filename = `${filenameWithoutExt}.${type}`;

      if (!blob) return;

      if (save) {
        const url = URL.createObjectURL(blob);
        letDownload(url, filename);
      }

      return blob;
    }
  );

  const captureStage = useStableLatestRef(async (type: 'png' | 'jpeg') => {
    if (!stage) return;

    const prevBgColor = stage.backgroundColor;

    stage!.setShowBones(false);
    console.log(prevBgColor);
    stage.setBackgroundColor({ ...prevBgColor, a: type === 'png' ? 0 : 1 });

    await new Promise((r) => setTimeout(r, 100));

    console.time('capture');

    const mime = type === 'png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob>((resolve) => {
      stage.canvas.toBlob((blob) => resolve(blob!), mime, 100);
    });

    console.timeEnd('capture');

    stage.setBackgroundColor(prevBgColor);
    stage.setShowBones(photoModeState.visibleBones);
    return blob;
  });

  const handleClickCapture = useEvent(async (e: MouseEvent) => {
    if (!stage) return;

    stage!.setShowBones(false);

    console.time('capture');

    const currentCam: StashedCam = {
      mode: stage.camMode,
      fov: stage.camFov,
      zoom: stage.camZoom,
      target: stage.orbitControls.target.toArray(),
      position: stage.activeCamera.position.toArray(),
      quaternion: stage.activeCamera.quaternion.toArray() as Vector4Tuple,
    };

    if (state.captureCam && state.currentCamKind !== 'capture') {
      stage?.setCamMode(state.captureCam.mode, {
        ...state.captureCam,
      });
    }

    const poseName =
      state.loadedPoses[stage.activeAvatar?.uid ?? '']?.poseName ?? 'Untitled';
    await captureAndSave.current(e.shiftKey ? 'jpeg' : 'png', poseName);

    const cam =
      state.currentCamKind === 'capture'
        ? state.captureCam
        : state.editorialCam;

    if (cam && state.currentCamKind !== 'capture') {
      stage?.setCamMode(currentCam.mode, currentCam);
    }

    stage!.setShowBones(photoModeState.visibleBones);
  });

  const handleClickLoadModel = useFunc(
    (params: ItemParams<{ modelId: string }>) => {
      const modelId = params.props!.modelId;

      executeOperation(editorOps.loadVrmBin, modelId, (blob) => {
        const url = URL.createObjectURL(blob);

        stage?.loadVRM(url).then((avatar) => {
          stage.setActiveAvatar(avatar.uid);

          setState((next) => {
            next.loadedPoses[avatar.uid] = {
              poseId: null,
              poseName: '',
            };
          });
        });
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

      const current: StashedCam = {
        mode: stage.camMode,
        fov: stage.camFov,
        zoom: stage.camZoom,
        target: stage.orbitControls.target.toArray(),
        position: stage.activeCamera.position.toArray(),
        quaternion: stage.activeCamera.quaternion.toArray() as Vector4Tuple,
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

  const syncCamFromStage = useStableLatestRef(() => {
    if (!stage) return;

    const current: StashedCam = {
      mode: stage.camMode,
      fov: stage.camFov,
      zoom: stage.camZoom,
      target: stage.orbitControls.target.toArray(),
      position: stage.activeCamera.position.toArray(),
      quaternion: stage.activeCamera.quaternion.toArray() as Vector4Tuple,
    };

    if (state.currentCamKind === 'capture') {
      setState({ captureCam: current });

      return {
        captureCam: current,
        editorialCam: state.editorialCam,
      };
    } else if (state.currentCamKind === 'editorial') {
      setState({ editorialCam: current });

      return {
        captureCam: state.captureCam,
        editorialCam: current,
      };
    }
  });

  const handleClickApplyEditorialToCapture = useEvent(() => {
    if (!stage) return;

    const source = syncCamFromStage.current()?.editorialCam;
    if (!source) return;

    if (state.currentCamKind === 'capture')
      stage.setCamMode(stage.camMode, source);
    setState({ captureCam: source });
  });

  const handleClickApplyCaptureToEditorial = useEvent(() => {
    if (!stage) return;

    const source = syncCamFromStage.current()?.captureCam;
    if (!source) return;

    if (state.currentCamKind === 'editorial')
      stage.setCamMode(stage.camMode, source);

    setState({ editorialCam: source });
  });

  const handleFocusFacialPreset = useEvent(() => {
    if (document.activeElement?.matches('input, textarea')) return;
    document.querySelector('#facialFilter')?.focus();
  });

  const handleKeyDownFacialFilter = useEvent(
    ({ key, currentTarget }: KeyboardEvent<HTMLInputElement>) => {
      if (key === 'Escape') {
        if (currentTarget.value === '') {
          currentTarget.blur();
        }

        currentTarget.value = '';
        setFacialFilter(null);
      }
    }
  );

  const handleChangeFacialFilter = useEvent(
    ({ currentTarget }: ChangeEvent<HTMLInputElement>) => {
      setFacialFilter(new RegExp(escapeStringRegexp(currentTarget.value), 'i'));
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

  const handleClickToggleMirror = useEvent(() => {
    const avatar = stage?.activeAvatar;
    if (!avatar) return;

    avatar.ui.mirrorBone = !avatar.ui.mirrorBone;
    rerender();
  });

  const bindLongPress = useLongPress(
    ({ nativeEvent: e }) => {
      e.preventDefault();

      const openContextMenu = () => {
        e.target?.dispatchEvent(
          new MouseEvent('contextmenu', {
            bubbles: true,
            clientX: e instanceof MouseEvent ? e.clientX : e.touches[0].clientX,
            clientY: e instanceof MouseEvent ? e.clientY : e.touches[0].clientY,
            screenX: e instanceof MouseEvent ? e.screenX : e.touches[0].screenX,
            screenY: e instanceof MouseEvent ? e.screenY : e.touches[0].screenY,
            buttons: 0,
          })
        );
      };

      openContextMenu();

      const abort = new AbortController();
      document.addEventListener(
        'mouseup',
        () => {
          openContextMenu();
          abort.abort();
        },
        { signal: abort.signal }
      );
      document.addEventListener(
        'touchend',
        () => {
          openContextMenu();
          abort.abort();
        },
        { signal: abort.signal }
      );
    },
    {
      cancelOnMovement: true,
    }
  );

  const isMatchToFacialFilter = (name: string, displayName: string = '') => {
    return (
      facialFilter?.test(name) !== false ||
      facialFilter?.test(displayName) !== false
    );
  };

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

  useBindMousetrap(shortcutBindElRef, 't', () => {
    if (mode !== EditorMode.photo) return;

    // const current = stage!.boneControlMode;

    stage!.boneControlMode = 'scale';
  });

  useBindMousetrap(shortcutBindElRef, rightHandShortcuts.toggleMirror, () => {
    const avatar = stage?.activeAvatar;
    if (!avatar) return;
    avatar.ui.mirrorBone = !avatar.ui.mirrorBone;
    rerender();
  });

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
    stage?.activeTarget?.control?.setAxis('X');
  });

  useBindMousetrap(shortcutBindElRef, rightHandShortcuts.axisY, (e) => {
    stage?.activeTarget?.control?.setAxis('Y');
  });

  useBindMousetrap(shortcutBindElRef, rightHandShortcuts.axisZ, (e) => {
    stage?.activeTarget?.control?.setAxis('Z');
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

  useBindMousetrap(
    shortcutBindElRef,
    rightHandShortcuts.resetCurrentBone,
    () => {
      const avatar = stage?.activeAvatar?.avatar;
      const bone = avatar?.ui.activeBone;
      if (!avatar || !bone) return;

      const initial = avatar.getInitialBoneState(bone.name);
      if (!initial) return;

      bone.position.fromArray(initial.position);
      bone.quaternion.fromArray(initial.quaternion);
    }
  );

  useBindMousetrap(
    shortcutBindElRef,
    rightHandShortcuts.changeToPoseTab,
    () => {
      setRightTab('poses');
    }
  );

  useBindMousetrap(
    shortcutBindElRef,
    rightHandShortcuts.changeToFacialTab,
    () => {
      setRightTab('expr');
    }
  );

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
    let prevWindowSize = [window.innerWidth, window.innerHeight];

    const onResize = () => {
      if (!stage) return;

      const size = stage.getSize();
      const windowSize = [window.innerWidth, window.innerHeight];

      if (
        size.width === prevWindowSize[0] &&
        size.height === prevWindowSize[1]
      ) {
        stage.setSize(windowSize[0], windowSize[1]);
      }

      prevWindowSize = windowSize;
    };

    window.addEventListener('resize', onResize);

    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const cancelContextMenu = (e: Event) => e.preventDefault();

    window.addEventListener('click', hideAll);
    window.addEventListener('contextmenu', cancelContextMenu);

    return () => {
      window.removeEventListener('click', hideAll);
      window.removeEventListener('contextmenu', cancelContextMenu);
    };
  }, []);

  // on mode changed
  useEffect(() => {
    if (!stage) return;

    stage.setShowBones(photoModeState.visibleBones);
    stage.enablePhys = false;
  }, [stage]);

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
      ?.rotation.set(
        ...(vrm.meta.metaVersion === '0'
          ? ([rateY, rateX, 0] as const)
          : ([
              MathUtils.mapLinear(rateY, -0.3, 0.3, 0.2, -0.2),
              MathUtils.mapLinear(rateX, -0.3, 0.3, -0.8, 0),
              0,
            ] as const))
      );

    if (state.syncEyes) {
      vrm.humanoid
        ?.getRawBoneNode(VRMHumanBoneName.LeftEye)
        ?.rotation.set(
          ...(vrm.meta.metaVersion === '0'
            ? ([rateY, rateX, 0] as const)
            : ([
                MathUtils.mapLinear(rateY, -0.3, 0.3, 0.2, -0.2),
                MathUtils.mapLinear(rateX, -0.3, 0.3, 0, 1),
                0,
              ] as const))
        );
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
      ?.rotation.set(
        ...(vrm.meta.metaVersion === '0'
          ? ([rateY, rateX, 0] as const)
          : ([
              MathUtils.mapLinear(rateY, -0.3, 0.3, 0.2, -0.2),
              MathUtils.mapLinear(rateX, -0.3, 0.3, 0, 1),
              0,
            ] as const))
      );

    if (state.syncEyes) {
      vrm.humanoid
        ?.getRawBoneNode(VRMHumanBoneName.RightEye)
        ?.rotation.set(
          ...(vrm.meta.metaVersion === '0'
            ? ([rateY, rateX, 0] as const)
            : ([
                MathUtils.mapLinear(rateY, -0.3, 0.3, 0.2, -0.2),
                MathUtils.mapLinear(rateX, -0.3, 0.3, -0.8, 0),
                0,
              ] as const))
        );
    }
  }, [state.syncEyes, padRMouse.clientX, padRMouse.clientY, padRMouse.isDown]);

  useEffect(() => {
    if (!stage?.canvas) return;

    const abort = new AbortController();

    stage.canvas.addEventListener(
      'contextmenu',
      (e) => {
        if (!stage?.activeAvatar?.ui?.activeBoneName) return;

        e.preventDefault();

        showContextMenu(e, {
          id: 'sceneMenu',
          props: {},
        });
      },
      { signal: abort.signal }
    );

    return () => {
      abort.abort();
    };
  }, [stage?.canvas]);

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
      {...bindLongPress()}
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
                  vertical-align: bottom;
                `}
              >
                {activeAvatar?.ui.activeBoneName ?? t('noBoneSelected')}

                <RiSplitCellsHorizontal
                  css={css`
                    margin-left: 2px;
                    vertical-align: bottom;
                  `}
                  fill="#000)"
                  size={16}
                  opacity={activeAvatar?.ui.mirrorBone ? 1 : 0.3}
                  onClick={handleClickToggleMirror}
                />
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

              <div
                css={css`
                  display: flex;
                  flex-flow: column;
                  align-items: center;
                  justify-content: center;
                  color: #34c0b9;
                  font-weight: bold;
                  line-height: 0;
                `}
              >
                <RiArrowRightLine
                  css={css`
                    border-radius: 100px;
                    cursor: pointer;
                    background-color: #fff;
                    ${transitionCss}

                    &:hover {
                      color: #fff;
                      background-color: #34c0b9;
                    }
                  `}
                  size={16}
                  onClick={handleClickApplyEditorialToCapture}
                />
                <RiArrowLeftLine
                  css={css`
                    border-radius: 100px;
                    cursor: pointer;
                    background-color: #fff;
                    ${transitionCss}

                    &:hover {
                      color: #fff;
                      background-color: #34c0b9;
                    }
                  `}
                  onClick={handleClickApplyCaptureToEditorial}
                />
              </div>

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
                  background-color: #fff;
                  border-radius: 4px;
                  overflow: hidden;
                  box-shadow: 0 4px 12px ${rgba('#000', 0.2)};
                  cursor: default;
                `}
                style={{ display: state.showColorPane ? 'block' : 'none' }}
              >
                <div
                  css={css`
                    display: flex;
                    gap: 4px;
                    padding: 4px;
                  `}
                >
                  <div
                    css={css`
                      width: 24px;
                      height: 24px;
                      border-radius: 4px;
                      cursor: pointer;
                      background-image: linear-gradient(
                          45deg,
                          rgba(100, 100, 100, 0.4) 25%,
                          transparent 25%,
                          transparent 75%,
                          rgba(100, 100, 100, 0.4) 75%
                        ),
                        linear-gradient(
                          45deg,
                          rgba(100, 100, 100, 0.4) 25%,
                          transparent 25%,
                          transparent 75%,
                          rgba(100, 100, 100, 0.4) 75%
                        );
                      /* background-color: transparent; */
                      background-size: ${12}px ${12}px;
                      background-position: 0 0, ${12 / 2}px ${12 / 2}px;
                    `}
                    onClick={handleClickBGTransparent}
                  />
                  <div
                    css={css`
                      width: 24px;
                      height: 24px;
                      background-color: #00f;
                      border-radius: 4px;
                      cursor: pointer;
                    `}
                    onClick={handleClickBGBlue}
                  />
                  <div
                    css={css`
                      width: 24px;
                      height: 24px;
                      background-color: #0f0;
                      border-radius: 4px;
                      cursor: pointer;
                    `}
                    onClick={handleClickBGGreen}
                  />
                </div>
                <ChromePicker
                  disableAlpha={false}
                  color={{
                    r: stage?.backgroundColor.r ?? 0,
                    g: stage?.backgroundColor.g ?? 0,
                    b: stage?.backgroundColor.b ?? 0,
                    a: stage?.backgroundColor.a ?? 0,
                  }}
                  onChange={handleChangeBgColor}
                  onChangeComplete={handleChangeBgColorComplete}
                />
              </div>
            </MenuItem>

            <MenuItem
              onClick={(e) => {
                if (
                  e.target instanceof HTMLInputElement ||
                  document.activeElement?.matches('input')
                )
                  return;
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
                  <span>{t('camMode/fov')}</span>
                  <Input
                    css={`
                      flex: 1;
                      margin-left: 4px;
                    `}
                    type="number"
                    sizing="min"
                    value={stage.camFov}
                    onChange={({ currentTarget }) => {
                      stage.camFov = currentTarget.valueAsNumber;
                      stage.pCam.updateProjectionMatrix();
                    }}
                  />
                </div>
              )}

              {stage && (
                <div
                  css={`
                    display: flex;
                    align-items: center;
                  `}
                >
                  <span>{t('camMode/zoom')}</span>
                  <Input
                    css={`
                      flex: 1;
                      margin-left: 4px;
                    `}
                    type="number"
                    sizing="min"
                    min={1}
                    step={0.1}
                    value={stage?.camZoom}
                    onChange={({ currentTarget }) => {
                      stage.camZoom = currentTarget.valueAsNumber;
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
              <InputSection
                title={
                  <>
                    {t('resolutionPx')}
                    <RiArrowLeftRightFill
                      css={css`
                        margin-left: auto;
                        vertical-align: bottom;
                        cursor: pointer;
                      `}
                      onClick={handleClickSwapSize}
                    />
                  </>
                }
              >
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
                    value={stage?.getSize().width ?? 1}
                    onChange={handleChangeSizeWidth}
                  />
                  <span>×</span>
                  <Input
                    css={`
                      display: block;
                    `}
                    type="number"
                    value={stage?.getSize().height ?? 1}
                    onChange={handleChangeSizeHeight}
                  />
                </div>
                <Button
                  css={`
                    margin-top: 8px;
                  `}
                  size="min"
                  onClick={handleClickSizeToScreen}
                >
                  {t('resolution/resetToScreenSize')}
                </Button>
              </InputSection>

              <InputSectionDiv title={t('onStageModels')}>
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
                      data-avatar-uid={uid}
                      active={stage.activeAvatar?.uid === uid}
                      onClick={handleClickStagedModel}
                      onContextMenu={handleStagedModelsContextMenu}
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
                          gap: 4px;
                        `}
                      >
                        {avatar.visible ? (
                          <RiEyeFill
                            fontSize={16}
                            onClick={handleClickStagedModelToggleVisible}
                            data-avatar-uid={uid}
                          />
                        ) : (
                          <RiEyeCloseFill
                            fontSize={16}
                            onClick={handleClickStagedModelToggleVisible}
                            data-avatar-uid={uid}
                          />
                        )}
                        <RiInformationLine
                          fontSize={16}
                          onClick={handleClickStagedModelLicense}
                          data-avatar-uid={uid}
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
                    <div
                      css={css`
                        margin-bottom: 8px;
                      `}
                    >
                      {t('dropVRM')}
                    </div>

                    <Button size="min" onClick={handleClickSelectVRM}>
                      {t('dropVRM/button')}
                    </Button>
                  </ListItem>
                </List>
              </InputSectionDiv>

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
                onFocus={handleFocusFacialPreset}
                tabIndex={-1}
              >
                <Input
                  id="facialFilter"
                  css={css`
                    position: sticky;
                    top: 0;
                    margin-bottom: 8px;
                  `}
                  sizing="min"
                  placeholder={t('facial/filter')}
                  onKeyDown={handleKeyDownFacialFilter}
                  onChange={handleChangeFacialFilter}
                />

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
                  ).map(
                    (name) =>
                      isMatchToFacialFilter(
                        name,
                        t(`vrm/exprPreset/${name}`, null, {
                          fallback: name,
                        })
                      ) && (
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
                            activeAvatar?.vrm.expressionManager?.getValue(
                              name
                            ) ?? 0
                          }
                          onChange={(v) =>
                            activeAvatar?.vrm.expressionManager?.setValue(
                              name,
                              v
                            )
                          }
                        />
                      )
                  )}
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
                      ([name, proxy]) =>
                        isMatchToFacialFilter(
                          name,
                          replaceVRoidShapeNamePrefix(name)
                        ) && (
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
                    active={
                      state.loadedPoses[activeAvatar?.uid ?? '']?.poseId ===
                      pose.uid
                    }
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
                  value={state.loadedPoses[activeAvatar?.uid ?? '']?.poseName}
                  onChange={handleChangePoseName}
                />

                <Button type="button" onClick={handleClickSavePose}>
                  {t('pose/savePose')}
                </Button>

                <Button
                  type="button"
                  kind="primary"
                  disabled={!state.loadedPoses[activeAvatar?.uid ?? '']?.poseId}
                  onClick={handleClickOverwritePose}
                >
                  {t('pose/overwrite')}
                  {state.loadedPoses[activeAvatar?.uid ?? '']?.poseId && (
                    <span
                      css={css`
                        width: 100%;
                        display: block;
                        font-size: 8px;
                      `}
                    >
                      (
                      {
                        poses.find(
                          (p) =>
                            p.uid ===
                            state.loadedPoses[activeAvatar?.uid ?? '']?.poseId
                        )?.name
                      }
                      )
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
        <ContextItem onClick={handleClickLoadBlendShapes}>
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

        <ContextItem onClick={handleClickOverwritePoseMenu}>
          {t('posemenu/overwriteToThis')}
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

      <ContextMenu
        css={`
          padding: 4px;
          font-size: 12px;
        `}
        id="stagedModelMenu"
        animation={false}
      >
        <ContextItem onClick={handleClickReplaceModel}>
          {t('stagedModelMenu/replaceModel')}
        </ContextItem>
        <ContextItem onClick={handleClickRemoveStagedModel}>
          {t('stagedModelMenu/removeStagedModel')}
        </ContextItem>
      </ContextMenu>

      <ContextMenu
        css={`
          padding: 4px;
          font-size: 12px;
        `}
        id="sceneMenu"
        animation={false}
      >
        <ContextItem onClick={handleClickResetCurrentBone}>
          ボーンをリセット
        </ContextItem>
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
