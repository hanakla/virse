import * as THREE from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { WebIO, JSONDocument as GLTFJson } from "@gltf-transform/core";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";
import { GLTFPrimitive, GLTFSchema, VRM, VRMUtils } from "@pixiv/three-vrm";
import { VrmIK } from "./IK";
import { KalidokitCapture } from "../Kalidokit/capture";
import { Bone } from "three";

export class Avatar {
  private _scene: THREE.Scene;
  public gltfJson!: GLTFJson;
  public gltf!: GLTF;
  private _vrm: VRM;
  private _vrmIK!: VrmIK;
  public needIKSolve: boolean = false;
  public initialBones: Array<{
    name: string;
    position: [number, number, number];
    quaternion: [number, number, number, number];
  }> = [];

  public controls: TransformControls[] = [];
  #kalidokit: KalidokitCapture | null = null;

  constructor(scene: THREE.Scene) {
    this._scene = scene;
    this._vrm = null;
  }

  public get vrmIK(): VrmIK {
    return this._vrmIK;
  }

  public get vrm(): VRM {
    return this._vrm;
  }

  public get kalidokit() {
    return (this.#kalidokit ??= new KalidokitCapture(this));
  }

  // VRMの読み込み
  public async loadVRM(url: string) {
    if (this._vrm) {
      this._scene.remove(this._vrm.scene);
      this._vrm.dispose();
    }

    const loader = new GLTFLoader();

    const gltfBin = new Uint8Array(await (await fetch(url)).arrayBuffer());
    this.gltfJson = await new WebIO({ credentials: "include" }).binaryToJSON(
      gltfBin
    );

    const gltf = (this.gltf = await loader.loadAsync(url));

    const vrm = await VRM.from(gltf);
    // rotateVRM0(vrm);
    this._vrm = vrm;
    // vrm.springBoneManager?.springBoneGroupList

    const bones: Bone[] = [];
    vrm.scene.traverse((o) => {
      if ((o as any).isBone) bones.push(o as Bone);
    });

    this.initialBones = bones.map((bone) => {
      return {
        name: bone.name,
        position: bone.position.toArray(),
        quaternion: bone.quaternion.toArray() as [
          number,
          number,
          number,
          number
        ],
      };
    });

    this._vrmIK = new VrmIK(vrm);
  }

  public update() {
    if (this.needIKSolve) {
      this._vrmIK.solve(); // IKを解決
    } else {
      // IK操作時以外は手先に追従させる
      this._vrmIK.ikChains.forEach((chain) => {
        chain.effector.getWorldPosition(chain.goal.position);
      });
    }

    // if (!!this._vrmIK) this._vrmIK.solve();
  }

  public resetPose() {
    this.initialBones.forEach((bone) => {
      const o = this.vrm.scene.getObjectByName(bone.name);
      if (!o) return;

      o.position.fromArray(bone.position);
      o.quaternion.fromArray(bone.quaternion);
    });
  }
}

export function rotateVRM0(vrm: VRM): void {
  vrm.scene.rotation.y = Math.PI;
  // if (vrm.meta?.metaVersion === '0') {

  // }
}
