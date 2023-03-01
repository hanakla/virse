import * as THREE from "three";
import { VRM, VRMUtils } from "@pixiv/three-vrm";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import {
  EffectComposer,
  Pass,
} from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader";
// import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import {
  Bone,
  Color,
  GridHelper,
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  SkeletonHelper,
  WebGLRenderer,
} from "three";
import { nanoid } from "nanoid";
// import { AvatarController } from "./VRMToyBox/AvatarController";
import { Avatar } from "./VRMToyBox/Avatar";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { fit } from "object-fit-math";
import mitt from "mitt";
import { VrmPoseController } from "./VRMToyBox/vrmPoseController";

export type CamModes = "perspective" | "orthographic";

export class VirseStage {
  public renderer: WebGLRenderer;
  public pCam: THREE.PerspectiveCamera;
  public oCam: THREE.OrthographicCamera;
  public activeCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  public orbitControls: OrbitControls;
  public rootScene: THREE.Scene;
  public light: THREE.Light;
  public clock: THREE.Clock;
  public composer: EffectComposer;

  public enableEffect = false;
  #showBones = true;

  public events = mitt<{ updated: void; boneChanged: Bone | null }>();
  private objects: Object3D[] = [];
  private passes: {
    render: RenderPass;
    fxaa: ShaderPass;
    distortion: ShaderPass;
  };

  #size: { width: number; height: number };

  public avatars: {
    [K: string]: {
      avatar: Avatar;
      ui: VrmPoseController;
      vrm: VRM;
    };
  } = Object.create(null);

  constructor(public canvas: HTMLCanvasElement) {
    this.#size = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      premultipliedAlpha: true,
      stencil: true,
      canvas,
    });

    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.#size.width, this.#size.height);
    this.renderer.setClearColor("#ffffff");
    this.renderer.setClearAlpha(0);

    // const size = fit(
    //   { width: window.innerWidth, height: window.innerHeight },
    //   this.#size,
    //   "contain"
    // );
    // this.canvas.style.setProperty("width", `${size.width}px`);
    // this.canvas.style.setProperty("height", `${size.height}px`);

    // scene
    const scene = (this.rootScene = new THREE.Scene());

    this.pCam = new THREE.PerspectiveCamera(
      30,
      window.innerWidth / window.innerHeight,
      1,
      10000
    );
    this.pCam.position.set(0.0, 1.3, 3);
    this.pCam.rotation.set(0.0, Math.PI, 0);
    this.activeCamera = this.pCam;

    this.oCam = new THREE.OrthographicCamera(
      window.innerWidth / -2,
      window.innerWidth / 2,
      window.innerHeight / 2,
      window.innerHeight / -2,
      1,
      10000
    );
    this.oCam.position.set(0.0, 1.4, 0);
    this.oCam.zoom = 200;

    // light
    const light = (this.light = new THREE.DirectionalLight(0xffffff));
    light.position.set(1.0, 1.0, 1.0).normalize();
    scene.add(light);

    const grid = new GridHelper(20, 20);
    this.objects.push(grid);
    scene.add(grid);

    // controls
    this.orbitControls = new OrbitControls(this.pCam, this.canvas);
    this.orbitControls.target.y = 1.0;
    this.orbitControls.update();

    // composer
    const effectComposer = (this.composer = new EffectComposer(this.renderer));
    effectComposer.setPixelRatio(window.devicePixelRatio);

    const renderPass = new RenderPass(scene, this.pCam);
    effectComposer.addPass(renderPass);

    const fxaa = new ShaderPass(FXAAShader);
    fxaa.material.uniforms["resolution"].value.x =
      1 / (canvas.offsetWidth * window.devicePixelRatio);
    fxaa.material.uniforms["resolution"].value.y =
      1 / (canvas.offsetHeight * window.devicePixelRatio);
    effectComposer.addPass(fxaa);

    // const dist = new ShaderPass(getDistortionShaderDefinition());
    // effectComposer.addPass(dist);
    // dist.renderToScreen = true;

    this.passes = { render: renderPass, fxaa, distortion: null };

    // {
    //   const horizontalFOV = 120;
    //   const strength = 0.5;
    //   const cylindricalRatio = 5;
    //   const height =
    //     Math.tan(THREE.MathUtils.degToRad(horizontalFOV) / 2) / pCam.aspect;

    //   dist.uniforms["strength"].value = strength;
    //   dist.uniforms["height"].value = height;
    //   dist.uniforms["aspectRatio"].value = pCam.aspect;
    //   dist.uniforms["cylindricalRatio"].value = cylindricalRatio;
    // }

    // Main Render Loop
    this.clock = new THREE.Clock();

    // window
    window.v$setBone = (bone: Bone) => {
      Object.values(this.avatars).filter(({ avatar }) => {
        let hasBone = false;
        avatar.vrm.scene.traverse((o) => {
          hasBone = hasBone || o === bone;
        });

        if (hasBone) {
          avatar.ui.selectBone(bone);
        }
      });
    };
  }

  public get iterableAvatars() {
    return Object.values(this.avatars);
  }

  public get vrms() {
    return this.avatars;
  }

  public dispose() {
    Object.values(this.avatars).map((avatar) => {
      // avatar.ui.dispose();
      VRMUtils.deepDispose(avatar.vrm.scene);
      this.rootScene.remove(avatar.vrm.scene);
    });

    this.renderer.dispose();
  }

  public setCamMode(
    mode?: CamModes,
    opt: {
      fov?: number;
      zoom?: number;
      position?: [number, number, number];
      target?: [number, number, number];
      rotation?: [number, number, number];
      quaternion?: [number, number, number, number];
    } = {}
  ) {
    this.orbitControls.dispose();

    mode ??= this.camMode === "perspective" ? "orthographic" : "perspective";

    const cam = (this.activeCamera =
      mode === "perspective" ? this.pCam : this.oCam);

    // this.activeCamera.position.set(0.0, 1.4, 0.7);
    if (cam instanceof PerspectiveCamera && opt.fov != null) cam.fov = opt.fov;
    if (cam instanceof OrthographicCamera && opt.zoom != null)
      cam.zoom = opt.zoom;
    if (opt.position != null) cam.position.fromArray(opt.position);
    if (opt.rotation != null) cam.rotation.fromArray(opt.rotation);
    if (opt.quaternion != null) cam.quaternion.fromArray(opt.quaternion);

    cam.updateMatrix();
    cam.updateProjectionMatrix();

    // const vec = new THREE.Vector3();

    // Object.values(this.vrms)[0]
    //   ?.vrm.humanoid?.getBone(VRMSchema.HumanoidBoneName.Head)
    //   ?.node.getWorldPosition(vec);

    // this.activeCamera.lookAt(vec);

    this.orbitControls = new OrbitControls(cam, this.canvas);
    this.orbitControls.screenSpacePanning = true;
    this.orbitControls.target.fromArray(opt.target ?? [0.0, 1.4, 0.0]);
    this.orbitControls.update();

    this.passes.render.camera = this.activeCamera;

    this.events.emit("updated");
  }

  public get camFov() {
    return this.pCam.fov;
  }

  public set camFov(fov: number) {
    this.pCam.fov = fov;
    this.pCam.updateProjectionMatrix();
    this.orbitControls.update();
  }

  public get camMode(): CamModes {
    return this.activeCamera instanceof PerspectiveCamera
      ? "perspective"
      : "orthographic";
  }

  public setControlMode(mode: string) {
    Object.values(this.avatars).map(({ avatar }) => {
      avatar.ui.ikControlMode(mode);
    });
  }

  public get boneControlMode() {
    return Object.values(this.avatars)[0].ui.fkControlMode;
  }

  public set boneControlMode(mode: string) {
    Object.values(this.avatars).map((o) => {
      o.ui.fkControlMode = mode as any;
    });
  }

  public get activeModel() {
    return Object.values(this.avatars)[0];
  }

  public setShowBones(visible: boolean) {
    console.log({ visible });
    this.#showBones = visible;

    this.iterableAvatars.forEach((avatar) => {
      avatar.ui.setVisible(visible);
    });

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
    this.passes.fxaa.material.uniforms["resolution"].value.x =
      1 / (w * window.devicePixelRatio);
    this.passes.fxaa.material.uniforms["resolution"].value.y =
      1 / (h * window.devicePixelRatio);
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

  public setBackgroundColor({
    r,
    g,
    b,
    a,
  }: {
    r: number;
    g: number;
    b: number;
    a: number;
  }) {
    this.renderer.setClearColor(new Color(r / 255, g / 255, b / 255));

    this.renderer.setClearAlpha(a);
  }

  public async loadVRM(url: string) {
    {
      Object.values(this.avatars).forEach(({ avatar }) => {
        this.rootScene.remove(avatar.vrm.scene);
        VRMUtils.deepDispose(avatar.vrm.scene);
      });

      this.avatars = {};
    }

    const avatar = new Avatar(this);
    await avatar.loadVRM(url);

    console.log(this.#showBones);
    avatar.ui.setVisible(this.#showBones);

    avatar.ui.events.on("ikDragChange", ({ dragging }) => {
      console.log("ikDragChange");
      this.orbitControls.enabled = !dragging;
    });

    avatar.kalidokit.events.on("statusChanged", () => {
      this.events.emit("updated");
    });

    this.avatars[nanoid()] = {
      avatar,
      get ui() {
        return avatar.ui;
      },
      get vrm() {
        return avatar.vrm;
      },
    };

    this.events.emit("updated");
  }

  public resetCamera() {
    this.pCam.position.set(0.0, 1.4, 0.7);
    this.pCam.rotation.set(0, 0, 0, "XYZ");
    this.pCam.position.set(0.0, 1.4, 0.7);
    this.pCam.zoom = 1;

    this.oCam.position.set(0.0, 1.4, 0);
    this.oCam.rotation.set(0, 0, 0, "XYZ");
    this.oCam.position.set(0.0, 1.4, 0);
    this.oCam.zoom = 200;

    this.pCam.updateProjectionMatrix();
    this.oCam.updateProjectionMatrix();

    this.orbitControls.target.set(0.0, 1.4, 0.0);
    this.orbitControls.update();
  }

  public render() {
    // Update model to render physics
    Object.values(this.avatars).map(({ avatar }) => {
      avatar.update();
      avatar.ui.update();
      avatar.vrm.update(0);
    });

    // this.passes.distortion.enabled = this.enableEffect;

    // if (this.enableEffect) {
    // this.composer.render(this.clock.getDelta());
    // } else {
    this.renderer.render(this.rootScene, this.activeCamera);
    // }
  }
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
