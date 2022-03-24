import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { VRM, VRMSchema } from "@pixiv/three-vrm";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { GridHelper, WebGLRenderer } from "three";

type CamModes = "perspective" | "orthographic";

export const useVirseStage = (canvas: RefObject<HTMLCanvasElement | null>) => {
  const vrm = useRef<VRM | null>(null);
  const renderer = useRef<WebGLRenderer | null>(null);
  const camera = useRef<
    THREE.PerspectiveCamera | THREE.OrthographicCamera | null
  >(null);
  const controls = useRef<OrbitControls | null>(null);

  const [state, setState] = useState<{ camera: CamModes }>({
    camera: "perspective",
  });

  useEffect(() => {
    controls.current?.dispose();

    if (state.camera === "perspective") {
      camera.current = new THREE.PerspectiveCamera(
        10,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
    } else {
      camera.current = new THREE.OrthographicCamera(
        window.innerWidth / -2,
        window.innerWidth / 2,
        window.innerHeight / 2,
        window.innerHeight / -2,
        0.01,
        2000
      );

      camera.current.zoom = 200;
    }

    camera.current.position.set(0.0, 1.4, 0.7);
    camera.current.updateProjectionMatrix();

    const vec = new THREE.Vector3();
    vrm.current?.humanoid
      ?.getBone(VRMSchema.HumanoidBoneName.Head)
      ?.node.getWorldPosition(vec);
    console.log(vec);
    camera.current.lookAt(vec);

    controls.current = new OrbitControls(camera.current, canvas.current!);
    controls.current.screenSpacePanning = true;
    controls.current.target.set(0.0, 1.4, 0.0);
    controls.current.update();
  }, [state.camera, canvas]);

  useEffect(() => {
    const onResize = () => {
      renderer.current!.setSize(window.innerWidth, window.innerHeight, true);

      if (camera.current instanceof THREE.PerspectiveCamera) {
        camera.current.aspect = window.innerWidth / window.innerHeight;
      } else if (camera.current instanceof THREE.OrthographicCamera) {
        camera.current.left = -window.innerWidth / 2;
        camera.current.right = window.innerWidth / 2;
        camera.current.top = window.innerHeight / 2;
        camera.current.bottom = -window.innerHeight / 2;
      }

      camera.current?.updateProjectionMatrix();
    };

    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    let animId = 0;
    let r: WebGLRenderer | null = null;

    (async () => {
      // renderer
      r = renderer.current = new THREE.WebGLRenderer({
        alpha: true,
        canvas: canvas.current!,
      });
      r.setSize(window.innerWidth, window.innerHeight);
      r.setPixelRatio(window.devicePixelRatio);

      // camera
      const orbitCamera = (camera.current = new THREE.PerspectiveCamera(
        10,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      ));
      orbitCamera.position.set(0.0, 1.4, 0.7);

      // controls
      const orbitControls = (controls.current = new OrbitControls(
        orbitCamera,
        r.domElement
      ));
      orbitControls.screenSpacePanning = true;
      orbitControls.target.set(0.0, 1.4, 0.0);
      orbitControls.update();

      // scene
      const scene = new THREE.Scene();

      scene.add(new GridHelper(20, 20));

      // light
      const light = new THREE.DirectionalLight(0xffffff);
      light.position.set(1.0, 1.0, 1.0).normalize();
      scene.add(light);

      // Main Render Loop
      const clock = new THREE.Clock();

      animId = requestAnimationFrame(function update() {
        // Update model to render physics
        vrm.current?.update(clock.getDelta());
        r!.render(scene, camera.current!);
        animId = requestAnimationFrame(update);
      });

      {
        const loader = new GLTFLoader();
        const gltf = await new Promise<GLTF>((resolve, reject) =>
          loader.load("./test.vrm", resolve, undefined, reject)
        );
        vrm.current = await VRM.from(gltf);
        vrm.current.scene.rotation.y = Math.PI;
        scene.add(vrm.current.scene);
        console.log(vrm);
      }
    })();

    return () => {
      r!.dispose();
      cancelAnimationFrame(animId);
    };
  }, []);

  return useMemo(
    () => ({
      camMode: state.camera,
      setCamMode: (mode?: CamModes) => {
        setState((state) => ({
          ...state,
          camera:
            mode == null
              ? state.camera === "perspective"
                ? "orthographic"
                : "perspective"
              : mode,
        }));
      },
      setBackgroundColor: (color: string) => {
        renderer.current?.setClearColor(color);
      },
    }),
    [state]
  );
};
