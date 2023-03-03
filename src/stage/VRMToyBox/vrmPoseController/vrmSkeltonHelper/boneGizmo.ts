import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

const topH = 0.7;
const bottomH = 0.15; // topH + bottomH < 1.0 を推奨
const radius = 0.1;
const segment = 8;

const top = new THREE.ConeGeometry(radius, topH, segment, 1, true);
top.rotateX(Math.PI / 2);
top.rotateZ(Math.PI);
top.translate(0, 0, topH / 2 + bottomH);

const bottom = new THREE.ConeGeometry(radius, bottomH, segment, 1, true);
bottom.rotateX(-Math.PI / 2);
bottom.translate(0, 0, bottomH / 2);

export const boneGeometry = BufferGeometryUtils.mergeBufferGeometries([
  top,
  bottom,
]);

export const defaultMaterial = new THREE.MeshBasicMaterial({
  color: 0x0080ff,
  depthTest: false,
  depthWrite: false,
  transparent: true,
  opacity: 0.25,
});

export const focusMaterial = new THREE.MeshBasicMaterial({
  color: 0x0080ff,
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

export const defaultNonStandardMaterial = new THREE.MeshBasicMaterial({
  color: 0x8400ff,
  depthTest: false,
  depthWrite: false,
  transparent: true,
  opacity: 0.25,
});

export const focusNonStandardMaterial = new THREE.MeshBasicMaterial({
  color: 0x8400ff,
  depthTest: false,
  depthWrite: false,
  transparent: true,
  opacity: 1,
});
