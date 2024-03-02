import { klona } from 'klona';
import { UnsavedVirsePose, VirsePose } from './editor';
import { VRMHumanBoneName, VRMPose } from '@pixiv/three-vrm';

const expressionNameMap = {
  A: 'aa',
  I: 'ih',
  U: 'ou',
  E: 'ee',
  O: 'oh',
  Joy: 'happy',
  Angly: 'angry',
  Sorrow: 'sad',
  Fun: 'relaxed',
  Surprised: 'surprised',
};

const blendShapeProxiesMap = {
  Fcl_MTH_A: 'aa',
  Fcl_MTH_I: 'ih',
  Fcl_MTH_U: 'ou',
  Fcl_MTH_E: 'ee',
  Fcl_MTH_O: 'oh',
  Fcl_ALL_Angry: 'angry',
  Fcl_ALL_Fun: 'relaxed',
  Fcl_ALL_Joy: 'happy',
  Fcl_ALL_Neutral: 'neutral',
  Fcl_ALL_Sorrow: 'sad',
  Fcl_ALL_Surprised: 'surprised',
  Fcl_EYE_Close: 'blink',
  Fcl_EYE_Close_R: 'blinkRight',
  Fcl_EYE_Close_Left: 'blinkLeft',
};

export function migrateVRM0PoseToV1<
  T extends VirsePose | UnsavedVirsePose | null | undefined
>(pose: T, targetVrmVersion: '0' | '1') {
  if (!pose) return pose;

  const next = klona(pose);
  console.log('migrating pose', pose);

  Object.entries(expressionNameMap).forEach(([oldKey, newKey]) => {
    next.blendShapeProxies[newKey] ??= pose.blendShapeProxies[oldKey] ?? 0;
    delete next.blendShapeProxies[oldKey];
  });

  // Migrate old morphs to VRM1.0's blendShape proxies
  Object.entries(blendShapeProxiesMap).forEach(([oldMorphKey, newExprKey]) => {
    if (Object.hasOwn(pose.morphs, oldMorphKey)) {
      next.blendShapeProxies[newExprKey] =
        (next.blendShapeProxies[newExprKey] ?? 0) +
        pose.morphs[oldMorphKey].value;
    }

    delete next.morphs[oldMorphKey];
  });

  if (pose.vrmVersion == null || pose.vrmVersion === '0') {
    if (targetVrmVersion === '1') {
      invertRotation(next.vrmPose);
      invertRotation(next.bones);
    }
  } else if (pose.vrmVersion === '1') {
    if (targetVrmVersion === '0') {
      invertRotation(next.vrmPose);
      invertRotation(next.bones);
    }
  }

  if ('schemaVersion' in next) {
    if (next.schemaVersion == null) {
      next.schemaVersion = 1;
      next.camera.position[0] *= -1;
      next.camera.position[2] *= -1;
    }

    if (next.schemaVersion === 2) {
      next.schemaVersion = 3;

      next.rootPosition = {
        position: [0, 0, 0],
        // rotation: [0, 0, 0],
        quaternion: [0, 0, 0, 1],
      };
    }
  }

  return next;
}

// SEE: https://scrapbox.io/ke456memo/VRM%E3%81%AE%E5%90%91%E3%81%8D%E3%81%AE%E8%A9%B1
const invertRotation = (pose: VRMPose) => {
  Object.keys(pose).forEach((key) => {
    const rotation = pose[key as VRMHumanBoneName]!.rotation;
    if (rotation) {
      rotation[0] = -rotation[0];
      rotation[2] = -rotation[2];
    }
  });
};
