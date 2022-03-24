import * as THREE from "three";
import { VRM, VRMSchema } from "@pixiv/three-vrm";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
// import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { GridHelper, SkeletonHelper, WebGLRenderer } from "three";
import { nanoid } from "nanoid";
import { setupIKController } from "./VRMToyBox/UI";
import { Avatar } from "./VRMToyBox/Avatar";

export type CamModes = "perspective" | "orthographic";

export class VirseStage {
  public renderer: WebGLRenderer;
  public camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  public controls: OrbitControls;
  public scene: THREE.Scene;
  public light: THREE.DirectionalLight;
  public clock: THREE.Clock;
  public vrms: {
    [K: string]: { avatar: Avatar; vrm: VRM; skeleton: SkeletonHelper };
  } = Object.create(null);

  constructor(public canvas: HTMLCanvasElement) {
    const r = (this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      canvas,
    }));
    r.setSize(window.innerWidth, window.innerHeight);
    r.setPixelRatio(window.devicePixelRatio);

    const orbitCamera = (this.camera = new THREE.PerspectiveCamera(
      10,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    ));
    orbitCamera.position.set(0.0, 1.4, 0.7);

    // controls
    const orbitControls = (this.controls = new OrbitControls(
      orbitCamera,
      r.domElement
    ));
    orbitControls.screenSpacePanning = true;
    orbitControls.target.set(0.0, 1.4, 0.0);
    orbitControls.update();

    // scene
    const scene = (this.scene = new THREE.Scene());
    scene.add(new GridHelper(20, 20));

    // light
    const light = (this.light = new THREE.DirectionalLight(0xffffff));
    light.position.set(1.0, 1.0, 1.0).normalize();
    scene.add(light);

    // Main Render Loop
    const clock = (this.clock = new THREE.Clock());
  }

  public dispose() {
    Object.values(this.vrms).map((v) => v.vrm.dispose());
    this.renderer.dispose();
  }

  public onResize = () => {
    this.renderer.setSize(window.innerWidth, window.innerHeight, true);

    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
    } else if (this.camera instanceof THREE.OrthographicCamera) {
      this.camera.left = -window.innerWidth / 2;
      this.camera.right = window.innerWidth / 2;
      this.camera.top = window.innerHeight / 2;
      this.camera.bottom = -window.innerHeight / 2;
    }

    this.camera.updateProjectionMatrix();
  };

  public setCamMode(mode: CamModes) {
    if (mode === "perspective") {
      this.camera = new THREE.PerspectiveCamera(
        10,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
    } else {
      this.camera = new THREE.OrthographicCamera(
        window.innerWidth / -2,
        window.innerWidth / 2,
        window.innerHeight / 2,
        window.innerHeight / -2,
        0.01,
        2000
      );

      this.camera.zoom = 200;
    }

    this.camera.position.set(0.0, 1.4, 0.7);
    this.camera.updateProjectionMatrix();

    const vec = new THREE.Vector3();

    Object.values(this.vrms)[0]
      ?.vrm.humanoid?.getBone(VRMSchema.HumanoidBoneName.Head)
      ?.node.getWorldPosition(vec);

    this.camera.lookAt(vec);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.screenSpacePanning = true;
    this.controls.target.set(0.0, 1.4, 0.0);
    this.controls.update();
  }

  public setControlMode(mode: string) {
    Object.values(this.vrms).map((o) => {
      o.avatar.controls.map((c) => {
        c.setMode(mode);
      });
    });
  }

  public setDisplayBones(visible: boolean) {
    console.log({ visible });
    Object.values(this.vrms).map(({ skeleton }) => {
      skeleton.visible = visible;
    });
  }

  public async loadVRM(url: string) {
    // const loader = new GLTFLoader();
    // const gltf = await new Promise<GLTF>((resolve, reject) =>
    //   loader.load("./test.vrm", resolve, undefined, reject)
    // );

    // const vrm = await VRM.from(gltf);
    const avatar = new Avatar(this.scene);
    await avatar.loadVRM("./test.vrm");
    const { vrm } = avatar;
    setupIKController(this, avatar);
    // vrm.scene.rotation.y = Math.PI

    const skeleton = new THREE.SkeletonHelper(vrm.scene);

    this.scene.add(vrm.scene, skeleton);
    this.vrms[nanoid()] = { vrm, avatar, skeleton };
  }

  public render() {
    // Update model to render physics
    Object.values(this.vrms).map((model) => {
      model.vrm.update(this.clock.getDelta());
      model.avatar.update(); //this.clock.getDelta());
    });

    this.renderer.render(this.scene, this.camera);
  }
}
