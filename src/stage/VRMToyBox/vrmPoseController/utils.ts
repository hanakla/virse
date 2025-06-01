import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

type Pointer = {
  x: number;
  y: number;
  button: number;
};

export class PointerLockTransformControls extends TransformControls {
  #movement: { x: number; y: number } = { x: 0, y: 0 };

  public _onPointerDown: (event: PointerEvent) => void;
  public _onPointerMove: (event: PointerEvent) => void;
  public _getPointer: (event: PointerEvent) => Pointer;

  public set visible(value: boolean) {
    this.getHelper().visible = value;
  }

  public get visible(): boolean {
    return this.getHelper().visible;
  }

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    super(camera, domElement);

    // Override the _getPointer method to account for pointer movement
    this._getPointer = (
      event: PointerEvent,
    ): { x: number; y: number; button: number } => {
      const rect = this.domElement!.getBoundingClientRect();

      const x =
        ((event.clientX + this.#movement.x - rect.left) / rect.width) * 2 - 1;
      const y =
        -((event.clientY + this.#movement.y - rect.top) / rect.height) * 2 + 1;
      const button = event.button;
      return { x, y, button };
    };

    // @ts-ignore
    const originalOnPointerDown = this._onPointerDown;
    this._onPointerDown = (event: PointerEvent) => {
      if (!this.enabled) return;

      this.#movement.x = 0;
      this.#movement.y = 0;
      originalOnPointerDown.call(this, event);
    };

    this._onPointerMove = (event: PointerEvent) => {
      if (!this.enabled) return;

      this.#movement.x += event!.movementX;
      this.#movement.y += event!.movementY;

      const pointer = this._getPointer(event);
      this.pointerMove(pointer);
    };
  }

  // @ts-ignore
  pointerDown(pointer: Pointer): void {
    // @ts-ignore
    super.pointerDown(pointer);
    this.#movement = { x: 0, y: 0 };
  }

  // @ts-ignore
  pointerMove(pointer: Pointer): void {
    if (this.dragging) {
      this.domElement!.requestPointerLock();
    }

    // @ts-ignore
    super.pointerMove(pointer);
  }

  // @ts-ignore
  pointerUp(pointer: Pointer): void {
    // @ts-ignore
    super.pointerUp(pointer);

    document.exitPointerLock();
    this.#movement = { x: 0, y: 0 };
  }
}

export const createTransformController = (
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
  scene: THREE.Scene | THREE.Group,
): PointerLockTransformControls => {
  const controller = new PointerLockTransformControls(camera, canvas);
  controller.setMode('rotate');
  controller.setSpace('local');
  controller.setSize(0.7);

  scene.add(controller.getHelper());
  return controller;
};

export function isEqualToPrecision(
  num1: number,
  num2: number,
  precision: number,
): boolean {
  const factor = Math.pow(10, precision);
  return Math.round(num1 * factor) === Math.round(num2 * factor);
}
