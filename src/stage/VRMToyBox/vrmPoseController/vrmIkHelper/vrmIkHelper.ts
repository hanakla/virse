import {
  effectorGeometry,
  defaultMaterial,
  focusMaterial,
  activeMaterial,
} from './effectorGizmo';
import {InteractableObject} from '../interactableObject';
import {VrmIK} from '../../vrmIk';

/**
 * IK操作用の3DUIを生成する
 * @param vrmIk
 * @returns
 */
export const createVrmIkHelper = (vrmIk: VrmIK): InteractableObject[] => {
  const ikHelper = vrmIk.ikChains.map(ikChain => {
    const ikGoalHelper = createIkGoalHelper(ikChain.goal);
    ikChain.effector.add(ikGoalHelper);
    return ikGoalHelper;
  });

  return ikHelper;
};

const createIkGoalHelper = (ikGoal: THREE.Object3D): InteractableObject => {
  return new InteractableObject(
    ikGoal,
    effectorGeometry,
    defaultMaterial,
    focusMaterial,
    activeMaterial,
    'translate'
  );
};
