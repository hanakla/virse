import { TransformControls } from './TransformControls';

export const createTransformController = (
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
  scene: THREE.Scene | THREE.Group
): TransformControls => {
  const controller = new TransformControls(camera, canvas);
  controller.setMode('rotate');
  controller.setSpace('world');
  controller.setSize(0.7);

  scene.attach(controller);
  return controller;
};
