import * as THREE from 'three';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { ignoreBoneList, needDummyBoneList } from './skeltonConfig';
import {
  boneGeometry,
  defaultMaterial,
  focusMaterial,
  activeMaterial,
  defaultNonStandardMaterial,
  focusNonStandardMaterial,
} from './boneGizmo';
import { InteractableObject } from '../interactableObject';
import { Bone, Object3D } from 'three';

/**
 * FKの操作用の3DUIを生成する
 */
export const createSkeltonHelper = (vrm: VRM): InteractableObject[] => {
  const boneUIObjects = Array<InteractableObject>();

  const bones: Bone[] = [];
  vrm.scene.traverse((object) => {
    if (!object.isBone) return;
    bones.push(object);
  });

  const standardBoneNodes: Object3D[] = Object.values(VRMHumanBoneName)
    .map((boneName) => {
      return vrm.humanoid?.getRawBoneNode(boneName);
    })
    .filter((node): node is Object3D => node != null);

  const targetBones = bones.map((bone) => {
    const stdBoneNode = standardBoneNodes.find((stdNode) => stdNode === bone);

    return {
      type: stdBoneNode == null ? 'nonStandard' : 'standard',
      boneName: bone.name,
      vrmBoneName: stdBoneNode?.name as VRMHumanBoneName | undefined,
      node: bone,
    };
  });

  // Object.values(VRMHumanBoneName).forEach((boneName) => {
  //   if (ignoreBoneList.includes(boneName)) return;

  targetBones.forEach(({ type, node, boneName, vrmBoneName }) => {
    // TODO: 名前を再考
    // const childNode = vrm.humanoid?.getNormalizedBoneNode(boneName);
    const childNode = node;
    if (!childNode) return;
    const childWorldPos = childNode.getWorldPosition(new THREE.Vector3());

    const parentNode = childNode.parent;
    if (!parentNode) return;
    const parentWorldPos = parentNode.getWorldPosition(new THREE.Vector3());

    const boneUI = new InteractableObject(
      parentNode,
      boneGeometry,
      type === 'standard' ? defaultMaterial : defaultNonStandardMaterial,
      type === 'standard' ? focusMaterial : focusNonStandardMaterial,
      activeMaterial,
      'rotate',
      'fk'
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

    // 指先などの特定の末端ボーンに追加でGizmoを配置する
    // if (needDummyBoneList.includes(vrmBoneName)) {
    if (childNode.children.findIndex((c) => c instanceof Bone) === -1) {
      const dummyBone = new InteractableObject(
        childNode,
        boneGeometry,
        defaultMaterial,
        focusMaterial,
        activeMaterial,
        'rotate',
        'fk'
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
