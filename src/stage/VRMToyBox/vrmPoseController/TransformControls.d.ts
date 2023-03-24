/*!
 * Copyright © 2010-2022 three.js authors
 *
 * The original source code is distributed under MIT license
 * https://github.com/mrdoob/three.js/blob/master/LICENSE
 */

import {Object3D, Camera, MOUSE, Raycaster} from 'three';

export class TransformControls extends Object3D {
  constructor(object: Camera, domElement?: HTMLElement);

  domElement: HTMLElement;

  // API

  camera: Camera;
  object: Object3D | undefined;
  enabled: boolean;
  axis: 'X' | 'Y' | 'Z' | 'E' | 'XY' | 'YZ' | 'XZ' | 'XYZ' | 'XYZE' | null;
  mode: 'translate' | 'rotate' | 'scale';
  translationSnap: number | null;
  rotationSnap: number | null;
  space: 'world' | 'local';
  size: number;
  dragging: boolean;
  showX: boolean;
  showY: boolean;
  showZ: boolean;
  readonly isTransformControls: true;
  mouseButtons: {
    LEFT: MOUSE;
    MIDDLE: MOUSE;
    RIGHT: MOUSE;
  };

  attach(object: Object3D): this;
  detach(): this;
  getMode(): 'translate' | 'rotate' | 'scale';
  getRaycaster(): Raycaster;
  setMode(mode: 'translate' | 'rotate' | 'scale'): void;
  setTranslationSnap(translationSnap: number | null): void;
  setRotationSnap(rotationSnap: number | null): void;
  setScaleSnap(scaleSnap: number | null): void;
  setSize(size: number): void;
  setSpace(space: 'world' | 'local'): void;
  reset(): void;
  dispose(): void;
}
