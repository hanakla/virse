// import MP4Box from "mp4box";
// import loadMP4Module, {
//   isWebCodecsSupported,
// } from

export class Recorder {
  static async audioDevices() {
    const devs = await navigator.mediaDevices.enumerateDevices();
    return devs.filter((dev) => dev.kind == "audioinput");
  }

  #videoChunks: EncodedVideoChunk[] = [];
  #audioChunks: EncodedAudioChunk[] = [];
  #video: VideoEncoder;
  #audio: AudioEncoder;
  #canvasStream: MediaStream;
  #audioStream: MediaStream | null;

  #stopRequested = false;

  private MP4: any;

  static async create(
    canvas: HTMLCanvasElement,
    { audioDevId }: { audioDevId?: string | null }
  ) {
    const instance = new Recorder();
    const mod = await import(
      /* webpackIgnore: true */ "/mp4-wasm/build/mp4.js"
    );
    await mod.default();

    // instance.MP4 = await loadMP4Module();

    instance.#video = new VideoEncoder({
      output: (chunk, meta) => {
        instance.#videoChunks.push(chunk);
      },
      error: (e: DOMException) => {
        console.error(e);
      },
    });

    instance.#video.configure({
      codec: "mp4",
      width: 1280,
      height: 720,
    });

    instance.#audio = new AudioEncoder({
      output: (chunk, meta) => {
        instance.#audioChunks.push(chunk);
      },
      error: (e: DOMException) => {
        console.error(e);
      },
    });

    instance.#canvasStream = canvas.captureStream(30);
    instance.#audioStream = audioDevId
      ? await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: audioDevId },
        })
      : null;

    return instance;
  }

  start() {
    const processor = new MediaStreamTrackProcessor({
      track: this.#canvasStream.getVideoTracks()[0],
    });

    const processFrame = ({
      done,
      value,
    }: ReadableStreamDefaultReadResult<VideoFrame>) => {
      if (done) return;

      if (this.#stopRequested) {
        value!.close();
        this.#video.close();
        return;
      }

      this.#video.encode(value);

      videoReader.read().then(processFrame);
    };

    const videoReader = processor.readable.getReader();
    videoReader.read().then(processFrame);

    // this.#processor.getR
    // // track.
    // this.#video.encode()
    // // this.#canvasStream.c
  }

  finish() {
    // const mp4 = MP4Box.createFile()
    // mp4.appendBuffer
  }
}
