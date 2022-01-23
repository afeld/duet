import "@tensorflow/tfjs";
import Stats from "stats.js";
import Video from "./video";
import Canvas from "./canvas";
import Detector from "./detector";
import { getElementById } from "./dom_helpers";
import { drawMask } from "./segment_helpers";
import Cannon from "./effects/cannon";
import Freeze from "./effects/freeze";
import Effect from "./effects/effect";

const showFPS = (stats: Stats) => {
  stats.showPanel(0);
  document.body.appendChild(stats.dom);
};

const loadAndPredict = async (
  detector: Detector,
  canvas: HTMLCanvasElement
) => {
  const segmentation = await detector.detect();
  drawMask(segmentation, canvas);
  return segmentation;
};

// the "game loop"
const onAnimationFrame = async (
  stats: Stats,
  detector: Detector,
  canvas: Canvas,
  effects: Effect[]
) => {
  stats.begin();

  if (detector.isReady()) {
    const segmentation = await loadAndPredict(detector, canvas.el);
    canvas.loaded();

    effects.forEach((effect) => effect.onAnimationFrame(segmentation, canvas));
  }

  stats.end();

  // loop
  requestAnimationFrame(() =>
    onAnimationFrame(stats, detector, canvas, effects)
  );
};

const toggleWebcam = (video: Video, canvas: Canvas) => {
  if (document.hidden) {
    video.turnOffWebcam();
  } else {
    // try to match output resolution
    video.setUpWebcam(canvas.width(), canvas.height());
  }
};

/**
 * Adds a Cannon to the list of effects, delaying by one more second each time.
 * @param effects - gets modified
 */
const addCannon = (effects: Effect[]) => {
  // increase the delay by one for each added
  const numCannons = effects.reduce(
    (prev, effect) => (effect instanceof Cannon ? prev + 1 : prev),
    0
  );
  const delay = numCannons + 1;
  const effect = new Cannon(delay);
  effects.push(effect);
};

const setup = async () => {
  const canvasEl = getElementById("canvas") as HTMLCanvasElement;
  const loadingIndicator = getElementById("loading");
  const canvas = new Canvas(canvasEl, loadingIndicator);

  const video = Video.matchCanvas(canvas);
  const stats = new Stats();
  const detector = new Detector(video);
  const effects = [new Freeze()];

  document.addEventListener("keypress", (event) => {
    if (event.code === "KeyC") {
      addCannon(effects);
    }
  });

  // only use the webcam when the window is visible
  toggleWebcam(video, canvas);
  document.addEventListener(
    "visibilitychange",
    () => toggleWebcam(video, canvas),
    false
  );

  showFPS(stats);
  onAnimationFrame(stats, detector, canvas, effects);

  // https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API#chrome_support
  const iSpeechRecognition =
    window.SpeechRecognition || webkitSpeechRecognition;
  const iSpeechGrammarList =
    window.SpeechGrammarList || webkitSpeechGrammarList;

  const recognition = new iSpeechRecognition();
  const speechRecognitionList = new iSpeechGrammarList();
  const colors = [
    "aqua",
    "azure",
    "beige",
    "bisque",
    "black",
    "blue",
    "brown",
    "chocolate",
    "coral",
  ];
  const grammar =
    "#JSGF V1.0; grammar colors; public <color> = " + colors.join(" | ") + " ;";
  speechRecognitionList.addFromString(grammar, 1);
  recognition.grammars = speechRecognitionList;

  recognition.continuous = true;
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.start();
  recognition.addEventListener("result", (event) => {
    // const color = event.results[0][0].transcript;
    // console.log(color);
    console.log(event.results);
    const lastCommand = event.results[event.results.length - 1][0].transcript;
    console.log(lastCommand);
  });
  recognition.addEventListener("nomatch", () => {
    console.log("no match for voice command");
  });

  let autoRestart = true;
  recognition.addEventListener("error", (event) => {
    console.log("error in speec recognition:", event.error);

    switch (event.error) {
      case "not-allowed":
      case "service-not-allowed":
        autoRestart = false;
    }
  });
  recognition.addEventListener("speechend", () => {
    console.log("speech ended");

    setTimeout(() => {
      // https://stackoverflow.com/questions/29996350/speech-recognition-run-continuously
      if (autoRestart) {
        recognition.start();
      }
    }, 1000);
  });
};

setup();
