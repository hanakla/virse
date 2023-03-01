import * as THREE from "three";
import { VRM, VRMHumanoid } from "@pixiv/three-vrm";
import * as IKSolver from "./ikSolver";
import { defaultIKConfig } from "./defaultIkConfig";

export class VrmIK {
  private _chains = new Array<IKSolver.IKChain>();
  private _iteration: number;

  constructor(vrm: VRM, ikConfig: IKSolver.IKConfig = defaultIKConfig) {
    ikConfig.chainConfigs.forEach((chainConfig) => {
      const ikChain = this._createIKChain(vrm, chainConfig);
      if (ikChain) {
        this._chains.push(ikChain);
      }
    });

    this._iteration = ikConfig.iteration || 1;
  }

  public get ikChains(): Array<IKSolver.IKChain> {
    return this._chains;
  }

  // TODO: updateの方が良い？
  public solve() {
    this._chains.forEach((chain) => {
      IKSolver.solve(chain, this._iteration);
    });
  }

  private _createIKChain(
    vrm: VRM,
    chainConfig: IKSolver.ChainConfig
  ): IKSolver.IKChain | null {
    if (!vrm.humanoid) return null;

    const goal = new THREE.Object3D();
    const effector = vrm.humanoid.getNormalizedBoneNode(
      chainConfig.effectorBoneName
    );
    if (!effector) return null;

    const joints = chainConfig.jointConfigs.map((jointConfig) => {
      return this._createJoint(vrm.humanoid!, jointConfig);
    });
    // nullを取り除く
    const filteredJoints = joints.filter(
      (joint): joint is IKSolver.Joint => joint !== null
    );

    effector.getWorldPosition(goal.position);
    vrm.scene.attach(goal);

    return {
      goal: goal,
      effector: effector,
      joints: filteredJoints,
    };
  }

  private _createJoint(
    vrmHumanoid: VRMHumanoid,
    jointConfig: IKSolver.JointConfig
  ): IKSolver.Joint | null {
    const bone = vrmHumanoid.getNormalizedBoneNode(jointConfig.boneName);
    if (!bone) return null;

    return {
      bone: bone,
      order: jointConfig.order,
      rotationMin: jointConfig.rotationMin,
      rotationMax: jointConfig.rotationMax,
    };
  }
}
