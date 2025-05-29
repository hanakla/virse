import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

export const createTransformController = (
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
  scene: THREE.Scene | THREE.Group
): TransformControls => {
  const controller = new TransformControls(camera, canvas);
  controller.setMode('rotate');
  controller.setSpace('local');
  controller.setSize(0.7);

  scene.add(controller.getHelper());
  return controller;
};

export function isEqualToPrecision(
  num1: number,
  num2: number,
  precision: number
): boolean {
  const factor = Math.pow(10, precision);
  return Math.round(num1 * factor) === Math.round(num2 * factor);
}
