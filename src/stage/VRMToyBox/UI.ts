import { VRMSchema } from "@pixiv/three-vrm";
import * as THREE from "three";
import { Object3D } from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";
import { VirseStage } from "../VirseStage";
import { Avatar } from "./Avatar";
import { VRMFKManager } from "./FK";

export const setupIKController = (viewer: VirseStage, avatar: Avatar) => {
  const controls: TransformControls[] = [];

  const createControl = (attach: Object3D, ik: boolean = true) => {
    const c = new TransformControls(viewer.camera, viewer.canvas);
    c.size = 0.8;
    c.attach(attach);
    c.addEventListener("dragging-changed", (event) => {
      avatar.needIKSolve = ik && !!event.value;
      viewer.controls.enabled = !event.value;
    });
    return c;
  };

  avatar.vrmIK.ikChains.forEach((chain) => {
    const transCtrl = createControl(chain.goal, true);
    avatar.vrm.scene.add(transCtrl);
    controls.push(transCtrl);
  });

  {
    [
      VRMSchema.HumanoidBoneName.Hips,
      // VRMSchema.HumanoidBoneName.UpperChest,
    ].forEach((name) => {
      const obj = avatar.vrm.humanoid?.getBoneNode(name)!;

      const transCtrl = createControl(obj, true);
      avatar.vrm.scene.add(transCtrl);
      controls.push(transCtrl);
    });
  }

  // {
  //   const obj = avatar.vrm.scene.getObjectByName("Root")!;

  //   const ctrl = createControl(obj);
  //   avatar.vrm.scene.add(ctrl);
  //   controls.push(ctrl);
  // }

  {
    const vrmFKManager = new VRMFKManager(
      avatar.vrm,
      viewer.canvas,
      viewer.camera,
      viewer.controls
    );

    avatar.fkmanager = vrmFKManager;
  }

  // {
  //   // const obj = avatar.vrm.scene.position

  //   const transCtrl = new TransformControls(viewer.camera, viewer.canvas);
  //   transCtrl.size = 0.8;
  //   transCtrl.attach(
  //     avatar.vrm.humanoid?.getBoneNode(VRMSchema.HumanoidBoneName.Chest)!
  //   );
  //   transCtrl.addEventListener("dragging-changed", (event) => {
  //     viewer.controls.enabled = !event.value;
  //   });
  //   avatar.vrm.scene.add(transCtrl);
  //   controls.push(transCtrl);
  // }

  avatar.controls = controls;
};
