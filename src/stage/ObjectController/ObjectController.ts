import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VirseStage } from '../VirseStage';
import * as THREE from 'three';
import mitt from 'mitt';
import { InteractableObject } from '../VRMToyBox/vrmPoseController/interactableObject';
import { createPosGroupHelper } from '../VRMToyBox/vrmPoseController/vrmSkeltonHelper/posGroupHelper';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { createTransformController } from '../VRMToyBox/vrmPoseController/utils';

type Events = {
  selectChange: { selected: boolean };
  dragChange: { dragging: boolean };
};

export class ObjectController {
  #stage: VirseStage;

  #rootScene: THREE.Scene = new THREE.Scene();
  #gltf: THREE.Group;

  #controller: InteractableObject;
  #interactableObjects: InteractableObject[] = [];
  #positionBone: THREE.Bone;

  #disposeSignal: AbortController = new AbortController();
  #transformController: TransformControls;

  #enable: boolean = true;
  #visible: boolean = true;

  private _hoveredObject: InteractableObject | null = null;
  private _selectedObject: InteractableObject | null = null;

  public events = mitt<Events>();
  public gltfBin: Blob | null = null;

  constructor(stage: VirseStage) {
    this.#stage = stage;

    this.#positionBone = new THREE.Bone();
    this.#positionBone.name = 'ROOT_position';

    this.#transformController = createTransformController(
      stage.activeCamera,
      stage.canvas,
      this.#rootScene
    );

    this.#transformController.addEventListener('dragging-changed', (event) => {
      this.events.emit('dragChange', { dragging: event.value });

      if (event.value) {
        this.#interactableObjects.forEach((obj) => (obj.visible = false));
      } else {
        this.#interactableObjects.forEach(
          (obj) => (obj.visible = this.#visible)
        );
      }
    });

    stage.canvas.addEventListener('mousedown', this._handleMouseDown, {
      signal: this.#disposeSignal.signal,
    });
    stage.canvas.addEventListener('dblclick', this._dispatchUnselect, {
      signal: this.#disposeSignal.signal,
    });
    stage.canvas.addEventListener('mousemove', this._handleMouseMove, {
      signal: this.#disposeSignal.signal,
    });
  }

  public get rootScene() {
    return this.#rootScene;
  }

  public get rootBone() {
    return this.#positionBone;
  }

  public get controlMode(): 'rotate' | 'translate' {
    return this.#transformController.mode;
  }

  public set controlMode(mode: 'rotate' | 'translate') {
    this.#transformController.setMode(mode);
  }

  public setVisible(visible: boolean) {
    this.#visible = visible;
    this.#interactableObjects.forEach((obj) => {
      obj.visible = visible;
      obj.enabled = visible && this.#enable;
    });

    // コントローラーが無効な状態の時に表示してしまうのを回避する
    const isControllerEnabled = visible && !!this.#transformController.object;
    this.#transformController.visible = isControllerEnabled && this.#enable;
  }

  public setEnableControll(enable: boolean) {
    this.#enable = enable;
    this.#transformController.enabled = enable;
    this.#transformController.visible = enable;
    this.#interactableObjects.forEach((obj) => (obj.visible = enable));
  }

  public dispose() {
    this.events.all.clear();

    this.#disposeSignal.abort();
    this.#transformController.dispose();
    this.#interactableObjects = [];

    this.#stage.rootScene.remove(this.#rootScene);
  }

  public async loadGltf(url: string) {
    const gltf = new GLTFLoader();

    this.gltfBin = await (await fetch(url)).blob();

    const { scene } = await new Promise<GLTF>((resolve, reject) => {
      gltf.load(url, resolve, undefined, reject);
    });

    this.#gltf = scene;
    this.#positionBone.add(scene);
    this.#rootScene.add(this.#positionBone);
    this.#stage.rootScene.add(this.#rootScene);

    this.#controller = createPosGroupHelper(this.#positionBone);
    this.#interactableObjects.push(this.#controller);

    this.#interactableObjects.map((obj) => {
      obj.addEventListener('click', this._handleUiClick);
      obj.addEventListener('hover', this._handleUiHover);
    });
  }

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
    raycaster.setFromCamera(mouse, this.#stage.activeCamera);

    const intersects = raycaster.intersectObjects(this.#interactableObjects);
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
    raycaster.setFromCamera(mouse, this.#stage.activeCamera);

    // 非表示のオブジェクトは判定から除外する
    const visibleObjects = this.#interactableObjects.filter(
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
      this.events.emit('selectChange', { selected: true });
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
      this.#transformController.attach(interactObj.controlTarget);
      this.#transformController.setMode(interactObj.tag);
      this.setAxis('all');
    }

    this.#interactableObjects.forEach((obj) => (obj.enabled = false));
    interactObj.dispatchEvent({ type: 'select' });
  };

  public setAxis(axis: 'X' | 'Y' | 'Z' | 'all') {
    const c = this.#transformController;

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

  private _dispatchUnselect = () => {
    this.#transformController.detach();
    this._selectedObject?.dispatchEvent({ type: 'unselect' });
    this._selectedObject = null;

    this.#interactableObjects.forEach((obj) => (obj.enabled = this.#visible));
    this.events.emit('selectChange', { selected: false });
  };

  private _dispatchHover = (interactObj: InteractableObject) => {
    if (
      this._hoveredObject === interactObj ||
      this._selectedObject === interactObj
    ) {
      return;
    }

    interactObj.dispatchEvent({ type: 'hover' });
    // this.events.emit('boneHoverChanged', { bone: interactObj.controlTarget });
  };

  private _dispatchBlur = () => {
    if (this._hoveredObject === this._selectedObject) {
      return;
    }

    const _hoveredObject = this._hoveredObject;

    this._hoveredObject?.dispatchEvent({ type: 'blur' });
    this._hoveredObject = null;

    // if (_hoveredObject != null) {
    //   this.events.emit('boneHoverChanged', { bone: null });
    // }
  };
}
