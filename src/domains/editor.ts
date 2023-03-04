import { minOps } from "@fleur/fleur";
import { DBSchema, openDB } from "idb";
import blobToHash from "blob-to-hash";
import { VRM, VRMPose, VRMSchema } from "@pixiv/three-vrm";
import { WebIO } from "@gltf-transform/core";
import { nanoid } from "nanoid";

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
  uid: string;
  name: string;
  canvas: any;
  camera: any;
  blendShapeProxies: Record<string, number>;
  morphs: Record<string, { value: number }>;
  vrmPose: VRMPose;
  bones: any;
  createdAt: Date;
  schemaVersion: number | void;
};

export type UnsavedVirsePose = Omit<
  VirsePose,
  "uid" | "createdAt" | "updatedAt" | "schemaVersion"
>;

export enum EditorMode {
  photo = "photo",
  live = "live",
}

const POSE_STORE_NAME = "poses";

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

      const poses = await db.getAll(POSE_STORE_NAME);
      const keys = await db.getAllKeys(POSE_STORE_NAME);

      const withIdPoses: VirsePose[] = poses.map((pose, idx) =>
        Object.assign(pose, { id: pose.uid ?? idx })
      );

      x.commit({
        poses: withIdPoses.sort((a, b) =>
          // prettier-ignore
          a.name === b.name ?
            a.createdAt && b.createdAt ? +a.createdAt - +b.createdAt
            : a.uid - b.uid
          : a.name > b.name ? 1
          : -1
        ),
      });
    },
    async installPoseSet(
      x,
      poseSet: VirsePose[],
      { clear }: { clear: boolean }
    ) {
      const db = await connectIdb();
      x.finally(() => db.close());

      console.log(poseSet);

      if (clear) {
        db.clear(POSE_STORE_NAME);
      }

      for (const pose of poseSet) {
        await db.add(POSE_STORE_NAME, pose);
      }

      await x.executeOperation(editorOps.loadPoses);
    },
    async deletePose(x, uid: string) {
      const db = await connectIdb();
      x.finally(() => db.close());

      console.log(uid);

      const id = await db.getKeyFromIndex(POSE_STORE_NAME, "uid", uid);
      if (!id) return;

      await db.delete(POSE_STORE_NAME, id);
      db.close();

      await x.executeOperation(editorOps.loadPoses);
    },
    async savePose(
      x,
      pose: UnsavedVirsePose | VirsePose,
      { overwrite }: { overwrite?: boolean } = {}
    ) {
      const db = await connectIdb();
      x.finally(() => db.close());

      const tx = db.transaction(POSE_STORE_NAME, "readwrite");

      if (overwrite && "uid" in pose) {
        console.log("put");
        await tx.store.put({
          ...pose,
          schemaVersion: 2,
        });
      } else {
        await tx.store.add({
          ...pose,
          uid: nanoid(),
          createdAt: new Date(),
          schemaVersion: 2,
        });
      }

      await tx.done;

      await x.executeOperation(editorOps.loadPoses);
    },
  },
});

interface VirseDBSchema extends DBSchema {
  [POSE_STORE_NAME]: {
    key: string;
    value: UnsavedVirsePose & {
      uid: string;
      createdAt: Date;
      schemaVersion: number | void;
    };
    indexes: {
      uid: string;
    };
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
  const db = await openDB<VirseDBSchema>("virse", 1, {
    upgrade(db, old, next, tx) {
      if (old < 2) {
        db.createObjectStore(POSE_STORE_NAME, {
          autoIncrement: false,
          keyPath: "uid",
        });

        db.createObjectStore("modelIndex", {
          autoIncrement: false,
          keyPath: "hash",
        });

        db.createObjectStore("modelFile", {
          autoIncrement: false,
          keyPath: "hash",
        });
      }
    },
  });

  return db;
};
