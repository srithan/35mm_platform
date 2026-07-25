import type { NsfwCategory } from "@35mm/types";
import type { NSFWJS, PredictionType } from "nsfwjs/core";

const SEXUAL_CONTENT_THRESHOLD = 0.64;
const NUDITY_THRESHOLD = 0.72;

let modelPromise: Promise<NSFWJS> | null = null;
const fileResultCache = new WeakMap<File, Promise<NsfwCategory[]>>();

async function loadModel(): Promise<NSFWJS> {
  if (!modelPromise) {
    modelPromise = Promise.all([
      import("nsfwjs/core"),
      import("nsfwjs/models/mobilenet_v2"),
      import("@tensorflow/tfjs"),
    ]).then(async function ([nsfwjs, modelDefinition, tf]) {
      await tf.ready();
      return nsfwjs.load("MobileNetV2", {
        modelDefinitions: [modelDefinition.MobileNetV2Model],
      });
    });
    void modelPromise.catch(function () {
      modelPromise = null;
    });
  }
  return modelPromise;
}

function categoriesFromPredictions(predictions: PredictionType[]): NsfwCategory[] {
  const probability = new Map(
    predictions.map(function (prediction) {
      return [prediction.className, prediction.probability] as const;
    })
  );
  const porn = probability.get("Porn") ?? 0;
  const hentai = probability.get("Hentai") ?? 0;
  const sexy = probability.get("Sexy") ?? 0;
  const categories: NsfwCategory[] = [];

  if (porn >= NUDITY_THRESHOLD || hentai >= NUDITY_THRESHOLD) {
    categories.push("nudity");
  }
  if (
    porn >= SEXUAL_CONTENT_THRESHOLD ||
    hentai >= SEXUAL_CONTENT_THRESHOLD ||
    sexy >= SEXUAL_CONTENT_THRESHOLD
  ) {
    categories.push("sexual_content");
  }
  return categories;
}

function loadFileImage(file: File): Promise<HTMLImageElement> {
  return new Promise(function (resolve, reject) {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";
    image.onload = function () {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = function () {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The selected image could not be decoded"));
    };
    image.src = objectUrl;
  });
}

export function classifyStagedImage(file: File): Promise<NsfwCategory[]> {
  const cached = fileResultCache.get(file);
  if (cached) return cached;

  const result = Promise.all([loadModel(), loadFileImage(file)])
    .then(function ([model, image]) {
      return model.classify(image, 5).then(categoriesFromPredictions);
    })
    .catch(function (error) {
      fileResultCache.delete(file);
      throw error;
    });
  fileResultCache.set(file, result);
  return result;
}
