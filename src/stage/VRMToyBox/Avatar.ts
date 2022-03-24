import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";
import { VRM, VRMUtils } from "@pixiv/three-vrm";
import { VrmIK } from "./IK";

export class Avatar {
  private _scene: THREE.Scene;
  private _vrm: VRM;
  private _vrmIK: VrmIK;
  public needIKSolve: boolean = false;

  public controls: TransformControls[] = [];

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
  // VRMの読み込み
  public async loadVRM(url: string) {
    if (this._vrm) {
      this._scene.remove(this._vrm.scene);
      this._vrm.dispose();
    }

    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);
    const vrm = await VRM.from(gltf);
    // VRMUtils.
    this._scene.add(vrm.scene);
    this._vrm = vrm;

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
}
