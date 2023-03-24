import { Vector3 } from "three";
import { VRMHumanBoneName } from "@pixiv/three-vrm";
import { IKConfig } from "./ikSolver";

/*
example
{
    iteration:number,   // 反復回数
    chainConfigs:[      // IKチェイン
        {
            jointConfigs:[  // 手先から根本
                {},         // Effectorの親
                            // ||
                            // V
                {           // RootBone
                    boneName:  VRMHumanBoneName.Foo,
                    order: 'XYZ',   // 回転順序
                    rotationMin: new Vector3(-Math.PI,0,0)    // 最小 回転角制限  -Pi ~ Pi
                    rotationMax: new Vector3(Math.PI,0,0)    // 最大 回転角制限  -Pi ~ Pi
                }
            ],
            effectorBoneName:,
        },
    ]
}
*/

/**
 * デフォルトのIKチェーン及び、関節角度制限。
 * VRM0.xの必須ボーンのみで構成している
 */
export const defaultIKConfig: IKConfig = {
  iteration: 1,
  chainConfigs: [
    // Hip -> Head
    {
      jointConfigs: [
        {
          boneName: VRMHumanBoneName.Chest,
          order: "XYZ",
          rotationMin: new Vector3(-Math.PI, -Math.PI, -Math.PI),
          rotationMax: new Vector3(Math.PI, Math.PI, Math.PI),
        },
        {
          boneName: VRMHumanBoneName.Spine,
          order: "XYZ",
          rotationMin: new Vector3(-Math.PI, -Math.PI, -Math.PI),
          rotationMax: new Vector3(Math.PI, Math.PI, Math.PI),
        },
        {
          boneName: VRMHumanBoneName.Hips,
          order: "XYZ",
          rotationMin: new Vector3(-Math.PI, -Math.PI, -Math.PI),
          rotationMax: new Vector3(Math.PI, Math.PI, Math.PI),
        },
      ],
      effectorBoneName: VRMHumanBoneName.Neck,
    },
    // Left Shoulder -> Hand
    {
      jointConfigs: [
        {
          boneName: VRMHumanBoneName.LeftLowerArm,
          order: "YZX",
          rotationMin: new Vector3(0, -Math.PI, 0),
          rotationMax: new Vector3(0, -(0.1 / 180) * Math.PI, 0),
        },
        {
          boneName: VRMHumanBoneName.LeftUpperArm,
          order: "ZXY",
          rotationMin: new Vector3(-Math.PI / 2, -Math.PI, -Math.PI),
          rotationMax: new Vector3(Math.PI / 2, Math.PI, Math.PI),
        },
        {
          boneName: VRMHumanBoneName.LeftShoulder,
          order: "ZXY",
          rotationMin: new Vector3(
            0,
            -(45 / 180) * Math.PI,
            -(45 / 180) * Math.PI
          ),
          rotationMax: new Vector3(0, (45 / 180) * Math.PI, 0),
        },
      ],
      effectorBoneName: VRMHumanBoneName.LeftHand,
    },
    // Right Shoulder -> Hand
    {
      jointConfigs: [
        {
          boneName: VRMHumanBoneName.RightLowerArm,
          order: "YZX",
          rotationMin: new Vector3(0, (0.1 / 180) * Math.PI, 0),
          rotationMax: new Vector3(0, Math.PI, 0),
        },
        {
          boneName: VRMHumanBoneName.RightUpperArm,
          order: "ZXY",
          rotationMin: new Vector3(-Math.PI / 2, -Math.PI, -Math.PI),
          rotationMax: new Vector3(Math.PI / 2, Math.PI, Math.PI),
        },
        {
          boneName: VRMHumanBoneName.RightShoulder,
          order: "ZXY",
          rotationMin: new Vector3(0, -(45 / 180) * Math.PI, 0),
          rotationMax: new Vector3(
            0,
            (45 / 180) * Math.PI,
            (45 / 180) * Math.PI
          ),
        },
      ],
      effectorBoneName: VRMHumanBoneName.RightHand,
    },
    // Left Leg
    {
      jointConfigs: [
        {
          boneName: VRMHumanBoneName.LeftLowerLeg,
          order: "XYZ",
          rotationMin: new Vector3(-Math.PI, 0, 0),
          rotationMax: new Vector3(0, 0, 0),
        },
        {
          boneName: VRMHumanBoneName.LeftUpperLeg,
          order: "XYZ",
          rotationMin: new Vector3(-Math.PI, -Math.PI, -Math.PI),
          rotationMax: new Vector3(Math.PI, Math.PI, Math.PI),
        },
      ],
      effectorBoneName: VRMHumanBoneName.LeftFoot,
    },
    // Right Leg
    {
      jointConfigs: [
        {
          boneName: VRMHumanBoneName.RightLowerLeg,
          order: "XYZ",
          rotationMin: new Vector3(-Math.PI, 0, 0),
          rotationMax: new Vector3(0, 0, 0),
        },
        {
          boneName: VRMHumanBoneName.RightUpperLeg,
          order: "XYZ",
          rotationMin: new Vector3(-Math.PI, -Math.PI, -Math.PI),
          rotationMax: new Vector3(Math.PI, Math.PI, Math.PI),
        },
      ],
      effectorBoneName: VRMHumanBoneName.RightFoot,
    },
  ],
};
