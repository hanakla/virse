import { RefObject, useEffect, useMemo, useRef } from "react";
import { useObjectState } from "@hanakla/arma";
import { VirseStage, CamModes } from "./VirseStage";
import { useUpdate } from "react-use";
import { Color } from "three";

export const useVirseStage = (canvas: RefObject<HTMLCanvasElement | null>) => {
  const rerender = useUpdate();
  const stage = useRef<VirseStage | null>(null);

  useEffect(() => {
    const { current } = stage;
    if (!current) return;

    const onUpdated = () => {
      console.log("updated");
      rerender();
    };

    current.events.on("updated", onUpdated);
    return () => current.events.off("updated", onUpdated);
  }, [stage.current]);

  useEffect(() => {
    // return;
    const s =
      ((window as any)._stage =
      stage.current =
        new VirseStage(canvas.current!));

    let animId = 0;
    animId = requestAnimationFrame(function update() {
      s.render();
      requestAnimationFrame(update);
    });

    return () => {
      cancelAnimationFrame(animId);
      s.dispose();
      stage.current = null;
    };
  }, []);

  return useMemo(
    () => ({
      stage: stage.current!,
      get camMode() {
        return stage.current?.camMode;
      },
      setCamMode: (mode?: CamModes) => {
        const nextMode =
          mode ?? stage.current?.camMode === "perspective"
            ? "orthographic"
            : "perspective";

        stage.current!.setCamMode(nextMode);
      },
      setDisplayBones: (visible: boolean) =>
        stage.current!.setDisplayBones(visible),
      setControlMode: (mode: string) => stage.current?.setControlMode(mode),
      setBackgroundColor: ({
        r,
        g,
        b,
        a,
      }: {
        r: number;
        g: number;
        b: number;
        a: number;
      }) => {
        console.log({ r, g, b, a });
        stage.current!.renderer.setClearColor(
          new Color(r / 255, g / 255, b / 255)
        );
        stage.current!.renderer.setClearAlpha(a);
      },
      get vrms() {
        return stage.current?.vrms || {};
      },
    }),
    [stage.current]
  );
};

// export const useVirseStage = (canvas: RefObject<HTMLCanvasElement | null>) => {
//   const vrm = useRef<VRM | null>(null);
//   const renderer = useRef<WebGLRenderer | null>(null);
//   const camera = useRef<
//     THREE.PerspectiveCamera | THREE.OrthographicCamera | null
//   >(null);
//   const controls = useRef<OrbitControls | null>(null);

//   const [state, setState] = useState<{ camera: CamModes }>({
//     camera: "perspective",
//   });

//   useEffect(() => {
//     controls.current?.dispose();

//     if (state.camera === "perspective") {
//       camera.current = new THREE.PerspectiveCamera(
//         10,
//         window.innerWidth / window.innerHeight,
//         0.1,
//         1000
//       );
//     } else {
//       camera.current = new THREE.OrthographicCamera(
//         window.innerWidth / -2,
//         window.innerWidth / 2,
//         window.innerHeight / 2,
//         window.innerHeight / -2,
//         0.01,
//         2000
//       );

//       camera.current.zoom = 200;
//     }

//     camera.current.position.set(0.0, 1.4, 0.7);
//     camera.current.updateProjectionMatrix();

//     const vec = new THREE.Vector3();
//     vrm.current?.humanoid
//       ?.getBone(VRMSchema.HumanoidBoneName.Head)
//       ?.node.getWorldPosition(vec);
//     console.log(vec);
//     camera.current.lookAt(vec);

//     controls.current = new OrbitControls(camera.current, canvas.);
//     controls.current.screenSpacePanning = true;
//     controls.current.target.set(0.0, 1.4, 0.0);
//     controls.current.update();
//   }, [state.camera, canvas]);

//   // useEffect(() => {
//   //   const onResize = () => {
//   //     renderer.setSize(window.innerWidth, window.innerHeight, true);

//   //     if (camera.current instanceof THREE.PerspectiveCamera) {
//   //       camera.current.aspect = window.innerWidth / window.innerHeight;
//   //     } else if (camera.current instanceof THREE.OrthographicCamera) {
//   //       camera.current.left = -window.innerWidth / 2;
//   //       camera.current.right = window.innerWidth / 2;
//   //       camera.current.top = window.innerHeight / 2;
//   //       camera.current.bottom = -window.innerHeight / 2;
//   //     }

//   //     camera.current?.updateProjectionMatrix();
//   //   };

//   //   window.addEventListener("resize", onResize, { passive: true });

//   //   return () => {
//   //     window.removeEventListener("resize", onResize);
//   //   };
//   // }, []);

//   useEffect(() => {
//     let animId = 0;
//     // let r: WebGLRenderer | null = null;

//     // (async () => {
//     //   // renderer
//     //   // r = renderer.current = new THREE.WebGLRenderer({
//     //   //   alpha: true,
//     //   //   canvas: canvas.current!,
//     //   // });
//     //   // r.setSize(window.innerWidth, window.innerHeight);
//     //   // r.setPixelRatio(window.devicePixelRatio);

//     //   // camera
//     //   // const orbitCamera = (camera.current = new THREE.PerspectiveCamera(
//     //   //   10,
//     //   //   window.innerWidth / window.innerHeight,
//     //   //   0.1,
//     //   //   1000
//     //   // ));
//     //   // orbitCamera.position.set(0.0, 1.4, 0.7);

//     //   // // controls
//     //   // const orbitControls = (controls.current = new OrbitControls(
//     //   //   orbitCamera,
//     //   //   r.domElement
//     //   // ));
//     //   // orbitControls.screenSpacePanning = true;
//     //   // orbitControls.target.set(0.0, 1.4, 0.0);
//     //   // orbitControls.update();

//     //   // // scene
//     //   // const scene = new THREE.Scene();

//     //   // scene.add(new GridHelper(20, 20));

//     //   // // light
//     //   // const light = new THREE.DirectionalLight(0xffffff);
//     //   // light.position.set(1.0, 1.0, 1.0).normalize();
//     //   // scene.add(light);

//     //   // // Main Render Loop
//     //   // const clock = new THREE.Clock();

//     //   animId = requestAnimationFrame(function update() {
//     //     // Update model to render physics

//     //   });

//     //   {

//     //   }
//     // })();

//     return () => {
//       r!.dispose();
//       cancelAnimationFrame(animId);
//     };
//   }, []);

//   return useMemo(
//     () => ({
//       camMode: state.camera,
//       setCamMode: (mode?: CamModes) => {
//         setState((state) => ({
//           ...state,
//           camera:
//             mode == null
//               ? state.camera === "perspective"
//                 ? "orthographic"
//                 : "perspective"
//               : mode,
//         }));
//       },
//       setBackgroundColor: (color: string) => {
//         renderer.current?.setClearColor(color);
//       },
//     }),
//     [state]
//   );
// };
