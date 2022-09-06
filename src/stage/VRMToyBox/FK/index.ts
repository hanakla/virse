import { VRM, VRMSchema } from "@pixiv/three-vrm";
import mitt from "mitt";
import * as THREE from "three";
import { Bone, Mesh, MeshBasicMaterial } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";
import { mergeBufferGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";

const defaultColor = 0x5e31c3;
const activeColor = 0x8c58ff;
// const activeEmissive = 0xffffff;

export class VRMFKManager {
  #boneUiObjects: Mesh[] = [];
  #vrm: VRM;
  #canvas: HTMLCanvasElement;
  #camera;
  #intersectedBone: Mesh | null = null;
  rotateController: TransformControls = null!;
  #orbitControls: { get current(): OrbitControls };

  #isFocused = false;
  #isMouseMoved = false;
  #enabled = true;

  public currentBone: Bone | null = null;

  public readonly events = mitt<{
    focusChange: boolean;
    boneChange: Bone | null;
  }>();

  constructor(
    vrm,
    canvas,
    camera,
    orbitControls: { get current(): OrbitControls }
  ) {
    this.#vrm = vrm;
    this.#canvas = canvas;
    this.#camera = camera;
    this.#orbitControls = orbitControls;
    this.#createBoneHelper(vrm);
    this.#createRotateController();
    this.#registerUiEvent();
  }

  public get enabled() {
    return this.#enabled;
  }

  public set enabled(v: boolean) {
    this.#enabled = v;
    this.#boneUiObjects.map((o) => {
      o.visible = v;
    });
  }

  public set displayBones(v: boolean) {
    this.#boneUiObjects.map((o) => {
      o.visible = v;
    });
  }

  // ボーンを表現するUIのジオメトリを作成
  #createBoneGeometry = () => {
    const topH = 0.8;
    const bottomH = 1 - topH;
    const w = 0.08;
    const segument = 3;
    // 先端方向
    const top = new THREE.ConeGeometry(w, topH, segument, 1, true);
    top.rotateX(Math.PI / 2);
    top.rotateZ(Math.PI);
    top.translate(0, 0, topH / 2 + bottomH);

    // 根本方向
    const bottom = new THREE.ConeGeometry(w, bottomH, segument, 1, true);
    bottom.rotateX(-Math.PI / 2);
    bottom.translate(0, 0, bottomH / 2);

    // ジオメトリの結合
    const geometry = mergeBufferGeometries([top, bottom]);

    return geometry;
  };

  // 全身のボーンを可視化するUI
  #createBoneHelper = (vrm) => {
    const geometry = this.#createBoneGeometry();
    const bones: Bone[] = [];
    this.#vrm.scene.traverse((object) => {
      if (!object.isBone) return;
      bones.push(object);
    });

    // console.log(bones);

    // Object.values(VRMSchema.HumanoidBoneName).forEach((boneName) => {
    //   const material = new THREE.MeshBasicMaterial({
    //     color: defaultColor,
    //     depthTest: false,
    //     depthWrite: false,
    //     transparent: true,
    //     opacity: 0.5,
    //   });
    //   // material.emissive.setHex(defaultEmissive);

    //   // Root-> hipsはスキップする
    //   if (boneName == "hips") return;

    //   // 接続先関節
    //   const childNode = vrm.humanoid.getBoneNode(boneName);
    //   if (!childNode) return;
    //   const chiledWorldPos = childNode.getWorldPosition(new THREE.Vector3());

    //   // 親関節（対象とする関節）
    //   const parentNode = childNode.parent;
    //   if (!parentNode) return;
    //   const parentWorldPos = parentNode.getWorldPosition(new THREE.Vector3());

    //   // ボーン状のギズモのメッシュ
    //   const boneUI = new THREE.Mesh(geometry, material);

    //   // 関節位置に移動
    //   boneUI.position.copy(parentWorldPos);

    //   // 接続関節方向を向かせる
    //   boneUI.lookAt(chiledWorldPos);

    //   // 最後にスケールを変更する
    //   const len = chiledWorldPos.sub(parentWorldPos).length();
    //   boneUI.scale.copy(new THREE.Vector3(len, len, len));

    //   parentNode.attach(boneUI);
    //   this.#boneUiObjects.push(boneUI);
    // });

    bones.forEach((bone) => {
      bone.matrixAutoUpdate = true;

      const material = new THREE.MeshBasicMaterial({
        color: defaultColor,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 0.5,
      });

      const childNode = bone;
      if (!childNode) return;
      const chiledWorldPos = childNode.getWorldPosition(new THREE.Vector3());

      const parentNode = bone.parent;
      if (!parentNode) return;
      const parentWorldPos = parentNode.getWorldPosition(new THREE.Vector3());

      const boneUI = new THREE.Mesh(geometry, material);
      boneUI.position.copy(parentWorldPos);
      boneUI.lookAt(chiledWorldPos);

      // 最後にスケールを変更する
      const len = chiledWorldPos.sub(parentWorldPos).length();
      boneUI.scale.copy(new THREE.Vector3(len, len, len));

      parentNode.attach(boneUI);
      this.#boneUiObjects.push(boneUI);
    });
  };

  // 回転用のコントローラー
  #createRotateController = () => {
    this.rotateController = new TransformControls(this.#camera, this.#canvas);
    this.rotateController.setMode("rotate");
    this.rotateController.setSpace("local");
    this.rotateController.setSize(0.5);
    this.#vrm.scene.add(this.rotateController);

    this.rotateController.addEventListener("dragging-changed", (event) => {
      this.#orbitControls.current.enabled = !event.value;

      this.#boneUiObjects.forEach((obj) => {
        obj.visible = !event.value;
      });
    });
  };

  // マウスレイキャスト
  #registerUiEvent = () => {
    this.#canvas.addEventListener("mousedown", this.#handleMouseDown);
    this.#canvas.addEventListener("pointermove", this.#handlePointerMove);
    this.#canvas.addEventListener("pointerup", this.#handlePointerUp);
    this.#canvas.addEventListener("dblclick", this.#unselectBoneUi);
  };

  #handleMouseDown = (event: MouseEvent) => {
    if (!this.#enabled) return;

    // console.log("mousemove");
    const element = event.currentTarget!;
    // canvas要素上のXY座標
    const x = event.clientX - element.offsetLeft;
    const y = event.clientY - element.offsetTop;

    // canvas要素の幅・高さ
    const w = element.offsetWidth;
    const h = element.offsetHeight;

    // -1〜+1の範囲で現在のマウス座標を登録する
    const mouse = new THREE.Vector2();
    mouse.x = (x / w) * 2 - 1;
    mouse.y = -(y / h) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.#camera);

    const intersects = raycaster.intersectObjects(this.#boneUiObjects);

    if (intersects.length > 0 && !this.rotateController.dragging) {
      if (this.#intersectedBone != intersects[0].object) {
        this.#selectBoneUi(intersects[0].object);
      }
    }
  };

  #handlePointerMove = () => {
    this.#isMouseMoved = true;
  };

  #handlePointerUp = () => {
    if (this.#isMouseMoved) {
      this.#isMouseMoved = false;
      return;
    }

    this.#unselectBoneUi();
  };

  #selectBoneUi = (intersect) => {
    if (this.#intersectedBone) {
      (this.#intersectedBone.material as MeshBasicMaterial).color.setHex(
        activeColor
      );
    }

    this.#intersectedBone = intersect;
    (this.#intersectedBone!.material as MeshBasicMaterial).color.setHex(
      activeColor
    );

    // this.#rotateController.setSize(intersect.scale.x * 2);

    window.v$0 = intersect.parent;
    this.currentBone = intersect.parent;
    this.rotateController.attach(intersect.parent);
    this.#isFocused = true;
    this.#boneUiObjects.forEach((o) => (o.visible = false));
    this.events.emit("focusChange", this.#isFocused);
    this.events.emit("boneChange", this.currentBone);
  };

  #unselectBoneUi = () => {
    if (this.#intersectedBone) {
      (this.#intersectedBone.material as MeshBasicMaterial).color.setHex(
        activeColor
      );
      this.#boneUiObjects.forEach((o) => (o.visible = true));
      this.rotateController.detach();

      this.#intersectedBone = null;
      this.#isFocused = false;
      this.events.emit("focusChange", this.#isFocused);
      this.events.emit("boneChange", null);
    }
  };

  unselect = () => {
    this.#unselectBoneUi();
  };

  public selectBone(bone: Bone) {
    window.v$0 = bone;
    this.currentBone = bone;
    this.rotateController.attach(bone);
    this.#isFocused = true;
    this.#boneUiObjects.forEach((o) => (o.visible = false));
    this.events.emit("focusChange", this.#isFocused);
    this.events.emit("boneChange", bone);
  }

  public dispose() {
    this.#canvas.removeEventListener("mousedown", this.#handleMouseDown);
    this.#canvas.removeEventListener("dblclick", this.#unselectBoneUi);
    this.#canvas.removeEventListener("contextmenu", this.#unselectBoneUi);
  }
}
