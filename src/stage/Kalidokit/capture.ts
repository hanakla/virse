// SEE: https://glitch.com/edit/#!/kalidokit?path=script.js%3A263%3A0
import * as THREE from "three";
import { VRM, VRMSchema } from "@pixiv/three-vrm";
import * as Kalidokit from "kalidokit";
import { Camera } from "@mediapipe/camera_utils";
import { Holistic, Results, ResultsListener } from "@mediapipe/holistic";
import { Avatar } from "../VRMToyBox/Avatar";
import mitt from "mitt";

//Import Helper Functions from Kalidokit
const remap = Kalidokit.Utils.remap;
const clamp = Kalidokit.Utils.clamp;
const lerp = Kalidokit.Vector.lerp;

export class KalidokitCapture {
  private vrm: VRM;
  private holistic: Holistic;
  private camera: Camera;

  public events = mitt<{ statusChanged: void }>();

  #isCaptureRunning = false;
  #isInitializing = false;

  constructor(
    avatar: Avatar,
    private video: HTMLVideoElement = document.createElement("video")
  ) {
    this.vrm = avatar.vrm;

    this.holistic = new Holistic({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1635989137/${file}`;
      },
    });

    this.holistic.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
      refineFaceLandmarks: true,
    });

    // Pass holistic a callback function
    this.holistic.onResults(this.onResults);

    this.camera = new Camera(this.video, {
      onFrame: async () => {
        await this.holistic.send({ image: this.video });
      },
      width: 640,
      height: 480,
    });
  }

  public async start() {
    this.#isInitializing = true;
    this.events.emit("statusChanged");

    // Use `Mediapipe` utils to get camera - lower resolution = higher fps
    await this.camera.start();
    this.#isCaptureRunning = true;
  }

  public async stop() {
    await this.camera.stop();
    this.#isCaptureRunning = false;
    this.#isInitializing = false;
    this.events.emit("statusChanged");
  }

  public get isCaptureRunnging() {
    return this.#isCaptureRunning;
  }

  public get isInitializing() {
    return this.#isInitializing;
  }

  // Animate Rotation Helper function
  private rigRotation = (
    name: keyof typeof VRMSchema.HumanoidBoneName,
    rotation = { x: 0, y: 0, z: 0 },
    dampener = 1,
    lerpAmount = 0.3
  ) => {
    // if (!currentVrm) {
    //   return;
    // }

    const Part = this.vrm.humanoid!.getBoneNode(
      VRMSchema.HumanoidBoneName[name]
    );
    if (!Part) {
      return;
    }

    let euler = new THREE.Euler(
      rotation.x * dampener,
      rotation.y * dampener,
      rotation.z * dampener
    );
    let quaternion = new THREE.Quaternion().setFromEuler(euler);
    Part.quaternion.slerp(quaternion, lerpAmount); // interpolate
  };

  // Animate Position Helper Function
  private rigPosition = (
    name: keyof typeof VRMSchema.HumanoidBoneName,
    position = { x: 0, y: 0, z: 0 },
    dampener = 1,
    lerpAmount = 0.3
  ) => {
    // if (!currentVrm) {
    //   return;
    // }
    const Part = this.vrm.humanoid!.getBoneNode(
      VRMSchema.HumanoidBoneName[name]
    );
    if (!Part) {
      return;
    }
    let vector = new THREE.Vector3(
      position.x * dampener,
      position.y * dampener,
      position.z * dampener
    );
    Part.position.lerp(vector, lerpAmount); // interpolate
  };

  private oldLookTarget = new THREE.Euler();
  private rigFace = (riggedFace: Kalidokit.TFace) => {
    // if (!this.vrm) {
    //   return;
    // }

    this.rigRotation("Neck", riggedFace.head, 0.7);

    // Blendshapes and Preset Name Schema
    const Blendshape = this.vrm.blendShapeProxy!;
    const PresetName = VRMSchema.BlendShapePresetName;

    // Simple example without winking. Interpolate based on old blendshape, then stabilize blink with `Kalidokit` helper function.
    // for VRM, 1 is closed, 0 is open.
    riggedFace.eye.l = lerp(
      clamp(1 - riggedFace.eye.l, 0, 1),
      Blendshape.getValue(PresetName.Blink)!,
      0.5
    );
    riggedFace.eye.r = lerp(
      clamp(1 - riggedFace.eye.r, 0, 1),
      Blendshape.getValue(PresetName.Blink)!,
      0.5
    );
    riggedFace.eye = Kalidokit.Face.stabilizeBlink(
      riggedFace.eye,
      riggedFace.head.y
    );
    Blendshape.setValue(PresetName.Blink, riggedFace.eye.l);

    // Interpolate and set mouth blendshapes
    Blendshape.setValue(
      PresetName.I,
      lerp(
        riggedFace.mouth.shape.I,
        Blendshape.getValue(PresetName.I)!,
        0.5
      ) as number
    );
    Blendshape.setValue(
      PresetName.A,
      lerp(
        riggedFace.mouth.shape.A,
        Blendshape.getValue(PresetName.A)!,
        0.5
      ) as number
    );
    Blendshape.setValue(
      PresetName.E,
      lerp(
        riggedFace.mouth.shape.E,
        Blendshape.getValue(PresetName.E)!,
        0.5
      ) as number
    );
    Blendshape.setValue(
      PresetName.O,
      lerp(
        riggedFace.mouth.shape.O,
        Blendshape.getValue(PresetName.O)!,
        0.5
      ) as number
    );
    Blendshape.setValue(
      PresetName.U,
      lerp(
        riggedFace.mouth.shape.U,
        Blendshape.getValue(PresetName.U)!,
        0.5
      ) as number
    );

    //PUPILS
    //interpolate pupil and keep a copy of the value
    let lookTarget = new THREE.Euler(
      lerp(this.oldLookTarget.x, riggedFace.pupil.y, 0.4),
      lerp(this.oldLookTarget.y, riggedFace.pupil.x, 0.4),
      0,
      "XYZ"
    );
    this.oldLookTarget.copy(lookTarget);
    this.vrm.lookAt!.applyer!.lookAt(lookTarget);
  };

  private onResults: ResultsListener = (results) => {
    if (this.#isInitializing) {
      this.#isInitializing = false;
      this.events.emit("statusChanged");
    }

    // Draw landmark guides
    //   drawResults(results);
    // Animate model
    this.animateVRM(results);
  };

  /* VRM Character Animator */
  private animateVRM = (results: Results) => {
    const { vrm } = this;

    // Take the results from `Holistic` and animate character based on its Face, Pose, and Hand Keypoints.
    let riggedPose: Kalidokit.TPose | undefined,
      riggedLeftHand: Kalidokit.THand<Kalidokit.Side> | undefined,
      riggedRightHand: Kalidokit.THand<Kalidokit.Side> | undefined,
      riggedFace: Kalidokit.TFace | undefined;

    const faceLandmarks = results.faceLandmarks;
    // Pose 3D Landmarks are with respect to Hip distance in meters
    const pose3DLandmarks = results.ea;
    // Pose 2D landmarks are with respect to videoWidth and videoHeight
    const pose2DLandmarks = results.poseLandmarks;
    // Be careful, hand landmarks may be reversed
    const leftHandLandmarks = results.rightHandLandmarks;
    const rightHandLandmarks = results.leftHandLandmarks;

    // Animate Face
    if (faceLandmarks) {
      riggedFace = Kalidokit.Face.solve(faceLandmarks, {
        runtime: "mediapipe",
        video: this.video,
      });
      this.rigFace(riggedFace!);
    }

    // Animate Pose
    if (pose2DLandmarks && pose3DLandmarks) {
      riggedPose = Kalidokit.Pose.solve(pose3DLandmarks, pose2DLandmarks, {
        runtime: "mediapipe",
        video: this.video,
      });
      this.rigRotation("Hips", riggedPose!.Hips.rotation, 0.7);
      this.rigPosition(
        "Hips",
        {
          x: -riggedPose!.Hips.position.x, // Reverse direction
          y: riggedPose!.Hips.position.y + 1, // Add a bit of height
          z: -riggedPose!.Hips.position.z, // Reverse direction
        },
        1,
        0.07
      );

      this.rigRotation("Chest", riggedPose!.Spine, 0.25, 0.3);
      this.rigRotation("Spine", riggedPose!.Spine, 0.45, 0.3);

      this.rigRotation("RightUpperArm", riggedPose!.RightUpperArm, 1, 0.3);
      this.rigRotation("RightLowerArm", riggedPose!.RightLowerArm, 1, 0.3);
      this.rigRotation("LeftUpperArm", riggedPose!.LeftUpperArm, 1, 0.3);
      this.rigRotation("LeftLowerArm", riggedPose!.LeftLowerArm, 1, 0.3);

      this.rigRotation("LeftUpperLeg", riggedPose!.LeftUpperLeg, 1, 0.3);
      this.rigRotation("LeftLowerLeg", riggedPose!.LeftLowerLeg, 1, 0.3);
      this.rigRotation("RightUpperLeg", riggedPose!.RightUpperLeg, 1, 0.3);
      this.rigRotation("RightLowerLeg", riggedPose!.RightLowerLeg, 1, 0.3);
    }

    // Animate Hands
    if (leftHandLandmarks) {
      riggedLeftHand = Kalidokit.Hand.solve(leftHandLandmarks, "Left");
      this.rigRotation("LeftHand", {
        // Combine pose rotation Z and hand rotation X Y
        z: riggedPose!.LeftHand.z,
        y: riggedLeftHand!.LeftWrist.y,
        x: riggedLeftHand!.LeftWrist.x,
      });
      this.rigRotation("LeftRingProximal", riggedLeftHand!.LeftRingProximal);
      this.rigRotation(
        "LeftRingIntermediate",
        riggedLeftHand!.LeftRingIntermediate
      );
      this.rigRotation("LeftRingDistal", riggedLeftHand!.LeftRingDistal);
      this.rigRotation("LeftIndexProximal", riggedLeftHand!.LeftIndexProximal);
      this.rigRotation(
        "LeftIndexIntermediate",
        riggedLeftHand!.LeftIndexIntermediate
      );
      this.rigRotation("LeftIndexDistal", riggedLeftHand!.LeftIndexDistal);
      this.rigRotation(
        "LeftMiddleProximal",
        riggedLeftHand!.LeftMiddleProximal
      );
      this.rigRotation(
        "LeftMiddleIntermediate",
        riggedLeftHand!.LeftMiddleIntermediate
      );
      this.rigRotation("LeftMiddleDistal", riggedLeftHand!.LeftMiddleDistal);
      this.rigRotation("LeftThumbProximal", riggedLeftHand!.LeftThumbProximal);
      this.rigRotation(
        "LeftThumbIntermediate",
        riggedLeftHand!.LeftThumbIntermediate
      );
      this.rigRotation("LeftThumbDistal", riggedLeftHand!.LeftThumbDistal);
      this.rigRotation(
        "LeftLittleProximal",
        riggedLeftHand!.LeftLittleProximal
      );
      this.rigRotation(
        "LeftLittleIntermediate",
        riggedLeftHand!.LeftLittleIntermediate
      );
      this.rigRotation("LeftLittleDistal", riggedLeftHand!.LeftLittleDistal);
    }
    if (rightHandLandmarks) {
      riggedRightHand = Kalidokit.Hand.solve(rightHandLandmarks, "Right");
      this.rigRotation("RightHand", {
        // Combine Z axis from pose hand and X/Y axis from hand wrist rotation
        z: riggedPose!.RightHand.z,
        y: riggedRightHand!.RightWrist.y,
        x: riggedRightHand!.RightWrist.x,
      });
      this.rigRotation("RightRingProximal", riggedRightHand!.RightRingProximal);
      this.rigRotation(
        "RightRingIntermediate",
        riggedRightHand!.RightRingIntermediate
      );
      this.rigRotation("RightRingDistal", riggedRightHand!.RightRingDistal);
      this.rigRotation(
        "RightIndexProximal",
        riggedRightHand!.RightIndexProximal
      );
      this.rigRotation(
        "RightIndexIntermediate",
        riggedRightHand!.RightIndexIntermediate
      );
      this.rigRotation("RightIndexDistal", riggedRightHand!.RightIndexDistal);
      this.rigRotation(
        "RightMiddleProximal",
        riggedRightHand!.RightMiddleProximal
      );
      this.rigRotation(
        "RightMiddleIntermediate",
        riggedRightHand!.RightMiddleIntermediate
      );
      this.rigRotation("RightMiddleDistal", riggedRightHand!.RightMiddleDistal);
      this.rigRotation(
        "RightThumbProximal",
        riggedRightHand!.RightThumbProximal
      );
      this.rigRotation(
        "RightThumbIntermediate",
        riggedRightHand!.RightThumbIntermediate
      );
      this.rigRotation("RightThumbDistal", riggedRightHand!.RightThumbDistal);
      this.rigRotation(
        "RightLittleProximal",
        riggedRightHand!.RightLittleProximal
      );
      this.rigRotation(
        "RightLittleIntermediate",
        riggedRightHand!.RightLittleIntermediate
      );
      this.rigRotation("RightLittleDistal", riggedRightHand!.RightLittleDistal);
    }
  };
}

/* SETUP MEDIAPIPE HOLISTIC INSTANCE */
// let videoElement = document.querySelector(".input_video"),
//   guideCanvas = document.querySelector("canvas.guides");

// const drawResults = (results) => {
//   guideCanvas.width = videoElement.videoWidth;
//   guideCanvas.height = videoElement.videoHeight;
//   let canvasCtx = guideCanvas.getContext("2d");
//   canvasCtx.save();
//   canvasCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
//   // Use `Mediapipe` drawing functions
//   drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
//     color: "#00cff7",
//     lineWidth: 4,
//   });
//   drawLandmarks(canvasCtx, results.poseLandmarks, {
//     color: "#ff0364",
//     lineWidth: 2,
//   });
//   drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_TESSELATION, {
//     color: "#C0C0C070",
//     lineWidth: 1,
//   });
//   if (results.faceLandmarks && results.faceLandmarks.length === 478) {
//     //draw pupils
//     drawLandmarks(
//       canvasCtx,
//       [results.faceLandmarks[468], results.faceLandmarks[468 + 5]],
//       {
//         color: "#ffe603",
//         lineWidth: 2,
//       }
//     );
//   }
//   drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {
//     color: "#eb1064",
//     lineWidth: 5,
//   });
//   drawLandmarks(canvasCtx, results.leftHandLandmarks, {
//     color: "#00cff7",
//     lineWidth: 2,
//   });
//   drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {
//     color: "#22c3e3",
//     lineWidth: 5,
//   });
//   drawLandmarks(canvasCtx, results.rightHandLandmarks, {
//     color: "#ff0364",
//     lineWidth: 2,
//   });
// };
