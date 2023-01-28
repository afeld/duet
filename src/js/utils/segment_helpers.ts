import Skeleton from "../poses/skeleton";
import { Pose } from "@tensorflow-models/pose-detection";
import { Segmentation } from "@tensorflow-models/pose-detection/dist/shared/calculators/interfaces/common_interfaces";
import Canvas from "../display/canvas";
import { BLACK } from "./colors";

let canvas2: OffscreenCanvas | undefined;

const drawImageDataWithTransparency = (
  canvas: Canvas,
  imageData: ImageData
) => {
  const ctx = canvas.context();

  // Render to offscreen canvas to convert the ImageData to something that can be used by drawImage(), which supports transparency. putImageData() overwrites with transparent pixels.
  // https://stackoverflow.com/a/53239232/358804

  const width = canvas.width();
  const height = canvas.height();
  if (!canvas2 || canvas2.width !== width || canvas2.height !== height) {
    // cache the canvas
    canvas2 = new OffscreenCanvas(width, height);
  }

  const ctx2 = canvas2.getContext("2d");
  if (!ctx2) {
    return;
  }

  ctx2.putImageData(imageData, 0, 0);
  ctx.drawImage(canvas2, 0, 0);
};

export const drawMask = async (
  segmentation: Segmentation,
  canvas: Canvas,
  color = BLACK
) => {
  const coloredPartImage = await segmentation.mask.toImageData();
  drawImageDataWithTransparency(canvas, coloredPartImage);
};

export const drawSkeleton = (pose: Pose, canvas: Canvas, color = BLACK) => {
  const skeleton = new Skeleton(pose, color);
  skeleton.draw(canvas);
};
