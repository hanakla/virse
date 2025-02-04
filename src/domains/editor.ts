import { minOps } from '@fleur/fleur';
import { DBSchema, openDB } from 'idb';
import blobToHash from 'blob-to-hash';
import { VRMPose } from '@pixiv/three-vrm';
import { WebIO } from '@gltf-transform/core';
import { nanoid } from 'nanoid';
import { Vector3Tuple, Vector4Tuple } from 'three';
import { VirseScene } from '../stage/VirseStage';
import { z } from 'zod';

type State = {
  mode: EditorMode;
  menuOpened: boolean;
  poses: VirsePose[];
  modelIndex: VirseDBModelIndex[];
  photoModeState: {
    currentPoseKey: number | null;
    visibleBones: boolean;
  };
  latestSavedPoseUid: string | null;
};

export type VirseProject = VirseScene & {
  poseset: VirsePose[];
  selectedPoses: {
    [avatarUid: string]: {
      poseId: string | null;
      poseName: string;
    };
  };
};

export const POSE_SCHEMA = z.object({
  type: z.enum(['avatar', 'object']).optional(),
  uid: z.string(),
  name: z.string(),
  canvas: z.object({
    width: z.number(),
    height: z.number(),
  }),
  camera: z.object({
    fov: z.number(),
    mode: z.enum(['perspective', 'orthographic']),
    position: z.array(z.number()).length(3),
    quaternion: z.array(z.number()).length(4),
    rotation: z
      .tuple([z.number(), z.number(), z.number(), z.string()])
      .optional(),
    target: z.array(z.number()).length(3).optional(),
    zoom: z.number().optional(),
  }),
  blendShapeProxies: z.record(z.string(), z.number()),
  morphs: z.record(z.string(), z.object({ value: z.number() })),
  vrmVersion: z.enum(['1', '0']).optional(),
  vrmPose: z.record(z.string(), z.any()),
  bones: z.record(
    z.string(),
    z.object({
      position: z.array(z.number()).length(3),
      quaternion: z.array(z.number()).length(4),
      scale: z.array(z.number()).length(3).optional(),
    })
  ),
  rootPosition: z
    .object({
      position: z.array(z.number()).length(3),
      quaternion: z.array(z.number()).length(4),
      scale: z.array(z.number()).length(3).optional(),
    })
    .optional(),
  createdAt: z.date().optional(),
  schemaVersion: z
    .union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(undefined),
    ])
    .optional(),
});

export type VirsePose = z.infer<typeof POSE_SCHEMA>;

export const POSESET_SCHEMA = z.object({ poseset: z.array(POSE_SCHEMA) });
export type PoseSetSchema = z.infer<typeof POSESET_SCHEMA>;

export type UnsavedVirsePose = Omit<
  VirsePose,
  'uid' | 'createdAt' | 'updatedAt' | 'schemaVersion'
>;

export enum EditorMode {
  photo = 'photo',
  live = 'live',
}

const POSE_STORE_NAME = 'poses';
const LATEST_SCHEMA_VERSION = 4;

export const [EditorStore, editorOps] = minOps('Editor', {
  initialState: (): State => ({
    mode: EditorMode.photo,
    menuOpened: true,
    poses: [],
    modelIndex: [],
    photoModeState: {
      currentPoseKey: null,
      visibleBones: true,
    },
    latestSavedPoseUid: null,
  }),
  ops: {
    setMode(x, mode: EditorMode) {
      x.commit({ mode });
    },
    setMenuOpened(x, opened: boolean) {
      x.commit({ menuOpened: opened });
    },
    setPhotoModeState(x, photoModeState: State['photoModeState']) {
      x.commit((draft) => {
        Object.assign(draft.photoModeState, photoModeState);
      });
    },
    async loadVrmBin(x, id: string, cb: (file: Blob) => void) {
      const db = await connectIdb();
      x.finally(() => db.close());

      const result = await db.get('modelFile', id);
      if (!result) return;

      cb(result.bin);
    },
    async loadVrms(x) {
      const db = await connectIdb();
      x.finally(() => db.close());

      const index = await db.getAll('modelIndex');
      x.commit({ modelIndex: index });
    },
    async addVrm(x, vrm: File) {
      const gltfBin = new Uint8Array(await vrm.arrayBuffer());
      const { json: gltfJson } = await new WebIO({
        credentials: 'include',
      }).binaryToJSON(gltfBin);

      const meta = (gltfJson.extensions?.VRM as any)?.meta;
      const name = meta?.title ?? meta?.name ?? vrm.name;
      const hash = await blobToHash('sha256', vrm, 'hex');

      const db = await connectIdb();
      x.finally(() => db.close());

      const indexTrans = db.transaction(
        ['modelIndex', 'modelFile'],
        'readwrite'
      );

      await Promise.all([
        indexTrans
          .objectStore('modelIndex')
          .put({ hash, name, version: meta?.version ?? '' }),
        indexTrans.objectStore('modelFile').add({ hash, bin: vrm }),
        indexTrans.done,
      ]);

      await x.executeOperation(editorOps.loadVrms);
    },
    async deleteVrm(x, id: string) {
      const db = await connectIdb();
      x.finally(() => db.close());

      const trans = db.transaction(['modelIndex', 'modelFile'], 'readwrite');

      await Promise.all([
        trans.objectStore('modelIndex').delete(id),
        trans.objectStore('modelFile').delete(id),
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
    async importPoseSet(
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
        pose.createdAt ??= new Date();
        await db.add(POSE_STORE_NAME, pose);
      }

      await x.executeOperation(editorOps.loadPoses);
    },
    async deletePose(x, uid: string) {
      const db = await connectIdb();
      x.finally(() => db.close());

      await db.delete(POSE_STORE_NAME, uid);
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

      const tx = db.transaction(POSE_STORE_NAME, 'readwrite');

      let uid = nanoid();
      if (overwrite && 'uid' in pose) {
        await tx.store.put({
          ...pose,
          schemaVersion: LATEST_SCHEMA_VERSION,
        });
      } else {
        await tx.store.add({
          ...pose,
          uid,
          createdAt: new Date(),
          schemaVersion: LATEST_SCHEMA_VERSION,
        });
      }

      await tx.done;

      await x.executeOperation(editorOps.loadPoses);

      x.commit({ latestSavedPoseUid: uid });
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
    indexes: { hash: 'hash' };
  };
  modelFile: {
    key: string;
    value: { hash: string; bin: File };
    indexes: { hash: 'hash' };
  };
}

type VirseDBModelIndex = { hash: string; name: string; version: string };

const connectIdb = async () => {
  const db = await openDB<VirseDBSchema>('virse', 1, {
    upgrade(db, old, next, tx) {
      if (old < 2) {
        db.createObjectStore(POSE_STORE_NAME, {
          autoIncrement: false,
          keyPath: 'uid',
        });

        db.createObjectStore('modelIndex', {
          autoIncrement: false,
          keyPath: 'hash',
        });

        db.createObjectStore('modelFile', {
          autoIncrement: false,
          keyPath: 'hash',
        });
      }

      if (old < 3) {
        tx.objectStore(POSE_STORE_NAME).createIndex('uid', 'uid');
      }
    },
  });

  return db;
};
