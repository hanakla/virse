import { VRMHumanBoneName } from "@pixiv/three-vrm";

/**
 * ギズモを表示させたくないボーンの”子”ボーンを指定する
 *
 * 例） Hip > LeftUpperLeg  の場合はLeftUpperlegを指定
 */
export const ignoreBoneList: Array<VRMHumanBoneName> = [
  VRMHumanBoneName.Hips,
  VRMHumanBoneName.LeftUpperLeg,
  VRMHumanBoneName.RightUpperLeg,
  VRMHumanBoneName.LeftShoulder,
  VRMHumanBoneName.RightShoulder,
  VRMHumanBoneName.LeftEye,
  VRMHumanBoneName.RightEye,
  VRMHumanBoneName.RightThumbProximal,
  VRMHumanBoneName.RightIndexProximal,
  VRMHumanBoneName.RightRingProximal,
  VRMHumanBoneName.RightLittleProximal,
  VRMHumanBoneName.LeftThumbProximal,
  VRMHumanBoneName.LeftIndexProximal,
  VRMHumanBoneName.LeftRingProximal,
  VRMHumanBoneName.LeftLittleProximal,
];

/**
 * 終端ボーンにギズモを追加で表示させる
 *
 * 指先などは終端が明示されていないがギズモが欲しいので仮のボーンを表示させる
 */
export const needDummyBoneList: Array<VRMHumanBoneName> = [
  VRMHumanBoneName.Head,
  VRMHumanBoneName.LeftThumbDistal,
  VRMHumanBoneName.LeftIndexDistal,
  VRMHumanBoneName.LeftMiddleDistal,
  VRMHumanBoneName.LeftRingDistal,
  VRMHumanBoneName.LeftLittleDistal,
  VRMHumanBoneName.RightThumbDistal,
  VRMHumanBoneName.RightIndexDistal,
  VRMHumanBoneName.RightMiddleDistal,
  VRMHumanBoneName.RightRingDistal,
  VRMHumanBoneName.RightLittleDistal,
];
