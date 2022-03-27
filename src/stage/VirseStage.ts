import * as THREE from "three";
import { GLTFPrimitive, GLTFSchema, VRM, VRMSchema } from "@pixiv/three-vrm";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import {
  EffectComposer,
  Pass,
} from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader";
// import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import {
  GridHelper,
  Object3D,
  PerspectiveCamera,
  SkeletonHelper,
  WebGLRenderer,
} from "three";
import { nanoid } from "nanoid";
import { setupIKController, UI } from "./VRMToyBox/UI";
import { Avatar } from "./VRMToyBox/Avatar";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { getDistortionShaderDefinition } from "./effects/distortion";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { fit } from "object-fit-math";
import mitt from "mitt";

export type CamModes = "perspective" | "orthographic";
type MorphProxy = { name: string; binds: any[]; _value: number; value: number };

export class VirseStage {
  public renderer: WebGLRenderer;
  public pCam: THREE.PerspectiveCamera;
  public oCam: THREE.OrthographicCamera;
  public activeCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  public orbitControls: OrbitControls;
  public scene: THREE.Scene;
  public light: THREE.DirectionalLight;
  public clock: THREE.Clock;
  public composer: EffectComposer;

  public enableEffect = false;
  public visibleBones = true;
  public events = mitt<{ updated: void }>();
  private objects: Object3D[] = [];
  private passes: { render: RenderPass; distortion: Pass };
  #size: { width: number; height: number };

  public vrms: {
    [K: string]: {
      avatar: Avatar;
      vrm: VRM;
      ui: UI;
      proxy: { [k: string]: MorphProxy };
    };
  } = Object.create(null);

  constructor(public canvas: HTMLCanvasElement) {
    this.#size = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const r = (this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      // premultipliedAlpha: true,
      canvas,
    }));
    r.setClearColor("#ffffff");
    r.setClearAlpha(0);
    r.setSize(this.#size.width, this.#size.height);
    r.setPixelRatio(window.devicePixelRatio);

    const size = fit(
      { width: window.innerWidth, height: window.innerHeight },
      this.#size,
      "contain"
    );
    this.canvas.style.setProperty("width", `${size.width}px`);
    this.canvas.style.setProperty("height", `${size.height}px`);

    const pCam = (this.pCam = new THREE.PerspectiveCamera(
      10,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    ));
    pCam.position.set(0.0, 1.4, 0.7);
    this.activeCamera = pCam;

    this.oCam = new THREE.OrthographicCamera(
      window.innerWidth / -2,
      window.innerWidth / 2,
      window.innerHeight / 2,
      window.innerHeight / -2,
      0.01,
      2000
    );
    this.oCam.position.set(0.0, 1.4, 0.7);
    this.oCam.zoom = 200;

    // controls
    const orbitControls = (this.orbitControls = new OrbitControls(
      pCam,
      r.domElement
    ));
    orbitControls.screenSpacePanning = true;
    orbitControls.target.set(0.0, 1.4, 0.0);
    orbitControls.update();

    // scene
    const scene = (this.scene = new THREE.Scene());
    const grid = new GridHelper(20, 20);
    this.objects.push(grid);
    scene.add(grid);

    // light
    const light = (this.light = new THREE.DirectionalLight(0xffffff));
    light.position.set(1.0, 1.0, 1.0).normalize();
    scene.add(light);

    // composer
    const effectComposer = (this.composer = new EffectComposer(r));
    effectComposer.setPixelRatio(window.devicePixelRatio);

    const renderPass = new RenderPass(scene, pCam);
    effectComposer.addPass(renderPass);

    const fxaa = new ShaderPass(FXAAShader);
    fxaa.material.uniforms["resolution"].value.x =
      1 / (canvas.offsetWidth * window.devicePixelRatio);
    fxaa.material.uniforms["resolution"].value.y =
      1 / (canvas.offsetHeight * window.devicePixelRatio);
    effectComposer.addPass(fxaa);

    const dist = new ShaderPass(getDistortionShaderDefinition());
    effectComposer.addPass(dist);
    dist.renderToScreen = true;

    this.passes = { render: renderPass, distortion: dist };

    {
      const horizontalFOV = 120;
      const strength = 0.5;
      const cylindricalRatio = 5;
      const height =
        Math.tan(THREE.MathUtils.degToRad(horizontalFOV) / 2) / pCam.aspect;

      dist.uniforms["strength"].value = strength;
      dist.uniforms["height"].value = height;
      dist.uniforms["aspectRatio"].value = pCam.aspect;
      dist.uniforms["cylindricalRatio"].value = cylindricalRatio;
    }

    // Main Render Loop
    this.clock = new THREE.Clock();
  }

  public dispose() {
    Object.values(this.vrms).map((v) => {
      v.ui.dispose();
      v.vrm.dispose();
    });
    this.renderer.dispose();
  }

  public setCamMode(mode: CamModes) {
    this.orbitControls.dispose();

    this.activeCamera = mode === "perspective" ? this.pCam : this.oCam;
    this.activeCamera.position.set(0.0, 1.4, 0.7);
    this.activeCamera.updateProjectionMatrix();

    // const vec = new THREE.Vector3();

    // Object.values(this.vrms)[0]
    //   ?.vrm.humanoid?.getBone(VRMSchema.HumanoidBoneName.Head)
    //   ?.node.getWorldPosition(vec);

    // this.activeCamera.lookAt(vec);

    this.orbitControls = new OrbitControls(this.activeCamera, this.canvas);
    this.orbitControls.screenSpacePanning = true;
    this.orbitControls.target.set(0.0, 1.4, 0.0);
    this.orbitControls.update();

    this.passes.render.camera = this.activeCamera;

    this.events.emit("updated");
  }

  public get camMode(): CamModes {
    return this.activeCamera instanceof PerspectiveCamera
      ? "perspective"
      : "orthographic";
  }

  public setControlMode(mode: string) {
    Object.values(this.vrms).map((o) => {
      o.ui.ikControlMode(mode);
    });
  }

  public setDisplayBones(visible: boolean) {
    this.visibleBones = visible;
    this.objects.forEach((o) => (o.visible = visible));
  }

  public setSize(w: number, h: number) {
    this.#size = { width: w, height: h };
    this.canvas.width = w;
    this.canvas.height = h;

    this.pCam.aspect = w / h;
    this.pCam.updateProjectionMatrix();

    this.oCam.left = -window.innerWidth / 2;
    this.oCam.right = window.innerWidth / 2;
    this.oCam.top = window.innerHeight / 2;
    this.oCam.bottom = -window.innerHeight / 2;
    this.oCam.updateProjectionMatrix();

    this.renderer.setSize(w, h, false);
    this.passes.render.setSize(w, h);
    this.composer.setSize(w, h);

    const size = fit(
      { width: window.innerWidth, height: window.innerHeight },
      this.#size,
      "contain"
    );
    this.canvas.style.setProperty("width", `${size.width}px`);
    this.canvas.style.setProperty("height", `${size.height}px`);
  }

  public getSize() {
    return { ...this.#size };
  }

  public async loadVRM(url: string) {
    {
      Object.values(this.vrms).forEach((m) => {
        this.scene.remove(m.vrm.scene);
        m.vrm.dispose();
      });

      this.vrms = {};
    }

    const avatar = new Avatar(this.scene);
    await avatar.loadVRM(url);

    const { vrm } = avatar;
    avatar.kalidokit.events.on("statusChanged", () => {
      this.events.emit("updated");
    });

    const ui = new UI(this, avatar);

    this.scene.add(vrm.scene);
    this.vrms[nanoid()] = {
      vrm,
      avatar,
      ui,
      proxy: await this.gltfTargets(avatar),
    };

    this.events.emit("updated");
  }

  private async gltfTargets(avatar: Avatar) {
    const proxy: { [k: string]: MorphProxy } = Object.create(null);
    let uniqIdx = 1;

    if (!avatar.gltfJson.json.meshes) return {};

    for (
      let meshIdx = 0;
      meshIdx < avatar.gltfJson.json.meshes.length;
      meshIdx++
    ) {
      const mesh = avatar.gltfJson.json.meshes[meshIdx];
      for (let primIdx = 0; primIdx < mesh.primitives.length; primIdx++) {
        const pri = mesh.primitives[primIdx];

        if (!pri.targets) continue;
        for (let targetIdx = 0; targetIdx < pri.targets.length; targetIdx++) {
          const targetName =
            (pri.extras?.targetNames as string[])?.[targetIdx] ??
            `Morph ${uniqIdx++}`;

          const nodesUsingByMesh: number[] = [];
          (avatar.gltf.parser.json.nodes as GLTFSchema.Node[]).forEach(
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
                  proxy[targetName]._value = v;
                  proxy[targetName].binds.forEach((bind) => {
                    bind.primitives.forEach((prim: any) => {
                      prim.morphTargetInfluences[bind.morphTargetIndex] = v;
                    });
                  });
                },
                get(): number {
                  return proxy[targetName]._value;
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
                    await gltfExtractPrimitivesFromNode(avatar.gltf, nodeIdx)
                )
              )
            )
              .flat()
              .filter((v): v is GLTFPrimitive => v != null),
          });
        }
      }
    }

    return proxy;
  }

  public render() {
    // Update model to render physics
    Object.values(this.vrms).map((model) => {
      model.ui.update();
      model.vrm.update(this.clock.getDelta());
      model.avatar.update(); //this.clock.getDelta());
    });

    this.passes.distortion.enabled = this.enableEffect;

    // if (this.enableEffect) {
    this.composer.render(this.clock.getDelta());
    // } else {
    //   this.renderer.render(this.scene, this.activeCamera);
    // }
  }
}

/**
 * @see https://github.com/pixiv/three-vrm/blob/cbb8697da45877fcd8e14d814a5b128947c12c7e/packages/three-vrm/src/utils/gltfExtractPrimitivesFromNode.ts#L89
 */
function extractPrimitivesInternal(
  gltf: GLTF,
  nodeIndex: number,
  node: THREE.Object3D
): GLTFPrimitive[] | null {
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
  const schemaNode: GLTFSchema.Node = gltf.parser.json.nodes[nodeIndex];
  const meshIndex = schemaNode.mesh;
  if (meshIndex == null) {
    return null;
  }

  // How many primitives the mesh has?
  const schemaMesh: GLTFSchema.Mesh = gltf.parser.json.meshes[meshIndex];
  const primitiveCount = schemaMesh.primitives.length;

  // Traverse the node and take first (primitiveCount) meshes
  const primitives: GLTFPrimitive[] = [];
  node.traverse((object) => {
    if (primitives.length < primitiveCount) {
      if ((object as any).isMesh) {
        primitives.push(object as GLTFPrimitive);
      }
    }
  });

  return primitives;
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
): Promise<GLTFPrimitive[] | null> {
  const node: THREE.Object3D = await gltf.parser.getDependency(
    "node",
    nodeIndex
  );
  return extractPrimitivesInternal(gltf, nodeIndex, node);
}

const aspectOf = (x: number, y: number) => {
  /** https://tech.arc-one.jp/asepct-ratio */
  const gcd = (x: number, y: number): number => {
    if (y === 0) return x;
    return gcd(y, x % y);
  };

  const g = gcd(x, y);
  return { x: x / g, y: y / g };
};
