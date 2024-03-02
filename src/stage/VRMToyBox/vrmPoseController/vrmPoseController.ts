import * as THREE from 'three';
import { VRM, VRMHumanBoneName, VRMPose } from '@pixiv/three-vrm';
import { TransformControls } from './TransformControls';
import { VrmIK } from '../vrmIk';
import { createSkeltonHelper } from './vrmSkeltonHelper';
import { createPosGroupHelper } from './vrmSkeltonHelper/posGroupHelper';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { InteractableObject } from './interactableObject';
import { createVrmIkHelper } from './vrmIkHelper/vrmIkHelper';
import { Object3D, Vector3 } from 'three';
import { v1IKConfig } from '../vrmIk/v1IkConfig';
// import { TransformControls } from "three/examples/jsm/controls/TransformControls";
import mitt from 'mitt';
import { createTransformController } from './utils';

type Events = {
  boneChanged: { bone: THREE.Bone | THREE.Object3D | null };
  boneHoverChanged: { bone: THREE.Bone | THREE.Object3D | null };
  dragChange: { dragging: boolean };
};

/**
 * アバターのポーズを編集するためのコントローラ
 */
export class VrmPoseController {
  private _vrmIk: VrmIK;
  private _camera: THREE.Camera;
  private _transformController: TransformControls;
  private _hoveredObject: InteractableObject | null = null;
  private _selectedObject: InteractableObject | null = null;
  private _interactableObjects: InteractableObject[];
  private _needIkSolve = false;
  private disposeSignal: AbortController | null = null;

  #activeBone: Object3D | null = null;
  #enable: boolean = true;
  #visible: boolean = true;
  #mirrored: boolean = false;

  public readonly events = mitt<Events>();

  constructor(
    vrm: VRM,
    positionGroup: THREE.Bone,
    controllerScene: THREE.Scene,
    camera: THREE.Camera,
    private canvas: HTMLCanvasElement,
    orbitControls: OrbitControls,
    onPoseChange?: (vrmPose: VRMPose) => void
  ) {
    if (vrm.meta?.metaVersion === '0') {
      this._vrmIk = new VrmIK(vrm);
    } else {
      this._vrmIk = new VrmIK(vrm, v1IKConfig);
    }

    this._camera = camera;
    this.disposeSignal = new AbortController();

    const skeltonHelper = createSkeltonHelper(vrm);
    const ikHelper = createVrmIkHelper(this._vrmIk);
    const positionGroupHelper = createPosGroupHelper(positionGroup);

    this._interactableObjects = [
      ...skeltonHelper,
      ...ikHelper,
      positionGroupHelper,
    ];

    this._interactableObjects.map((obj) => {
      obj.addEventListener('click', this._handleUiClick);
      obj.addEventListener('hover', this._handleUiHover);
    });

    this._transformController = createTransformController(
      camera,
      canvas,
      controllerScene
    );

    this._transformController.addEventListener('change', (e) => {
      if (!this.activeBone) return;
      if (!this.#mirrored) return;

      const [vrmBoneName, humanBone] =
        Object.entries(vrm.humanoid?.humanBones).find(([name, { node }]) => {
          return node?.uuid === this.activeBone!.uuid;
        }) ?? [];

      if (!vrmBoneName || !humanBone) return;

      if (mirrorBoneMap[vrmBoneName as VRMHumanBoneName]) {
        const mirrorBoneName = mirrorBoneMap[
          vrmBoneName as VRMHumanBoneName
        ] as VRMHumanBoneName;

        const mirrorBone = vrm.humanoid?.getRawBoneNode(mirrorBoneName);

        if (mirrorBone) {
          mirrorBone.rotation.set(
            humanBone.node.rotation.x,
            humanBone.node.rotation.y * -1,
            humanBone.node.rotation.z * -1
          );
          mirrorBone.scale.copy(humanBone.node.scale);
        }
      }
    });

    this._transformController.addEventListener('dragging-changed', (event) => {
      orbitControls.enabled = !event.value;

      this.events.emit('dragChange', { dragging: event.value });

      if (event.target.getMode() === 'translate') {
        this._needIkSolve = !!event.value;
      } else {
        this._needIkSolve = false;
      }

      if (event.value) {
        this._interactableObjects.forEach((obj) => (obj.visible = false));
      } else {
        this._interactableObjects.forEach(
          (obj) => (obj.visible = this.#visible)
        );
      }

      const pose = vrm.humanoid?.getNormalizedPose();
      if (pose && onPoseChange && !event.target.dragging) {
        onPoseChange(pose);
      }
    });

    canvas.addEventListener('mousedown', this._handleMouseDown, {
      signal: this.disposeSignal.signal,
    });
    canvas.addEventListener('dblclick', this._dispatchUnselect, {
      signal: this.disposeSignal.signal,
    });
    canvas.addEventListener('mousemove', this._handleMouseMove, {
      signal: this.disposeSignal.signal,
    });
  }

  public dispose() {
    this.events.all.clear();
    this.disposeSignal?.abort();
  }

  public get activeBone(): Object3D | null {
    return this.#activeBone;
  }

  public set activeBone(bone: Object3D | null) {
    if (!bone?.isBone) {
      this._dispatchUnselect();
      return;
    }

    const interactObj = bone?.children.find(
      (child): child is InteractableObject =>
        child instanceof InteractableObject
    );
    if (!interactObj) return;

    this._selectedObject?.dispatchEvent({ type: 'unselect' });
    interactObj.dispatchEvent({ type: 'select' });

    this._transformController.attach(interactObj.controlTarget);
    this._transformController.setMode(interactObj.tag);
    this.setAxis('all');

    this._selectedObject = interactObj;
    this.#activeBone = interactObj.controlTarget;
    this.events.emit('boneChanged', { bone: interactObj.controlTarget });
  }

  public get activeBoneName(): string | null {
    return this.#activeBone?.name || null;
  }

  public get hoveredBone(): Object3D | null {
    return this._hoveredObject?.controlTarget ?? null;
  }

  public get fkControlMode(): 'rotate' | 'translate' {
    return this._transformController.mode;
  }

  public set fkControlMode(mode: 'rotate' | 'translate') {
    // if (this._selectedObject?.targetType === 'fk')
    this._transformController.setMode(mode);
  }

  public get mirrorBone(): boolean {
    return this.#mirrored;
  }

  public set mirrorBone(mirror: boolean) {
    this.#mirrored = mirror;
  }

  public setAxis(axis: 'X' | 'Y' | 'Z' | 'all') {
    const c = this._transformController;

    const isAllActive = c.showX && c.showY && c.showZ;
    const activateAll =
      axis === 'all' ||
      (!isAllActive &&
        ((c.showX && axis === 'X') ||
          (c.showY && axis === 'Y') ||
          (c.showZ && axis === 'Z')));

    c.showX = axis === 'X' || activateAll;
    c.showY = axis === 'Y' || activateAll;
    c.showZ = axis === 'Z' || activateAll;
  }

  public setEnableControll(enable: boolean) {
    this.#enable = enable;
    this._transformController.enabled = enable;
    this._transformController.visible = enable;
    this._interactableObjects.forEach((obj) => (obj.visible = enable));
  }

  public update = () => {
    if (this._needIkSolve) {
      this._vrmIk.solve(); // IKを解決
    } else {
      // IK操作時以外は手先に追従させる
      this._vrmIk.ikChains.map((chain) => {
        const worldPos = chain.effector.getWorldPosition(new Vector3());
        chain.goal.position.copy(chain.goal.parent!.worldToLocal(worldPos));
      });
    }
  };

  public setVisible = (visible: boolean): void => {
    this.#visible = visible;
    this._interactableObjects.forEach((obj) => {
      obj.visible = visible;
      obj.enabled = visible && this.#enable;
    });

    // コントローラーが無効な状態の時に表示してしまうのを回避する
    const isControllerEnabled = visible && !!this._transformController.object;
    // this._transformController.enabled = isControllerEnabled;
    this._transformController.enabled = this._transformController.visible =
      isControllerEnabled && visible;
  };

  // TODO: 負荷対策を考える
  // flag&update or throttle
  private _handleMouseMove = (event: MouseEvent) => {
    const canvas = event.currentTarget;

    if (!(canvas instanceof HTMLCanvasElement)) {
      return;
    }

    // 左クリックでコントローラ選択 UI表示
    const x = event.clientX - canvas.offsetLeft;
    const y = event.clientY - canvas.offsetTop;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    const mouse = new THREE.Vector2();
    mouse.x = (x / w) * 2 - 1;
    mouse.y = -(y / h) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this._camera);

    const intersects = raycaster.intersectObjects(this._interactableObjects);
    if (intersects.length <= 0) {
      this._dispatchBlur();
      return;
    }

    const interact = intersects[0].object.parent;
    if (interact instanceof InteractableObject) {
      this._dispatchHover(interact);
    }
  };

  private _handleMouseDown = (event: MouseEvent) => {
    // 右クリックで解除
    if (event.button === 2) {
      this._handleRightClick();
    }

    // 左クリックで３DUIを選択
    this._handleLeftClick(event);
  };

  private _handleRightClick = () => {
    this._dispatchUnselect();
  };

  private _handleLeftClick = (event: MouseEvent) => {
    const canvas = event.currentTarget;

    if (!(canvas instanceof HTMLCanvasElement)) {
      return;
    }

    // 左クリックでコントローラ選択 UI表示
    const x = event.clientX - canvas.offsetLeft;
    const y = event.clientY - canvas.offsetTop;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    const mouse = new THREE.Vector2();
    mouse.x = (x / w) * 2 - 1;
    mouse.y = -(y / h) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this._camera);

    // 非表示のオブジェクトは判定から除外する
    const visibleObjects = this._interactableObjects.filter(
      (obj) => obj.visible === true
    );

    const intersects = raycaster.intersectObjects(visibleObjects);

    if (intersects.length > 0) {
      const interact = intersects[0].object.parent;
      if (interact instanceof InteractableObject) {
        interact.dispatchEvent({
          type: 'click',
        });
      }
    }
  };

  private _handleUiClick = (event: THREE.Event): void => {
    const interactObj = event.target;
    if (interactObj instanceof InteractableObject) {
      this._dispatchSelect(interactObj);
    }
  };

  private _handleUiHover = (event: THREE.Event): void => {
    const interactObj = event.target;

    if (interactObj instanceof InteractableObject) {
      this._dispatchBlur();
      this._hoveredObject = interactObj;
    }
  };

  // TODO: rename
  private _dispatchSelect = (interactObj: InteractableObject) => {
    if (this._selectedObject === interactObj) {
      return;
    }

    this._dispatchUnselect();
    // this._selectedObject = interactObj;

    if (interactObj.tag === 'rotate' || interactObj.tag === 'translate') {
      this._transformController.attach(interactObj.controlTarget);
      this._transformController.setMode(interactObj.tag);
      this.setAxis('all');

      this.#activeBone = interactObj.controlTarget;
      this.events.emit('boneChanged', { bone: interactObj.controlTarget });
    }

    this._interactableObjects.forEach((obj) => (obj.enabled = false));
    interactObj.dispatchEvent({ type: 'select' });
  };

  private _dispatchUnselect = () => {
    this._transformController.detach();
    this._selectedObject?.dispatchEvent({ type: 'unselect' });
    this._selectedObject = null;
    this.#activeBone = null;

    this._interactableObjects.forEach((obj) => (obj.enabled = this.#visible));
    this.events.emit('boneChanged', { bone: null });
  };

  private _dispatchHover = (interactObj: InteractableObject) => {
    if (
      this._hoveredObject === interactObj ||
      this._selectedObject === interactObj
    ) {
      return;
    }

    console.log('ok');
    interactObj.dispatchEvent({ type: 'hover' });
    this.events.emit('boneHoverChanged', { bone: interactObj.controlTarget });
  };

  private _dispatchBlur = () => {
    if (this._hoveredObject === this._selectedObject) {
      return;
    }

    const _hoveredObject = this._hoveredObject;

    this._hoveredObject?.dispatchEvent({ type: 'blur' });
    this._hoveredObject = null;

    if (_hoveredObject != null) {
      this.events.emit('boneHoverChanged', { bone: null });
    }
  };
}

const mirrorBoneMap: {
  [k in VRMHumanBoneName]?: VRMHumanBoneName | undefined;
} = {
  [VRMHumanBoneName.LeftUpperArm]: VRMHumanBoneName.RightUpperArm,
  [VRMHumanBoneName.LeftLowerArm]: VRMHumanBoneName.RightLowerArm,
  [VRMHumanBoneName.LeftHand]: VRMHumanBoneName.RightHand,
  [VRMHumanBoneName.LeftThumbMetacarpal]: VRMHumanBoneName.RightThumbMetacarpal,
  [VRMHumanBoneName.LeftThumbDistal]: VRMHumanBoneName.RightThumbDistal,
  [VRMHumanBoneName.LeftThumbProximal]: VRMHumanBoneName.RightThumbProximal,
  [VRMHumanBoneName.LeftIndexDistal]: VRMHumanBoneName.RightIndexDistal,
  [VRMHumanBoneName.LeftIndexIntermediate]:
    VRMHumanBoneName.RightIndexIntermediate,
  [VRMHumanBoneName.LeftIndexProximal]: VRMHumanBoneName.RightIndexProximal,
  [VRMHumanBoneName.LeftMiddleDistal]: VRMHumanBoneName.RightMiddleDistal,
  [VRMHumanBoneName.LeftMiddleIntermediate]:
    VRMHumanBoneName.RightMiddleIntermediate,
  [VRMHumanBoneName.LeftMiddleProximal]: VRMHumanBoneName.RightMiddleProximal,
  [VRMHumanBoneName.LeftRingDistal]: VRMHumanBoneName.RightRingDistal,
  [VRMHumanBoneName.LeftRingIntermediate]:
    VRMHumanBoneName.RightRingIntermediate,
  [VRMHumanBoneName.LeftRingProximal]: VRMHumanBoneName.RightRingProximal,
  [VRMHumanBoneName.LeftLittleDistal]: VRMHumanBoneName.RightLittleDistal,
  [VRMHumanBoneName.LeftLittleIntermediate]:
    VRMHumanBoneName.RightLittleIntermediate,
  [VRMHumanBoneName.LeftLittleProximal]: VRMHumanBoneName.RightLittleProximal,
  [VRMHumanBoneName.LeftUpperLeg]: VRMHumanBoneName.RightUpperLeg,
  [VRMHumanBoneName.LeftLowerLeg]: VRMHumanBoneName.RightLowerLeg,
  [VRMHumanBoneName.LeftFoot]: VRMHumanBoneName.RightFoot,
  [VRMHumanBoneName.LeftToes]: VRMHumanBoneName.RightToes,
  [VRMHumanBoneName.LeftEye]: VRMHumanBoneName.RightEye,
  [VRMHumanBoneName.LeftShoulder]: VRMHumanBoneName.RightShoulder,
  [VRMHumanBoneName.LeftToes]: VRMHumanBoneName.RightToes,
};

Object.entries(mirrorBoneMap).forEach(([left, right]) => {
  mirrorBoneMap[right as VRMHumanBoneName] = left as VRMHumanBoneName;
});
