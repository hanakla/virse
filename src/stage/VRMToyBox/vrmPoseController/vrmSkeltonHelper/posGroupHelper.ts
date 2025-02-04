import { InteractableObject } from '../interactableObject';
import {
  activeMaterial,
  defaultNonStandardMaterial,
  focusNonStandardMaterial,
  sphereGeometry,
} from './boneGizmo';

export function createPoseGroupHelper(group: THREE.Group) {
  const obj = new InteractableObject(
    group,
    sphereGeometry,
    defaultNonStandardMaterial,
    focusNonStandardMaterial,
    activeMaterial,
    'rotate',
    'fk'
  );

  group.attach(obj);

  return obj;
}
