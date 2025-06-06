import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import {
  WebIO,
  JSONDocument as GLTFJson,
  GLTF as GLTFSchema,
  Primitive as GLTFPrimitive,
} from '@gltf-transform/core';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import {
  VRM,
  VRMExpressionPresetName,
  VRMLoaderPlugin,
  VRMPose,
  VRMUtils,
} from '@pixiv/three-vrm';
import { KalidokitCapture } from '../Kalidokit/capture';
import {
  Bone,
  Group,
  Scene,
  SkinnedMesh,
  Vector3Tuple,
  Vector4Tuple,
} from 'three';
import { VirseStage } from '../VirseStage';
import mitt from 'mitt';
import { VrmPoseController } from './vrmPoseController';
import { HistoryEntry } from '../History';
import { isEqualToPrecision } from './vrmPoseController/utils';

type Events = {
  updated: void;
  boneChanged: Bone | null;
  boneDragging: { dragging: boolean };
  kalidokitStatusChanged: { initialized: boolean; running: boolean };
  historyPushed: HistoryEntry;
};

type MorphProxy = {
  name: string;
  binds: Array<{
    meshName: string | undefined;
    targetName: string;
    meshIdx: number;
    morphTargetIndex: number;
    primitives: SkinnedMesh[];
  }>;
  _value: number;
  value: number;
};

export type InitialBoneState = {
  name: string;
  bone: Bone;
  position: Vector3Tuple;
  globalPos: Vector3Tuple;
  quaternion: Vector4Tuple;
};

export class Avatar {
  private _stage: VirseStage;

  public gltfJson!: GLTFJson;
  public gltf!: GLTF;
  public vrmBin: Blob | null = null;
  private _avatarScene!: Scene;
  private _vrm!: VRM;
  private _positionBone!: Bone;

  // private _vrmIK!: VrmIK;
  public needIKSolve: boolean = false;
  public initialBones: Array<InitialBoneState> = [];

  public readonly events = mitt<Events>();
  private controls: TransformControls[] = [];
  public blendshapes: Record<string, MorphProxy> | null = null;

  #kalidokit: KalidokitCapture | null = null;
  #controller!: VrmPoseController;

  #visible: boolean = true;

  #bones: THREE.Bone[] = [];
  #mirrorBoneMap: { [k: string]: THREE.Bone } = {};

  constructor(stage: VirseStage) {
    this._stage = stage;
    // this._vrm = null;
    this._avatarScene = new THREE.Scene();
    this._positionBone = new THREE.Bone();
    this._positionBone.name = 'ROOT_position';
  }

  public get vrm(): VRM {
    return this._vrm;
  }

  public get ui(): VrmPoseController {
    return this.#controller;
  }

  public get kalidokit() {
    if (this.#kalidokit) return this.#kalidokit;

    this.#kalidokit = new KalidokitCapture(this);
    this.#kalidokit.events.on('statusChanged', (status) => {
      this.events.emit('kalidokitStatusChanged', status);
    });

    return;
  }

  public get allBoneNames() {
    return this.initialBones.map((b) => b.name);
  }

  public get positionBone() {
    return this._positionBone;
  }

  public get visible() {
    return this.#visible;
  }

  public set visible(v: boolean) {
    this.#visible = v;
    this._avatarScene.visible = v;
    this.#controller.setVisible(v);
    this.events.emit('updated');
  }

  public getInitialBoneState(name: string) {
    return this.initialBones.find((b) => b.name === name);
  }

  // VRMの読み込み
  public async loadVRM(url: string) {
    if (this._vrm) {
      VRMUtils.deepDispose(this._vrm.scene);
      this._stage.rootScene.remove(this._vrm.scene);
    }

    const loader = new GLTFLoader();
    loader.register(
      (parser) =>
        new VRMLoaderPlugin(parser, {
          autoUpdateHumanBones: false,
        })
    );

    const gltf = await loader.loadAsync(url);
    this.gltf = gltf;

    const buffer = await (await fetch(url)).arrayBuffer();
    this.gltfJson = await new WebIO({ credentials: 'include' }).binaryToJSON(
      new Uint8Array(buffer)
    );
    this.vrmBin = new Blob([buffer], { type: 'model/gltf+json' });

    const vrm: VRM = gltf.userData.vrm;
    vrm.scene.traverse((l) => {
      l.frustumCulled = false;
    });

    VRMUtils.removeUnnecessaryJoints(vrm.scene);
    VRMUtils.removeUnnecessaryVertices(vrm.scene);
    VRMUtils.rotateVRM0(vrm);

    this._vrm = vrm;
    this._positionBone.add(vrm.scene);
    this._avatarScene.add(this._positionBone);
    this._stage.rootScene.add(this._avatarScene);

    // this._stage.rootScene.add(this._positionRoot);
    // this._stage.rootScene.add(vrm.scene);

    // this._positionRoot.position.x = 0.3;

    const bones: Bone[] = [];
    vrm.scene.traverse((o) => {
      if ((o as any).isBone) bones.push(o as Bone);
    });
    this.#bones = bones;

    this.initialBones = bones.map((bone) => {
      return {
        name: bone.name,
        bone,
        position: bone.position.toArray(),
        globalPos: bone.getWorldPosition(new THREE.Vector3()).toArray(),
        quaternion: bone.quaternion.toArray() as [
          number,
          number,
          number,
          number
        ],
      };
    });

    this.#mirrorBoneMap = this.initialBones.reduce((acc, b) => {
      const symmetricalBone = this.initialBones.find(
        (bone) =>
          b.bone.uuid !== bone.bone.uuid &&
          isEqualToPrecision(bone.globalPos[0], -b.globalPos[0], 5) &&
          isEqualToPrecision(bone.globalPos[1], b.globalPos[1], 5) &&
          isEqualToPrecision(bone.globalPos[2], b.globalPos[2], 5)
      );

      if (!symmetricalBone) return acc;

      acc[b.bone.uuid] = symmetricalBone.bone;

      return acc;
    }, Object.create(null));

    const ui = (this.#controller = new VrmPoseController(
      vrm,
      this.#mirrorBoneMap,
      this._positionBone,
      this._avatarScene,
      this._stage.activeCamera,
      this._stage.canvas,
      this._stage.orbitControls
    ));

    // ui.events.on('dragChange', (e) => {
    //   if (e.dragging) {
    //     this._stage.canvas.requestPointerLock();
    //   } else {
    //     document.pointerLockElement && document.exitPointerLock();
    //   }
    // });

    let prevPose: {
      pose: VRMPose;
      position: Bone;
    } = {
      pose: vrm.humanoid.getRawPose(),
      position: this.positionBone.clone(false),
    };
    ui.events.on('poseChanged', ({ pose }) => {
      const undoPose = prevPose;
      const nextPose = {
        pose: pose,
        position: this.positionBone.clone(false),
      };
      prevPose = nextPose;

      this.events.emit('historyPushed', {
        undo: () => {
          this.positionBone.position.copy(undoPose.position.position);
          this.positionBone.quaternion.copy(undoPose.position.quaternion);
          vrm.humanoid.setRawPose(undoPose.pose);
        },
        redo: () => {
          console.log(undoPose, nextPose, undoPose.pose === nextPose.pose);
          this.positionBone.position.copy(nextPose.position.position);
          this.positionBone.quaternion.copy(nextPose.position.quaternion);
          vrm.humanoid.setRawPose(nextPose.pose);
        },
      });
    });

    ui.events.on('boneChanged', (b) => this.events.emit('boneChanged', b.bone));
    ui.events.on('dragChange', (e) => this.events.emit('boneDragging', e));

    this.blendshapes = await this.buildGltfTargets();
  }

  public dispose() {
    this.ui.dispose();
    this.#kalidokit?.dispose();
    this._stage.rootScene.remove(this._avatarScene);
    VRMUtils.deepDispose(this._vrm.scene);
  }

  public update() {
    this.#controller.update();

    // if (!!this._vrmIK) this._vrmIK.solve();
  }

  public resetBone(boneName: string) {
    const initial = this.getInitialBoneState(boneName);
    const targetBone = this.#bones.find((b) => b.name === boneName);

    if (!targetBone || !initial) return;

    targetBone.position.fromArray(initial.position);
    targetBone.quaternion.fromArray(initial.quaternion);

    if (this.ui.mirrorBone) {
      const symmetricalBone = this.#mirrorBoneMap[targetBone.uuid];
      if (!symmetricalBone) return;

      symmetricalBone.position.fromArray(initial.position);
      symmetricalBone.quaternion.fromArray(initial.quaternion);
    }
  }

  public resetPose() {
    this.initialBones.forEach((bone) => {
      const o = this.vrm.scene.getObjectByName(bone.name);
      if (!o) return;

      o.position.fromArray(bone.position);
      o.quaternion.fromArray(bone.quaternion);
      o.scale.fromArray([1, 1, 1]);
    });

    this.positionBone.position.set(0, 0, 0);
    this.positionBone.quaternion.set(0, 0, 0, 1);
  }

  public resetExpressions() {
    if (!this.blendshapes) return;

    Object.keys(this.blendshapes ?? {}).forEach((name) => {
      this.blendshapes![name].value = 0;
    });

    Object.values(VRMExpressionPresetName).forEach((name) => {
      this.vrm.expressionManager?.setValue(name, 0);
    });

    // console.log('reset', this.vrm.expressionManager, this.blendshapes);
  }

  private async buildGltfTargets() {
    const proxy: { [k: string]: MorphProxy } = Object.create(null);
    let uniqIdx = 1;

    if (!this.gltfJson.json.meshes) return {};

    for (
      let meshIdx = 0;
      meshIdx < this.gltfJson.json.meshes.length;
      meshIdx++
    ) {
      const mesh: GLTFSchema.IMesh = this.gltfJson.json.meshes[meshIdx];

      for (let primIdx = 0; primIdx < mesh.primitives.length; primIdx++) {
        const pri = mesh.primitives[primIdx];

        if (!pri.targets) continue;
        for (let targetIdx = 0; targetIdx < pri.targets.length; targetIdx++) {
          const targetName =
            (pri.extras?.targetNames as string[])?.[targetIdx] ??
            `Morph ${uniqIdx++}`;

          const nodesUsingByMesh: number[] = [];
          (this.gltf.parser.json.nodes as GLTFSchema.INode[]).forEach(
            (node, i) => {
              if (node.mesh === meshIdx) {
                nodesUsingByMesh.push(i);
              }
            }
          );

          proxy[targetName] ??= Object.defineProperties(
            {
              name: targetName,
              binds: [],
              _value: 0,
              value: 0,
            },
            {
              _value: {
                enumerable: false,
              },
              value: {
                enumerable: true,
                set(v: number) {
                  proxy[this.name]._value = v;
                  proxy[this.name].binds.forEach((bind) => {
                    bind.primitives.forEach((mesh) => {
                      mesh.morphTargetInfluences[bind.morphTargetIndex] = v;
                    });
                  });
                },
                get(): number {
                  return proxy[this.name]._value;
                },
              },
            }
          );

          proxy[targetName].binds.push({
            meshName: mesh.name,
            targetName: targetName,
            meshIdx: meshIdx,
            morphTargetIndex: targetIdx,
            primitives: (
              await Promise.all(
                nodesUsingByMesh.map(
                  async (nodeIdx) =>
                    await gltfExtractPrimitivesFromNode(this.gltf, nodeIdx)
                )
              )
            )
              .flat()
              .filter((v): v is SkinnedMesh => v != null),
          });
        }
      }
    }

    return proxy;
  }
}

/**
 * Extract primitives ( `THREE.Mesh[]` ) of a node from a loaded GLTF.
 * The main purpose of this function is to distinguish primitives and children from a node that has both meshes and children.
 *
 * It utilizes the behavior that GLTFLoader adds mesh primitives to the node object ( `THREE.Group` ) first then adds its children.
 *
 * @param gltf A GLTF object taken from GLTFLoader
 * @param nodeIndex The index of the node
 * @see https://github.com/pixiv/three-vrm/blob/cbb8697da45877fcd8e14d814a5b128947c12c7e/packages/three-vrm/src/utils/gltfExtractPrimitivesFromNode.ts#L89
 */
export async function gltfExtractPrimitivesFromNode(
  gltf: GLTF,
  nodeIndex: number
): Promise<SkinnedMesh[] | null> {
  const node: THREE.Object3D = await gltf.parser.getDependency(
    'node',
    nodeIndex
  );
  return extractPrimitivesInternal(gltf, nodeIndex, node);
}

/**
 * @see https://github.com/pixiv/three-vrm/blob/cbb8697da45877fcd8e14d814a5b128947c12c7e/packages/three-vrm/src/utils/gltfExtractPrimitivesFromNode.ts#L89
 */
function extractPrimitivesInternal(
  gltf: GLTF,
  nodeIndex: number,
  node: THREE.Object3D
): SkinnedMesh[] | null {
  /**
   * Let's list up every possible patterns that parsed gltf nodes with a mesh can have,,,
   *
   * "*" indicates that those meshes should be listed up using this function
   *
   * ### A node with a (mesh, a signle primitive)
   *
   * - `THREE.Mesh`: The only primitive of the mesh *
   *
   * ### A node with a (mesh, multiple primitives)
   *
   * - `THREE.Group`: The root of the mesh
   *   - `THREE.Mesh`: A primitive of the mesh *
   *   - `THREE.Mesh`: A primitive of the mesh (2) *
   *
   * ### A node with a (mesh, multiple primitives) AND (a child with a mesh, a single primitive)
   *
   * - `THREE.Group`: The root of the mesh
   *   - `THREE.Mesh`: A primitive of the mesh *
   *   - `THREE.Mesh`: A primitive of the mesh (2) *
   *   - `THREE.Mesh`: A primitive of a MESH OF THE CHILD
   *
   * ### A node with a (mesh, multiple primitives) AND (a child with a mesh, multiple primitives)
   *
   * - `THREE.Group`: The root of the mesh
   *   - `THREE.Mesh`: A primitive of the mesh *
   *   - `THREE.Mesh`: A primitive of the mesh (2) *
   *   - `THREE.Group`: The root of a MESH OF THE CHILD
   *     - `THREE.Mesh`: A primitive of the mesh of the child
   *     - `THREE.Mesh`: A primitive of the mesh of the child (2)
   *
   * ### A node with a (mesh, multiple primitives) BUT the node is a bone
   *
   * - `THREE.Bone`: The root of the node, as a bone
   *   - `THREE.Group`: The root of the mesh
   *     - `THREE.Mesh`: A primitive of the mesh *
   *     - `THREE.Mesh`: A primitive of the mesh (2) *
   *
   * ### A node with a (mesh, multiple primitives) AND (a child with a mesh, multiple primitives) BUT the node is a bone
   *
   * - `THREE.Bone`: The root of the node, as a bone
   *   - `THREE.Group`: The root of the mesh
   *     - `THREE.Mesh`: A primitive of the mesh *
   *     - `THREE.Mesh`: A primitive of the mesh (2) *
   *   - `THREE.Group`: The root of a MESH OF THE CHILD
   *     - `THREE.Mesh`: A primitive of the mesh of the child
   *     - `THREE.Mesh`: A primitive of the mesh of the child (2)
   *
   * ...I will take a strategy that traverses the root of the node and take first (primitiveCount) meshes.
   */

  // Make sure that the node has a mesh
  const schemaNode: GLTFSchema.INode = gltf.parser.json.nodes[nodeIndex];
  const meshIndex = schemaNode.mesh;
  if (meshIndex == null) {
    return null;
  }

  // How many primitives the mesh has?
  const schemaMesh: GLTFSchema.IMesh = gltf.parser.json.meshes[meshIndex];
  const primitiveCount = schemaMesh.primitives.length;

  // Traverse the node and take first (primitiveCount) meshes
  const primitives: GLTFPrimitive[] = [];
  node.traverse((object) => {
    if (primitives.length < primitiveCount) {
      if ((object as any).isMesh) {
        primitives.push(object);
      }
    }
  });

  return primitives;
}
