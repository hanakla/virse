import { VertexLayout } from "@gltf-transform/core";
import { VRMSchema } from "@pixiv/three-vrm";
import * as THREE from "three";
import { Object3D } from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";
import { hasOwn } from "../../utils/lang";
import { VirseStage } from "../VirseStage";
import { Avatar } from "./Avatar";
import { VRMFKManager } from "./FK";

export class UI {
  private controllers: TransformControls[] = [];
  private fkManager: VRMFKManager;

  #displayBones = false;
  #focusedTo: "ik" | "fk" | null = null;
  #needUpdate = false;

  constructor(private viewer: VirseStage, private avatar: Avatar) {
    const createControl = (attach: Object3D, ik: boolean = true) => {
      const c = new TransformControls(viewer.activeCamera, viewer.canvas);
      c.size = 0.8;
      c.attach(attach);
      c.addEventListener("dragging-changed", (event) => {
        avatar.needIKSolve = ik && !!event.value;
        this.viewer.orbitControls.enabled = !event.value;
        this.#focusedTo = event.value ? "ik" : null;
      });
      return c;
    };

    avatar.vrmIK.ikChains.forEach((chain) => {
      const transCtrl = createControl(chain.goal, true);
      avatar.vrm.scene.add(transCtrl);
      this.controllers.push(transCtrl);
    });

    {
      [VRMSchema.HumanoidBoneName.Hips].forEach((name) => {
        const obj = avatar.vrm.humanoid?.getBoneNode(name)!;

        const transCtrl = createControl(obj, true);
        avatar.vrm.scene.add(transCtrl);
        this.controllers.push(transCtrl);
      });
    }

    {
      const obj = avatar.vrm.humanoid?.getBoneNode(
        VRMSchema.HumanoidBoneName.Hips
      )!;

      const ctrl = createControl(obj, false);
      ctrl.applyMatrix4(
        new THREE.Matrix4().makeTranslation(
          0,
          obj.getWorldPosition(new THREE.Vector3()).y * -1,
          0
        )
      );
      avatar.vrm.scene.add(ctrl);
      this.controllers.push(ctrl);
    }

    {
      this.fkManager = new VRMFKManager(
        avatar.vrm,
        viewer.canvas,
        viewer.activeCamera,
        {
          get current() {
            return viewer.orbitControls;
          },
        }
      );

      this.fkManager.events.on("focusChange", this.#handleFkFocusChange);
    }

    // {
    //   const skeleton = new THREE.SkeletonHelper(avatar.vrm.scene);
    //   avatar.vrm.scene.add(skeleton);
    //   this.objects.push(skeleton);
    // }
  }

  #handleFkFocusChange = (focused: boolean) => {
    this.#focusedTo = focused ? "fk" : null;
    this.#needUpdate = true;
  };

  public dispose() {
    this.controllers.forEach((c) => c.dispose());
    this.fkManager.dispose();
  }

  public ikControlMode(mode: any) {
    this.controllers.map((o) => {
      o.setMode(mode);
    });
  }

  public update() {
    if (!this.#needUpdate) {
      if (this.#displayBones === this.viewer.visibleBones) return;
    }

    {
      this.#displayBones = this.viewer.visibleBones;

      this.controllers.map((o) => {
        const enable =
          this.#displayBones &&
          (this.#focusedTo === "ik" || this.#focusedTo === null);

        o.visible = enable;
        if (hasOwn(o, "enabled")) o.enabled = enable;
      });

      this.fkManager.enabled =
        this.#displayBones &&
        (this.#focusedTo === "fk" || this.#focusedTo === null);
    }

    this.#needUpdate = false;
  }
}