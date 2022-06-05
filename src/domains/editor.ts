import { minOps } from "@fleur/fleur";
import { DBSchema, openDB } from "idb";
import blobToHash from "blob-to-hash";
import { VRM, VRMSchema } from "@pixiv/three-vrm";
import { WebIO } from "@gltf-transform/core";

type State = {
  mode: EditorMode;
  menuOpened: boolean;
  poses: VirsePose[];
  modelIndex: VirseDBModelIndex[];
  photoModeState: {
    currentPoseKey: number | null;
    visibleBones: boolean;
  };
};

export type VirsePose = {
  id: number;
  name: string;
  canvas: any;
  camera: any;
  blendShapeProxies: any;
  morphs: any;
  bones: any;
};

export type UnsavedVirsePose = Omit<VirsePose, "id">;

export enum EditorMode {
  photo = "photo",
  live = "live",
}

const STORE_NAME = "poses";

export const [EditorStore, editorOps] = minOps("Editor", {
  initialState: (): State => ({
    mode: EditorMode.photo,
    menuOpened: true,
    poses: [],
    modelIndex: [],
    photoModeState: {
      currentPoseKey: null,
      visibleBones: true,
    },
  }),
  ops: {
    setMode(x, mode: EditorMode) {
      x.commit({ mode });
    },
    setMenuOpened(x, opened: boolean) {
      x.commit({ menuOpened: opened });
    },
    setPhotoModeState(x, photoModeState: State["photoModeState"]) {
      x.commit((draft) => {
        Object.assign(draft.photoModeState, photoModeState);
      });
    },
    async loadVrmBin(x, id: string, cb: (file: Blob) => void) {
      const db = await connectIdb();
      x.finally(() => db.close());

      const result = await db.get("modelFile", id);
      if (!result) return;

      cb(result.bin);
    },
    async loadVrms(x) {
      const db = await connectIdb();
      x.finally(() => db.close());

      const index = await db.getAll("modelIndex");
      x.commit({ modelIndex: index });
    },
    async addVrm(x, vrm: File) {
      const gltfBin = new Uint8Array(await vrm.arrayBuffer());
      const { json: gltfJson } = await new WebIO({
        credentials: "include",
      }).binaryToJSON(gltfBin);

      const meta = (gltfJson.extensions?.VRM as VRMSchema.VRM)?.meta;
      const name = meta?.title ?? vrm.name;
      const hash = await blobToHash("sha256", vrm, "hex");

      const db = await connectIdb();
      x.finally(() => db.close());
      x.finally(() => console.log("ok"));

      const indexTrans = db.transaction(
        ["modelIndex", "modelFile"],
        "readwrite"
      );

      await Promise.all([
        indexTrans
          .objectStore("modelIndex")
          .put({ hash, name, version: meta?.version ?? "" }),
        indexTrans.objectStore("modelFile").add({ hash, bin: vrm }),
        indexTrans.done,
      ]);

      await x.executeOperation(editorOps.loadVrms);
    },
    async deleteVrm(x, id: string) {
      const db = await connectIdb();
      x.finally(() => db.close());

      const trans = db.transaction(["modelIndex", "modelFile"], "readwrite");

      await Promise.all([
        trans.objectStore("modelIndex").delete(id),
        trans.objectStore("modelFile").delete(id),
        trans.done,
      ]);

      await x.executeOperation(editorOps.loadVrms);
    },
    async loadPoses(x) {
      const db = await connectIdb();
      x.finally(() => db.close());

      const poses = await db.getAll(STORE_NAME);
      const keys = await db.getAllKeys(STORE_NAME);

      const withIdPoses: VirsePose[] = poses.map((pose, idx) =>
        Object.assign(pose, { id: keys[idx] })
      );

      // console.log("loaded", withIdPoses);
      x.commit({ poses: withIdPoses });
    },
    async deletePose(x, id: number) {
      const db = await connectIdb();
      x.finally(() => db.close());

      await db.delete(STORE_NAME, id);
      db.close();

      await x.executeOperation(editorOps.loadPoses);
    },
    async savePose(x, pose: UnsavedVirsePose | VirsePose) {
      const db = await connectIdb();
      x.finally(() => db.close());

      const store = db.transaction(STORE_NAME, "readwrite");
      await store.store.add(pose);
      await store.done;
      db.close();

      await x.executeOperation(editorOps.loadPoses);
    },
  },
});

interface VirseDBSchema extends DBSchema {
  [STORE_NAME]: {
    key: number;
    value: UnsavedVirsePose;
  };
  modelIndex: {
    key: string;
    value: VirseDBModelIndex;
    indexes: { hash: "hash" };
  };
  modelFile: {
    key: string;
    value: { hash: string; bin: File };
    indexes: { hash: "hash" };
  };
}

type VirseDBModelIndex = { hash: string; name: string; version: string };

const connectIdb = async () => {
  const db = await openDB<VirseDBSchema>("virse", 2, {
    upgrade(db, old, next) {
      db.createObjectStore(STORE_NAME, { autoIncrement: true });

      db.createObjectStore("modelIndex", {
        autoIncrement: false,
        keyPath: "hash",
      });

      db.createObjectStore("modelFile", {
        autoIncrement: false,
        keyPath: "hash",
      });
    },
  });

  return db;
};
