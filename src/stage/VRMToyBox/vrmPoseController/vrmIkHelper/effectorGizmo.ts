import * as THREE from 'three';

const size = 0.04;
export const effectorGeometry = new THREE.BoxGeometry(size, size, size);
export const defaultMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  depthTest: false,
  depthWrite: false,
  transparent: true,
  opacity: 0.25,
});

export const focusMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  depthTest: false,
  depthWrite: false,
  transparent: true,
  opacity: 1.0,
});

export const activeMaterial = new THREE.MeshBasicMaterial({
  color: 0xffff00,
  depthTest: false,
  depthWrite: false,
  transparent: true,
  opacity: 1,
});
