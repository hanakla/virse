import * as THREE from "three";
import { VRM, VRMHumanBoneName } from "@pixiv/three-vrm";
import { ignoreBoneList, needDummyBoneList } from "./skeltonConfig";
import {
  boneGeometry,
  defaultMaterial,
  focusMaterial,
  activeMaterial,
} from "./boneGizmo";
import { InteractableObject } from "../interactableObject";

/**
 * FKの操作用の３DUIを生成する
 */
export const createSkeltonHelper = (vrm: VRM): InteractableObject[] => {
  const boneUIObjects = Array<InteractableObject>();

  const bones: Bone[] = [];
  vrm.scene.traverse((object) => {
    if (!object.isBone) return;
    bones.push(object);
  });

  console.log(bones);

  Object.values(VRMHumanBoneName).forEach((boneName) => {
    if (ignoreBoneList.includes(boneName)) return;

    // TODO: 名前を再考
    const childNode = vrm.humanoid?.getRawBoneNode(boneName);
    if (!childNode) return;
    const childWorldPos = childNode.getWorldPosition(new THREE.Vector3());

    const parentNode = childNode.parent;
    if (!parentNode) return;
    const parentWorldPos = parentNode.getWorldPosition(new THREE.Vector3());

    const boneUI = new InteractableObject(
      parentNode,
      boneGeometry,
      defaultMaterial,
      focusMaterial,
      activeMaterial,
      "rotate"
    );

    // 移動 > 回転 > 拡大縮小 > 追加の順で行う
    boneUI.position.copy(parentWorldPos);
    boneUI.lookAt(childWorldPos);
    const len = new THREE.Vector3()
      .subVectors(childWorldPos, parentWorldPos)
      .length();
    boneUI.scale.copy(new THREE.Vector3(len, len, len));

    parentNode.attach(boneUI);
    boneUIObjects.push(boneUI);

    console.log(parentNode);

    // 指先などの特定の末端ボーンに追加でGizmoを配置する
    if (needDummyBoneList.includes(boneName)) {
      const dummyBone = new InteractableObject(
        childNode,
        boneGeometry,
        defaultMaterial,
        focusMaterial,
        activeMaterial,
        "rotate"
      );
      dummyBone.position.copy(childWorldPos);
      dummyBone.rotation.copy(boneUI.rotation);
      dummyBone.scale.copy(boneUI.scale);
      childNode.attach(dummyBone);
      boneUIObjects.push(dummyBone);
    }
  });

  return boneUIObjects;
};
