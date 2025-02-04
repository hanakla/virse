import { StoreApi, create } from 'zustand';

type PhotoboothStore = {
  loadedPoses: {
    [avatarUid: string]: { poseId: string | null; poseName: string };
  };
  getLoadedPose: (avatarUid: string) => {
    poseId: string | null;
    poseName: string;
  };
  get: StoreApi<PhotoboothStore>['getState'];
  set: StoreApi<PhotoboothStore>['setState'];
};

export const usePhotoboothStore = create<PhotoboothStore>((set, get) => ({
  loadedPoses: {
    '': {
      poseId: null,
      poseName: '',
    },
  },
  getLoadedPose: (avatarUid: string) => get().loadedPoses[avatarUid],
  get,
  set,
}));
