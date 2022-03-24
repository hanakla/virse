import { VRMSchema } from "@pixiv/three-vrm";
import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";
import { mergeBufferGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";

const defaultColor = 0x00ffff;
const defaultEmissive = 0x000aa0;
const activeEmissive = 0xffff00;

export class VRMFKManager {
  #boneUiObjects = [];
  #vrm;
  #canvas;
  #camera;
  #intersectedBone;
  #rotateController;

  constructor(vrm, canvas, camera, private orbitControls) {
    this.#vrm = vrm;
    this.#canvas = canvas;
    this.#camera = camera;
    this.#createBoneHelper(vrm);
    this.#createRotateController();
    this.#registerUiEvent();
  }

  // ボーンを表現するUIのジオメトリを作成
  #createBoneGeometry = () => {
    const topH = 0.8;
    const bottomH = 1 - topH;
    const w = 0.15;
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

    Object.values(VRMSchema.HumanoidBoneName).forEach((boneName) => {
      const material = new THREE.MeshLambertMaterial({
        color: defaultColor,
        depthTest: false,
        depthWrite: false,
        transparent: true,
      });
      material.emissive.setHex(defaultEmissive);

      // Root-> hipsはスキップする
      if (boneName == "hips") return;

      // 接続先関節
      const childNode = vrm.humanoid.getBoneNode(boneName);
      if (!childNode) return;
      const chiledWorldPos = childNode.getWorldPosition(new THREE.Vector3());

      // 親関節（対象とする関節）
      const parentNode = childNode.parent;
      if (!parentNode) return;
      const parentWorldPos = parentNode.getWorldPosition(new THREE.Vector3());

      // ボーン状のギズモのメッシュ
      const boneUI = new THREE.Mesh(geometry, material);

      // 関節位置に移動
      boneUI.position.copy(parentWorldPos);

      // 接続関節方向を向かせる
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
    this.#rotateController = new TransformControls(this.#camera, this.#canvas);
    this.#rotateController.setMode("rotate");
    this.#rotateController.setSpace("local");
    this.#rotateController.setSize(0.5);
    this.#vrm.scene.add(this.#rotateController);

    this.#rotateController.addEventListener("dragging-changed", (event) => {
      this.orbitControls.enabled = !event.value;
    });
  };

  // マウスレイキャスト
  #registerUiEvent = () => {
    this.#canvas.addEventListener("mousedown", this.#handleMouseDown);
    this.#canvas.addEventListener("contextmenu", this.#handleUnselectBone);
  };

  #handleMouseDown = (event) => {
    // console.log("mousemove");
    const element = event.currentTarget;
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
    if (intersects.length > 0) {
      if (this.#intersectedBone != intersects[0].object) {
        this.#handleSelectBoneUi(intersects[0].object);
      }
    }
  };

  #handleSelectBoneUi = (intersect) => {
    if (this.#intersectedBone) {
      this.#intersectedBone.material.emissive.setHex(defaultEmissive);
    }

    this.#intersectedBone = intersect;
    this.#intersectedBone.material.emissive.setHex(activeEmissive);

    // this.#rotateController.setSize(intersect.scale.x * 2);
    this.#rotateController.attach(intersect.parent);
  };

  #handleUnselectBone = () => {
    if (this.#intersectedBone) {
      this.#intersectedBone.material.emissive.setHex(defaultEmissive);
      this.#rotateController.detach();

      this.#intersectedBone = null;
    }
  };

  unselect = () => {
    this.#handleUnselectBone();
  };
}
