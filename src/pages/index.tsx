import { ComponentProps, memo, MouseEvent, useRef } from "react";
import { useVirseStage } from "../stage";
import { RiCamera2Line, RiLiveLine } from "react-icons/ri";
import { useFunc, useBindMousetrap, useStoreState } from "../utils/hooks";
import { useEffect } from "react";
import { useFleurContext } from "@fleur/react";
import { Packr } from "msgpackr";
import {
  EditorMode,
  editorOps,
  EditorStore,
  POSE_SCHEMA,
  POSESET_SCHEMA,
  VirseProject,
} from "../domains/editor";
import {
  useDrop,
  useEffectOnce,
  useLocalStorage,
  useMount,
  useUpdate,
} from "react-use";
import Head from "next/head";
import { useContextMenu } from "react-contexify";
import "react-contexify/dist/ReactContexify.css";
import { useModalOpener } from "@fleur/mordred";
import { LoadPose } from "../modals/LoadPose";
import { PhotoBooth } from "../features/photobooth";
import { LiveBooth } from "../features/livebooth";
import { useRouter } from "next/router";
import { Link } from "../components/Link";
import { ConfirmAgreement } from "../modals/ConrirmAgreement";
import { fitAndPosition } from "object-fit-math";
import { shallowEquals } from "../utils/object";
import { LoadProjectOption } from "../modals/LoadProjectOption";
import { usePhotoboothStore } from "@/features/photobooth/photoboothStore";
import { twx } from "@/utils/twx";

export default function Home() {
  const router = useRouter();
  const rerender = useUpdate();
  const { openModal } = useModalOpener();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [isAgreed, setAgreement] = useLocalStorage("virseAgreement", false);

  const { show: showContextMenu, hideAll } = useContextMenu({});

  const stage = useVirseStage(canvasRef);
  const photoboothStore = usePhotoboothStore();

  const { executeOperation, getStore } = useFleurContext();
  const { mode, menuOpened, poses, photoModeState, modelIndex } = useStoreState(
    (get) => ({
      ...get(EditorStore),
    }),
  );

  /////
  //// UI Event Handlers
  /////
  const handleSceneContextMenu = useFunc((e: MouseEvent<HTMLCanvasElement>) => {
    const poseId = parseInt(e.currentTarget.dataset.poseId!);

    showContextMenu({
      event: e,
      id: "scene",
      props: {
        poseId,
      },
    });
  });

  /////
  ///// Keyboard shortcut
  /////

  useBindMousetrap(
    [
      {
        keys: "tab",
        preventDefault: true,
        handler: (e) => {
          const { menuOpened } = getStore(EditorStore).state;
          executeOperation(editorOps.setMenuOpened, !menuOpened);
        },
      },
    ],
    undefined,
    rootRef,
  );

  /////
  //// Another
  /////
  useDrop({
    onFiles: async ([file]) => {
      const url = URL.createObjectURL(file);

      if (file.name.endsWith(".vrm")) {
        executeOperation(editorOps.addVrm, file);
        stage!.loadVRM(url);
      } else if (file.name.endsWith(".gltf") || file.name.endsWith(".glb")) {
        stage!.loadGltf(url, file.name);
      } else if (file.name.endsWith(".virse")) {
        const options = await openModal(LoadProjectOption, {});
        if (!options) return;

        const buf = await file.arrayBuffer();
        const bin = new Uint8Array(buf);
        const packr = new Packr({ structuredClone: true });
        const data: VirseProject = packr.unpack(bin);

        photoboothStore.set({
          loadedPoses: data.selectedPoses ?? {},
        });

        if (options.loadPoseSet && data.poseset) {
          executeOperation(editorOps.importPoseSet, data.poseset, {
            clear: options.clearCurrentPoses,
          });
        }

        stage?.loadScene(data);
      } else if (file.name.endsWith(".json")) {
        const json = JSON.parse(await file.text());

        if (json.poseset) {
          const parsed = POSESET_SCHEMA.safeParse(json);
          console.log(parsed, await POSESET_SCHEMA.parse(json));
          if (!parsed.success) return;

          const result = await openModal(LoadPose, {
            poses: parsed.data.poseset,
          });
          if (!result) return;

          executeOperation(editorOps.importPoseSet, result.poses, {
            clear: result.clearPoseSet,
          });
        } else {
          const parsed = POSE_SCHEMA.safeParse(json);
          console.log(parsed);
          if (!parsed.success) return;

          executeOperation(editorOps.savePose, parsed.data);
        }
      }
    },
  });

  useMount(async () => {
    executeOperation(editorOps.loadPoses);
    executeOperation(editorOps.loadVrms);
  });

  useEffect(() => {
    if (!stage) return;
    stage.events.on("boneChanged", rerender);

    return () => {
      stage.events.off("boneChanged", rerender);
    };
  }, [stage]);

  useEffect(() => {
    if (!stage) return;

    executeOperation(
      editorOps.loadVrmBin,
      "4b45a65eace31e24192c09717670a3a02a4ea16aa21b7a6a14ee9c9499ba9f0e",
      (blob) => {
        const url = URL.createObjectURL(blob);
        stage.loadVRM(url);
      },
    );
  }, [stage]);

  useEffect(() => {
    let id: number;
    let latestSyncTime: number = 0;
    let prevSize: number[] | null = null;
    let windowSize: { width: number; height: number } | null = null;

    const onResize = () => {
      windowSize = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    };

    window.addEventListener("resize", onResize, { passive: true });

    id = requestAnimationFrame(function updatePosition() {
      id = requestAnimationFrame(updatePosition);

      const canvas = canvasRef.current;
      const size = stage?.getSize();

      if (!canvas || !size || !windowSize) return;

      const deps = [
        windowSize!.width,
        windowSize!.height,
        size.width,
        size.height,
      ];

      if (shallowEquals(prevSize, deps)) return;
      if (Date.now() - latestSyncTime < 1000) return;

      // console.log('updatePosition', deps);

      prevSize = deps;
      latestSyncTime = Date.now();

      const result = fitAndPosition(
        { width: windowSize.width, height: windowSize.height },
        {
          width: size.width,
          height: size.height,
        },
        "contain",
        "50%",
        "50%",
      );

      canvas.style.left = `${result.x}px`;
      canvas.style.top = `${result.y}px`;
      canvas.style.width = `${result.width}px`;
      canvas.style.height = `${result.height}px`;
    });

    onResize();

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(id);
    };
  });

  // useEffect(() => {
  //   const cancelContextMenu = (e: Event) => e.preventDefault();

  //   window.addEventListener('click', hideAll);
  //   window.addEventListener('contextmenu', cancelContextMenu);

  //   return () => {
  //     window.addEventListener('click', hideAll);
  //     window.addEventListener('contextmenu', cancelContextMenu);
  //   };
  // }, []);

  useEffectOnce(() => {
    if (isAgreed) return;

    openModal(ConfirmAgreement, {}).then(() => {
      setAgreement(true);
    });
  });

  return (
    <div ref={rootRef} className="relative flex size-full bg-[#fafafa] min-h-0">
      <Head>
        <title>Virse</title>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </Head>

      <div
        id="ui"
        tabIndex={-1}
        className="absolute flex flex-col size-full pointer-events-none outline-none [&:is(:focus,:active)]:outline-none"
      >
        <nav
          className="relative z-[1] flex justify-start px-6 bg-white/80 shadow-[0_4px_5px_rgba(170,170,170,0.1)] [backdrop-filter:url(#glass_filter)] select-none pointer-events-auto transition-transform"
          style={{
            transform: menuOpened ? "translateY(0)" : "translateY(-100%)",
          }}
        >
          <NavItem
            active={mode === EditorMode.photo}
            onClick={() =>
              executeOperation(editorOps.setMode, EditorMode.photo)
            }
          >
            <RiCamera2Line className="mr-2 text-2xl" />
            Photo
          </NavItem>
          <NavItem
            active={mode === EditorMode.live}
            onClick={() => executeOperation(editorOps.setMode, EditorMode.live)}
          >
            <RiLiveLine className="mr-2 text-2xl" />
            Live
          </NavItem>

          <div className="inline-flex items-center justify-center ml-auto p-1 text-xs">
            <div className="mr-4">
              <Link href="/" aria-disabled={router.locale === "ja"} locale="ja">
                JA
              </Link>
              <span className="inline-block mx-1">￤</span>
              <Link href="/" aria-disabled={router.locale === "en"} locale="en">
                EN
              </Link>
            </div>
            <span className="p-1 text-white text-center bg-[#34c0b9] rotate-z-[4deg]">
              <span className="rotate-z-[-4deg]">V I R S E</span>
            </span>
          </div>
        </nav>

        <canvas
          ref={canvasRef}
          tabIndex={-1}
          className="absolute top-0 left-0 size-full m-auto align-bottom shadow-[0_0_5px_rgba(170,170,170,0.4)] select-none pointer-events-auto"
          onContextMenu={handleSceneContextMenu}
        />

        <div className="relative flex size-full flex-1">
          {mode === EditorMode.photo ? (
            <PhotoBooth stage={stage} />
          ) : (
            <LiveBooth stage={stage} />
          )}
        </div>
      </div>
    </div>
  );
}

const NavItem = memo(function NavItem({
  active,
  className,
  ...props
}: ComponentProps<"div"> & { active: boolean }) {
  return (
    <div
      {...props}
      className={twx(
        "inline-flex items-center justify-center p-2 text-[#34c0b9] text-xs uppercase select-none cursor-pointer",
        "hover:text-[#34c0b9] hover:bg-gray-400/30",
        active && "text-white bg-[#34c0b9] hover:text-white hover:bg-[#23a8a2]",
        className,
      )}
    />
  );
});
