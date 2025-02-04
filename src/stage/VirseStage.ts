import * as THREE from 'three';
import { Packr } from 'msgpackr';
import { VRM, VRMExpressionPresetName, VRMUtils } from '@pixiv/three-vrm';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader';
import {
  Bone,
  Color,
  GridHelper,
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  Vector3Tuple,
  Vector4Tuple,
  WebGLRenderer,
} from 'three';
import { nanoid } from 'nanoid';
import { Avatar } from './VRMToyBox/Avatar';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { fit } from 'object-fit-math';
import mitt from 'mitt';
import { VrmPoseController } from './VRMToyBox/vrmPoseController';
import { ObjectController } from './ObjectController/ObjectController';
import { History } from './History';

export type CamModes = 'perspective' | 'orthographic';

type Events = {
  boneChanged: Bone | null;
  boneHoverChanged: Bone | Object3D | null;
  cameraChanged: void;
  cameraChangeStart: void;
  updated: void;
};

type AvatarData = {
  type: 'avatar';
  uid: string;
  avatar: Avatar;
  ui: VrmPoseController;
  vrm: VRM;
};

type ObjectData = { type: 'object'; uid: string; obj: ObjectController };

export type VirseScene = {
  vrms: Record<string, Uint8Array>;
  gltfObjects: Record<string, Uint8Array | { name: string; bin: Uint8Array }>;
  canvas: {
    width: number;
    height: number;
    background?: { color: Vector3Tuple; alpha: number };
  };
  camera: {
    mode: 'perspective' | 'orthographic';
    fov: number;
    zoom: number;
    target: Vector3Tuple;
    position: Vector3Tuple;
    quaternion: Vector4Tuple;
  };
  poses: Record<
    string,
    {
      rootPosition: {
        position: Vector3Tuple;
        quaternion: Vector4Tuple;
      };
      vrmExpressions: Record<string, number>;
      morphs: Record<string, number>;
      bones: Record<
        string,
        {
          position: Vector3Tuple;
          quaternion: Vector4Tuple;
        }
      >;
    }
  >;
  objects: Record<
    string,
    {
      position: Vector3Tuple;
      quaternion: Vector4Tuple;
      scale: Vector3Tuple;
    }
  >;
};

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
  public history: History = new History();

  public enableEffect = false;
  #showBones = true;

  public events = mitt<Events>();
  private objects: Object3D[] = [];
  private passes: {
    render: RenderPass;
    fxaa: ShaderPass;
    distortion: ShaderPass;
  };

  #size: { width: number; height: number };
  #backgroundColor: { r: number; g: number; b: number; a: number } = {
    r: 255,
    g: 255,
    b: 255,
    a: 0,
  };
  #enablePhys: boolean = false;

  #activeAvatarUid: string | null = null;
  #activeTarget:
    | { type: 'avatar'; uid: string }
    | { type: 'object'; uid: string }
    | null = null;

  public avatars: {
    [K: string]: AvatarData;
  } = Object.create(null);

  public gltfObjects: {
    [K: string]: ObjectData;
  } = Object.create(null);

  constructor(public canvas: HTMLCanvasElement) {
    canvas.clientWidth;

    this.#size = {
      width: window.innerWidth,
      height: window.innerHeight,
      // width: canvas.clientWidth,
      // height: canvas.clientHeight,
    };

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      premultipliedAlpha: true,
      stencil: true,
      canvas,
    });

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.useLegacyLights = true;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.#size.width, this.#size.height);
    this.renderer.setClearColor('#ffffff', 0);

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
      15,
      window.innerWidth / window.innerHeight
    );
    this.pCam.position.set(0.0, 1.3, 3);
    this.pCam.rotation.set(0.0, Math.PI, 0);
    this.activeCamera = this.pCam;

    this.oCam = new THREE.OrthographicCamera(
      this.#size.width / -2,
      this.#size.width / 2,
      this.#size.height / 2,
      this.#size.height / -2,
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
    this.orbitControls.maxPolarAngle = Infinity;
    this.orbitControls.target.y = 1.0;
    this.orbitControls.enableDamping = true;
    this.orbitControls.update();

    this.orbitControls.addEventListener('start', () => {
      this.events.emit('cameraChangeStart');
    });
    this.orbitControls.addEventListener('end', () => {
      this.events.emit('cameraChanged');
    });

    // composer
    const effectComposer = (this.composer = new EffectComposer(this.renderer));
    effectComposer.setPixelRatio(window.devicePixelRatio);

    const renderPass = new RenderPass(scene, this.pCam);
    effectComposer.addPass(renderPass);

    const fxaa = new ShaderPass(FXAAShader);
    fxaa.material.uniforms['resolution'].value.x =
      1 / (canvas.offsetWidth * window.devicePixelRatio);
    fxaa.material.uniforms['resolution'].value.y =
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
          avatar.ui.activeBone = bone;
        }
      });
    };
  }

  public get avatarsIterator() {
    return Object.values(this.avatars);
  }

  public get objectsIterator() {
    return Object.values(this.gltfObjects);
  }

  public get vrms() {
    return this.avatars;
  }

  public async serializeScene() {
    const size = this.renderer.getSize(new THREE.Vector2());

    const scene: VirseScene = {
      vrms: Object.fromEntries(
        await Promise.all(
          Object.entries(this.avatars).map(async ([uid, { avatar }]) => [
            uid,
            new Uint8ClampedArray(await avatar.vrmBin!.arrayBuffer()),
          ])
        )
      ),
      gltfObjects: Object.fromEntries(
        await Promise.all(
          Object.entries(this.gltfObjects).map(async ([uid, { obj }]) => [
            uid,
            {
              name: obj.name,
              bin: new Uint8ClampedArray(await obj.gltfBin!.arrayBuffer()),
            },
          ])
        )
      ),

      canvas: {
        width: size.x,
        height: size.y,
        background: {
          color: this.renderer
            .getClearColor(new THREE.Color())
            .toArray() as Vector3Tuple,
          alpha: this.renderer.getClearAlpha(),
        },
      },
      camera: {
        mode: this.camMode,
        fov: this.pCam.fov,
        zoom: this.activeCamera.zoom,
        target: this.orbitControls.target.toArray(),
        position: this.activeCamera.position.toArray(),
        quaternion: this.activeCamera.quaternion.toArray() as Vector4Tuple,
      },
      poses: Object.fromEntries(
        Object.entries(this.avatars).map(([uid, { avatar }]) => [
          uid,
          {
            rootPosition: {
              position: avatar.positionBone.position.toArray(),
              quaternion:
                avatar.positionBone.quaternion.toArray() as Vector4Tuple,
            },
            vrmExpressions: Object.values(VRMExpressionPresetName).reduce(
              (ac, name) => {
                ac[name] = avatar.vrm.expressionManager!.getValue(name);
                return ac;
              },
              Object.create(null)
            ),
            morphs: Object.entries(avatar.blendshapes ?? {}).reduce(
              (ac, [name, proxy]) => {
                ac[name] = proxy.value;
                return ac;
              },
              Object.create(null)
            ),
            bones: (() => {
              const bones: Bone[] = [];

              avatar.vrm.scene.traverse((o) => {
                if ((o as any).isBone) bones.push(o as any);
              });

              return bones.reduce((ac, b) => {
                ac[b.name] = {
                  position: b.position.toArray(),
                  quaternion: b.quaternion.toArray(),
                };
                return ac;
              }, Object.create(null));
            })(),
          },
        ])
      ),
      objects: Object.fromEntries(
        Object.entries(this.gltfObjects).map(([uid, { obj: ui }]) => [
          uid,
          {
            position: ui.rootBone.position.toArray(),
            quaternion: ui.rootBone.quaternion.toArray() as Vector4Tuple,
            scale: ui.rootBone.scale.toArray(),
          },
        ])
      ),
    };

    return scene;
  }

  public async loadScene(data: VirseScene) {
    this.#activeAvatarUid = null;
    this.#activeTarget = null;

    Object.values(this.avatars).map((avatar) => {
      avatar.avatar.dispose();
      delete this.avatars[avatar.uid];
    });

    Object.values(this.gltfObjects).map((obj) => {
      obj.obj.dispose();
      delete this.gltfObjects[obj.uid];
    });

    console.info('🧘‍♀️ Load virse scene', data);

    const { vrms, gltfObjects, canvas, camera, poses, objects } = data;

    this.setSize(canvas.width, canvas.height);
    canvas.background &&
      this.setBackgroundColor({
        r: canvas.background.color[0] * 255,
        g: canvas.background.color[1] * 255,
        b: canvas.background.color[2] * 255,
        a: canvas.background.alpha,
      });
    this.setCamMode(camera.mode, camera);

    const uidMap: { [old: string]: string } = {};

    await Promise.all(
      Object.entries(vrms).map(async ([uid, vrmBin]) => {
        const blob = new Blob([vrmBin], { type: 'model/gltf+json' });
        const url = URL.createObjectURL(blob);
        const avatar = await this.loadVRM(url);
        URL.revokeObjectURL(url);

        uidMap[uid] = avatar.uid;

        avatar.avatar.positionBone.position.fromArray(
          poses[uid].rootPosition.position
        );
        avatar.avatar.positionBone.quaternion.fromArray(
          poses[uid].rootPosition.quaternion
        );
      })
    );

    const objUidMap: { [old: string]: string } = {};

    if (gltfObjects) {
      let objCount = 0;

      await Promise.all(
        Object.entries(gltfObjects).map(async ([uid, entity]) => {
          let name: string = `Object ${objCount++}`;
          let bin: Uint8Array;

          if ('name' in entity) {
            bin = entity.bin;
            name = entity.name;
          } else {
            bin = entity;
          }

          const blob = new Blob([bin], { type: 'model/gltf+json' });
          const url = URL.createObjectURL(blob);
          const obj = await this.loadGltf(url, name);
          URL.revokeObjectURL(url);

          objUidMap[uid] = obj.uid;

          obj.obj.rootBone.position.fromArray(objects[uid].position);
          obj.obj.rootBone.quaternion.fromArray(objects[uid].quaternion);
          obj.obj.rootBone.scale.fromArray(objects[uid].scale);
        })
      );
    }

    Object.entries(poses).forEach(([uid, pose]) => {
      const avatar = this.avatars[uidMap[uid]].avatar;

      avatar.positionBone.position.fromArray(pose.rootPosition.position);
      avatar.positionBone.quaternion.fromArray(pose.rootPosition.quaternion);

      Object.entries(pose.vrmExpressions as Record<string, number>).forEach(
        ([name, value]) => {
          avatar.vrm.expressionManager!.setValue(name as any, value);
        }
      );

      Object.entries(pose.morphs as Record<string, number>).forEach(
        ([name, value]) => {
          avatar.blendshapes![name]!.value = value;
        }
      );

      Object.entries(
        pose.bones as Record<
          string,
          {
            position: Vector3Tuple;
            quaternion: Vector4Tuple;
          }
        >
      ).forEach(([name, { position, quaternion }]) => {
        const bone = avatar.vrm.scene.getObjectByName(name) as Bone;
        bone.position.fromArray(position);
        bone.quaternion.fromArray(quaternion);
      });
    });

    this.events.emit('updated');

    return { canvas, camera };
  }

  public dispose() {
    Object.values(this.avatars).map((avatar) => {
      avatar.ui.dispose();
      VRMUtils.deepDispose(avatar.vrm.scene);
      this.rootScene.remove(avatar.vrm.scene);
    });

    Object.values(this.gltfObjects).map((obj) => {
      obj.obj.dispose();
      this.rootScene.remove(obj.obj.rootBone);
    });

    this.orbitControls.dispose();
    this.renderer.dispose();
    this.events.all.clear();
  }

  public get enablePhys() {
    return this.#enablePhys;
  }

  public set enablePhys(enable: boolean) {
    this.#enablePhys = enable;
  }

  public setCamMode(
    mode?: CamModes,
    opt: {
      fov?: number;
      zoom?: number;
      position?: Vector3Tuple;
      target?: Vector3Tuple;
      position0?: Vector3Tuple;
      rotation?: Vector3Tuple;
      quaternion?: Vector4Tuple;
    } = {}
  ) {
    this.orbitControls.dispose();

    mode ??= this.camMode === 'perspective' ? 'orthographic' : 'perspective';

    const cam = (this.activeCamera =
      mode === 'perspective' ? this.pCam : this.oCam);

    // this.activeCamera.position.set(0.0, 1.4, 0.7);
    if (opt.fov != null) this.camFov = opt.fov;
    if (opt.zoom != null) cam.zoom = opt.zoom;
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

    this.orbitControls.dispose();
    this.orbitControls = new OrbitControls(cam, this.canvas);
    this.orbitControls.screenSpacePanning = true;
    this.orbitControls.target.fromArray(opt.target ?? [0.0, 1.4, 0.0]);
    this.orbitControls.update();

    this.orbitControls.addEventListener('start', () => {
      this.events.emit('cameraChangeStart');
    });
    this.orbitControls.addEventListener('end', () => {
      this.events.emit('cameraChanged');
    });

    this.passes.render.camera = this.activeCamera;

    this.events.emit('updated');
  }

  public get camFov() {
    return this.pCam.fov;
  }

  public set camFov(fov: number) {
    this.pCam.fov = fov;
    this.pCam.updateProjectionMatrix();
    this.orbitControls.update();
    this.events.emit('updated');
  }

  public get camZoom() {
    return this.activeCamera.zoom;
  }

  public set camZoom(zoom: number) {
    this.activeCamera.zoom = zoom;
    this.activeCamera.updateProjectionMatrix();
    this.orbitControls.update();
    this.events.emit('updated');
  }

  public get camMode(): CamModes {
    return this.activeCamera instanceof PerspectiveCamera
      ? 'perspective'
      : 'orthographic';
  }

  public get boneControlMode(): 'rotate' | 'translate' {
    if (!this.#activeTarget) return 'rotate';

    if (this.#activeTarget.type === 'avatar') {
      return this.avatars[this.#activeTarget.uid].ui.fkControlMode;
    } else if (this.#activeTarget.type === 'object') {
      return this.gltfObjects[this.#activeTarget.uid].obj.controlMode;
    }
  }

  public set boneControlMode(mode: string) {
    Object.values(this.avatars).map((o) => {
      o.ui.fkControlMode = mode as any;
      o.ui.setAxis('all');
    });

    Object.values(this.gltfObjects).map((o) => {
      o.obj.controlMode = mode as any;
      o.obj.setAxis('all');
    });
  }

  public get activeTarget() {
    if (!this.#activeTarget) return null;

    if (this.#activeTarget.type === 'avatar') {
      return this.avatars[this.#activeTarget.uid];
    } else if (this.#activeTarget.type === 'object') {
      return this.gltfObjects[this.#activeTarget.uid];
    }
  }

  /** @deprecated Use activeTarget instead */
  public get activeAvatar() {
    return this.#activeTarget?.type === 'avatar'
      ? this.avatars[this.#activeTarget.uid]
      : null;
  }

  public getAvatar(uid: string): AvatarData | undefined {
    return this.avatars[uid];
  }

  /** @deprecated */
  public setActiveAvatar(uid: string) {
    if (!this.avatars[uid]) return;
    this.setActiveTarget(uid);
  }

  /** @deprecated */
  public setActiveObject(uid: string) {
    if (!this.gltfObjects[uid]) return;
    this.setActiveTarget(uid);
  }

  public setActiveTarget(uid: string) {
    if (this.avatars[uid]) {
      this.#activeAvatarUid = uid;
      this.#activeTarget = { type: 'avatar', uid };

      this.avatarsIterator.forEach((avatar) => {
        avatar.ui.setVisible(avatar.uid === uid && this.#showBones);
        avatar.ui.setEnableControll(avatar.uid === uid);
      });

      this.objectsIterator.forEach((o) => {
        o.obj.setVisible(false);
        o.obj.setEnableControll(false);
      });

      this.events.emit('updated');
    } else if (this.gltfObjects[uid]) {
      this.#activeAvatarUid = null;
      this.#activeTarget = { type: 'object', uid };

      this.avatarsIterator.forEach((avatar) => {
        avatar.ui.setVisible(false);
        avatar.ui.setEnableControll(false);
      });

      this.objectsIterator.forEach((o) => {
        o.obj.setVisible(o.uid === uid);
        o.obj.setEnableControll(o.uid === uid);
      });

      this.events.emit('updated');
    }
  }

  public setShowBones(visible: boolean) {
    this.#showBones = visible;

    this.avatarsIterator.forEach((avatar) => {
      avatar.ui.setVisible(avatar.uid === this.#activeAvatarUid && visible);
    });

    this.objectsIterator.forEach((o) => {
      o.obj.setVisible(o.uid === this.#activeTarget?.uid && visible);
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
    this.passes.fxaa.material.uniforms['resolution'].value.x =
      1 / (w * window.devicePixelRatio);
    this.passes.fxaa.material.uniforms['resolution'].value.y =
      1 / (h * window.devicePixelRatio);
    this.passes.render.setSize(w, h);
    this.composer.setSize(w, h);

    const size = fit(
      { width: window.innerWidth, height: window.innerHeight },
      this.#size,
      'contain'
    );
    this.canvas.style.setProperty('width', `${size.width}px`);
    this.canvas.style.setProperty('height', `${size.height}px`);
  }

  public getSize() {
    return { ...this.#size };
  }

  public get backgroundColor() {
    return this.#backgroundColor;
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
    this.#backgroundColor = { r, g, b, a };
    this.events.emit('updated');
  }

  public removeAvatar(uid: string) {
    const avatar = this.avatars[uid];
    if (!avatar) return;

    if (this.#activeAvatarUid === avatar.uid) {
      this.#activeAvatarUid = null;
      this.#activeTarget = null;
    }

    avatar.avatar.dispose();
    delete this.avatars[uid];

    this.events.emit('updated');
  }

  public async loadVRM(url: string) {
    // {
    //   Object.values(this.avatars).forEach(({ avatar }) => {
    //     this.rootScene.remove(avatar.vrm.scene);
    //     VRMUtils.deepDispose(avatar.vrm.scene);
    //   });

    //   this.avatars = {};
    // }

    Object.values(this.avatars).forEach(({ avatar }) => {
      avatar.ui.setEnableControll(false);
    });

    const avatar = new Avatar(this);
    await avatar.loadVRM(url);

    avatar.ui.setVisible(this.#showBones);

    avatar.ui.events.on('boneChanged', () => {
      this.events.emit('updated');
    });

    avatar.ui.events.on('boneHoverChanged', ({ bone }) => {
      this.events.emit('boneHoverChanged', bone);
      this.events.emit('updated');
    });

    avatar.ui.events.on('dragChange', ({ dragging }) => {
      this.orbitControls.enabled = !dragging;
    });

    avatar.events.on('updated', () => this.events.emit('updated'));

    avatar.kalidokit?.events.on('statusChanged', () => {
      this.events.emit('updated');
    });

    avatar.events.on('historyPushed', (entry) => {
      this.history.push({
        undo: () => {
          this.setActiveTarget(uid);
          entry.undo();
        },
        redo: () => {
          this.setActiveTarget(uid);
          entry.redo();
        },
      });
    });

    const uid = nanoid();
    this.avatars[uid] = {
      type: 'avatar',
      uid,
      avatar,
      get ui() {
        return avatar.ui;
      },
      get vrm() {
        return avatar.vrm;
      },
    };

    this.#activeAvatarUid = uid;
    this.events.emit('updated');

    return this.avatars[uid];
  }

  public async loadGltf(url: string, name: string) {
    const obj = new ObjectController(this);
    await obj.loadGltf(url, name);

    obj.events.on('dragChange', ({ dragging }) => {
      this.orbitControls.enabled = !dragging;
    });

    obj.events.on('selectChange', ({ selected }) => {
      if (selected) {
        this.setActiveObject(id);
      }
    });

    obj.events.on('updated', () => {
      this.events.emit('updated');
    });

    const id = nanoid();
    this.gltfObjects[id] = { type: 'object', uid: id, obj: obj };

    this.#activeTarget = { type: 'object', uid: id };
    this.setActiveObject(id);
    this.events.emit('updated');

    return this.gltfObjects[id];
  }

  public resetCamera() {
    this.pCam.position.set(0.0, 1.3, 3);
    this.pCam.rotation.set(0.0, Math.PI, 0);
    this.pCam.zoom = 1;

    this.oCam.position.set(0.0, 1.4, 0);
    this.oCam.rotation.set(0, 0, 0, 'XYZ');
    this.oCam.position.set(0.0, 1.4, 0);
    this.oCam.zoom = 200;

    this.pCam.updateProjectionMatrix();
    this.oCam.updateProjectionMatrix();

    this.orbitControls.target.set(0.0, 1.0, 0.0);
    this.orbitControls.update();
  }

  public render() {
    try {
      const delta = this.clock.getDelta();

      // Update model to render physics
      Object.values(this.avatars).map(({ avatar }) => {
        avatar.update();
        avatar.ui.update();
        avatar.vrm.update(this.#enablePhys ? delta : 0);
      });

      // this.passes.distortion.enabled = this.enableEffect;

      // if (this.enableEffect) {
      // this.composer.render(this.clock.getDelta());
      // } else {
      this.renderer.render(this.rootScene, this.activeCamera);
      // }
    } catch (e) {
      console.error(e);
    }
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
