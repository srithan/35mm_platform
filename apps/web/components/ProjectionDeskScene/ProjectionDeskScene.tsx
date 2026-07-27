"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import * as THREE from "three";
import GUI from "lil-gui";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { cn } from "@/lib/utils/cn";
import {
  PROJECTION_FRAGMENT_SHADER,
  PROJECTION_VERTEX_SHADER,
} from "./projectionShaders";
import styles from "./ProjectionDeskScene.module.css";

const DEFAULT_FALLBACK_MESSAGE =
  "This visual needs WebGL, but WebGL is unavailable in this browser.";

type ProjectionEffects = {
  projectionIntensity: number;
  reflectionGain: number;
  blurRadiusPx: number;
  highlightBoost: number;
  lumaVisibilityThreshold: number;
  invertColor: boolean;
  halftone: boolean;
  toneCut: boolean;
};

type GradientEffects = Omit<ProjectionEffects, "blurRadiusPx">;

type GradientRenderSource = {
  texture: THREE.Texture;
  render: (renderer: THREE.WebGLRenderer, timeSeconds: number) => void;
  setEffects: (effects: GradientEffects) => void;
  dispose: () => void;
};

type Keyboard = {
  group: THREE.Group;
  geometries: THREE.BufferGeometry[];
};

export type ProjectionDeskSceneProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> & {
  fallback?: ReactNode;
  onError?: (error: Error) => void;
  showControls?: boolean;
};

function toError(value: unknown) {
  return value instanceof Error
    ? value
    : new Error("Unknown WebGL initialization error");
}

function createProjectedFloor(
  width: number,
  depth: number,
  material: THREE.Material,
  segments = 64
) {
  const geometry = new THREE.PlaneGeometry(
    width,
    depth,
    segments,
    segments
  );
  geometry.rotateX(-Math.PI / 2);
  return new THREE.Mesh(geometry, material);
}

function createKeyboard(material: THREE.Material): Keyboard {
  const group = new THREE.Group();
  const baseGeometry = new THREE.BoxGeometry(1.15, 0.045, 0.42);
  const base = new THREE.Mesh(baseGeometry, material);
  base.position.y = 0.0225;
  group.add(base);

  const columns = 10;
  const rows = 3;
  const keyWidth = 0.09;
  const keyHeight = 0.072;
  const keyDepth = 0.07;
  const horizontalGap = 0.012;
  const depthGap = 0.01;
  const startX =
    -((columns - 1) * (keyWidth + horizontalGap)) / 2;
  const startZ = -((rows - 1) * (keyDepth + depthGap)) / 2;
  const keyGeometry = new THREE.BoxGeometry(
    keyWidth,
    keyHeight,
    keyDepth
  );

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const key = new THREE.Mesh(keyGeometry, material);
      key.position.set(
        startX + column * (keyWidth + horizontalGap),
        0.045 + keyHeight * 0.5 + 0.002,
        startZ + row * (keyDepth + depthGap)
      );
      group.add(key);
    }
  }

  group.position.set(0, 0, 1.28);

  return {
    group,
    geometries: [baseGeometry, keyGeometry],
  };
}

function createGradientRenderSource(
  width = 1024,
  height = 576
): GradientRenderSource {
  const targetWidth = Math.max(2, Math.floor(width));
  const targetHeight = Math.max(2, Math.floor(height));
  const sourceScene = new THREE.Scene();
  const sourceCamera = new THREE.OrthographicCamera(
    -1,
    1,
    1,
    -1,
    0,
    1
  );
  const sourceMaterial = new THREE.ShaderMaterial({
    vertexShader: PROJECTION_VERTEX_SHADER,
    fragmentShader: PROJECTION_FRAGMENT_SHADER,
    uniforms: {
      uTime: { value: 0 },
      uProjectionIntensity: { value: 0.5 },
      uReflectionGain: { value: 1 },
      uHighlightBoost: { value: 1.65 },
      uLumaVisibilityThreshold: { value: 0.3 },
      uInvertColor: { value: 0 },
      uHalftone: { value: 0 },
      uToneCut: { value: 0 },
    },
    depthTest: false,
    depthWrite: false,
  });
  const sourceQuad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    sourceMaterial
  );
  sourceScene.add(sourceQuad);

  const target = new THREE.WebGLRenderTarget(
    targetWidth,
    targetHeight,
    {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      colorSpace: THREE.SRGBColorSpace,
      depthBuffer: false,
      stencilBuffer: false,
    }
  );

  return {
    texture: target.texture,
    render(renderer, timeSeconds) {
      const previousTarget = renderer.getRenderTarget();
      const wasXrEnabled = renderer.xr.enabled;

      renderer.xr.enabled = false;
      sourceMaterial.uniforms.uTime.value = timeSeconds;
      renderer.setRenderTarget(target);
      renderer.clear();
      renderer.render(sourceScene, sourceCamera);
      renderer.setRenderTarget(previousTarget);
      renderer.xr.enabled = wasXrEnabled;
    },
    setEffects(effects) {
      sourceMaterial.uniforms.uProjectionIntensity.value =
        effects.projectionIntensity;
      sourceMaterial.uniforms.uReflectionGain.value =
        effects.reflectionGain;
      sourceMaterial.uniforms.uHighlightBoost.value =
        effects.highlightBoost;
      sourceMaterial.uniforms.uLumaVisibilityThreshold.value =
        effects.lumaVisibilityThreshold;
      sourceMaterial.uniforms.uInvertColor.value = effects.invertColor
        ? 1
        : 0;
      sourceMaterial.uniforms.uHalftone.value = effects.halftone ? 1 : 0;
      sourceMaterial.uniforms.uToneCut.value = effects.toneCut ? 1 : 0;
    },
    dispose() {
      sourceQuad.geometry.dispose();
      sourceMaterial.dispose();
      target.dispose();
    },
  };
}

function createScreen(texture: THREE.Texture) {
  const geometry = new THREE.PlaneGeometry(2, 1.3);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, 1, 0.5);
  return { geometry, material, mesh };
}

function addProjectionControls(
  root: HTMLElement,
  tune: ProjectionEffects,
  onChange: () => void
) {
  const gui = new GUI({
    title: "Projection",
    container: root,
  });
  Object.assign(gui.domElement.style, {
    position: "absolute",
    top: "8px",
    right: "8px",
    zIndex: "20",
  });

  const projectionFolder = gui.addFolder("Projection Core");
  projectionFolder
    .add(tune, "projectionIntensity", 0, 3, 0.01)
    .name("Projection intensity");
  projectionFolder
    .add(tune, "reflectionGain", 0, 4, 0.01)
    .name("Reflection strength");
  projectionFolder
    .add(tune, "blurRadiusPx", 0, 128, 1)
    .name("Blur amount");
  projectionFolder
    .add(tune, "highlightBoost", 0.5, 4, 0.05)
    .name("Highlight boost");
  projectionFolder
    .add(tune, "lumaVisibilityThreshold", 0, 1, 0.01)
    .name("Visible luma threshold");
  projectionFolder.add(tune, "invertColor").name("Invert color");
  projectionFolder.add(tune, "halftone").name("Halftone");
  projectionFolder
    .add(tune, "toneCut")
    .name("Tone cut (hard bands)");
  gui.onChange(onChange);

  return gui;
}

export function ProjectionDeskScene({
  className,
  fallback = DEFAULT_FALLBACK_MESSAGE,
  onError,
  showControls = false,
  ...props
}: ProjectionDeskSceneProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const onErrorRef = useRef(onError);
  const [renderError, setRenderError] = useState<Error | null>(null);
  onErrorRef.current = onError;

  useEffect(() => {
    const root = rootRef.current;
    const canvasHost = canvasHostRef.current;

    if (!root || !canvasHost) {
      return;
    }

    let disposed = false;
    let animationFrameId: number | null = null;
    let isVisible = true;
    let isContextLost = false;
    let renderer: THREE.WebGLRenderer | null = null;
    let gui: GUI | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const reportError = (value: unknown) => {
      const error = toError(value);
      console.error("[ProjectionDeskScene] WebGL rendering failed", error);

      if (!disposed) {
        setRenderError(error);
        onErrorRef.current?.(error);
      }
    };

    try {
      const testCanvas = document.createElement("canvas");
      const webGlContext =
        testCanvas.getContext("webgl2") ??
        testCanvas.getContext("webgl");

      if (!webGlContext) {
        throw new Error("WebGL is unavailable");
      }

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.78;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.setAttribute("aria-hidden", "true");
      canvasHost.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x101014);

      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.set(0, 1.2, 5.5);
      camera.lookAt(0, 0.8, 0);

      const screenGradientSource = createGradientRenderSource();
      const projectionGradientSource = createGradientRenderSource();
      screenGradientSource.setEffects({
        projectionIntensity: 1,
        reflectionGain: 1,
        highlightBoost: 1,
        lumaVisibilityThreshold: 0,
        invertColor: false,
        halftone: false,
        toneCut: false,
      });

      const screen = createScreen(screenGradientSource.texture);
      const floorKeyboardMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a22,
        roughness: 0.88,
        metalness: 0.06,
      });
      const floorMesh = createProjectedFloor(
        100,
        100,
        floorKeyboardMaterial
      );
      floorMesh.receiveShadow = true;

      const keyboard = createKeyboard(floorKeyboardMaterial);
      keyboard.group.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.receiveShadow = true;
          object.castShadow = true;
        }
      });

      scene.add(screen.mesh, floorMesh, keyboard.group);

      const spot = new THREE.SpotLight(0xffffff, 220);
      spot.decay = 6;
      spot.distance = 35;
      spot.angle = Math.PI / 3.1;
      spot.penumbra = 0.58;
      spot.map = projectionGradientSource.texture;
      spot.castShadow = true;
      spot.shadow.mapSize.set(2048, 2048);
      spot.shadow.bias = -0.0002;
      spot.shadow.normalBias = 0.02;
      spot.position.set(0, 1, 0.52);
      spot.target.position.set(0, 0.02, 1.15);
      scene.add(spot, spot.target);

      const hemisphereLight = new THREE.HemisphereLight(
        0xffffff,
        0x060608,
        0.04
      );
      hemisphereLight.position.set(0, 10, 0);
      scene.add(hemisphereLight);

      const composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(1, 1),
        0.22,
        0.42,
        0.72
      );
      const outputPass = new OutputPass();
      composer.addPass(renderPass);
      composer.addPass(bloomPass);
      composer.addPass(outputPass);

      const tune: ProjectionEffects = {
        projectionIntensity: 1.64,
        reflectionGain: 1,
        blurRadiusPx: 64,
        highlightBoost: 1.65,
        lumaVisibilityThreshold: 0.12,
        invertColor: false,
        halftone: true,
        toneCut: false,
      };

      const syncProjectionEffects = () => {
        const blend =
          Math.max(0, tune.projectionIntensity) *
          Math.max(0, tune.reflectionGain);
        spot.intensity = 220 * blend;
        floorKeyboardMaterial.envMapIntensity =
          0.35 * Math.max(0.1, tune.reflectionGain);
        bloomPass.radius = THREE.MathUtils.clamp(
          tune.blurRadiusPx / 128,
          0,
          1
        );
        bloomPass.strength =
          0.22 * Math.max(0.2, tune.highlightBoost);
        bloomPass.threshold = THREE.MathUtils.clamp(
          tune.lumaVisibilityThreshold,
          0,
          1
        );
        projectionGradientSource.setEffects(tune);
      };

      syncProjectionEffects();

      if (showControls) {
        gui = addProjectionControls(
          root,
          tune,
          syncProjectionEffects
        );
      }

      const renderFrame = (timeMilliseconds: number) => {
        const timeSeconds = timeMilliseconds * 0.001;
        screenGradientSource.render(renderer!, timeSeconds);
        projectionGradientSource.render(renderer!, timeSeconds);
        composer.render();
      };

      const canAnimate = () =>
        !disposed &&
        !isContextLost &&
        isVisible &&
        !document.hidden &&
        !reducedMotionQuery.matches;

      const animate = (timeMilliseconds: number) => {
        animationFrameId = null;

        if (!canAnimate()) {
          return;
        }

        renderFrame(timeMilliseconds);
        animationFrameId = window.requestAnimationFrame(animate);
      };

      const startAnimation = () => {
        if (animationFrameId === null && canAnimate()) {
          animationFrameId = window.requestAnimationFrame(animate);
        }
      };

      const stopAnimation = () => {
        if (animationFrameId !== null) {
          window.cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      };

      const syncAnimationState = () => {
        if (canAnimate()) {
          startAnimation();
          return;
        }

        stopAnimation();

        if (!isContextLost && isVisible) {
          renderFrame(performance.now());
        }
      };

      const resize = () => {
        const { width, height } = root.getBoundingClientRect();

        if (width < 2 || height < 2) {
          return;
        }

        const pixelRatio = Math.min(window.devicePixelRatio, 2);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer!.setPixelRatio(pixelRatio);
        renderer!.setSize(width, height, false);
        composer.setPixelRatio(pixelRatio);
        composer.setSize(width, height);
        renderFrame(performance.now());
      };

      const handleContextLost = (event: Event) => {
        event.preventDefault();
        isContextLost = true;
        stopAnimation();
        reportError(new Error("WebGL context was lost"));
      };

      const handleContextRestored = () => {
        isContextLost = false;
        setRenderError(null);
        resize();
        startAnimation();
      };

      renderer.domElement.addEventListener(
        "webglcontextlost",
        handleContextLost
      );
      renderer.domElement.addEventListener(
        "webglcontextrestored",
        handleContextRestored
      );
      document.addEventListener("visibilitychange", syncAnimationState);
      reducedMotionQuery.addEventListener("change", syncAnimationState);

      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(root);

      intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          isVisible = entry?.isIntersecting ?? true;
          syncAnimationState();
        },
        { rootMargin: "100px" }
      );
      intersectionObserver.observe(root);

      resize();
      syncAnimationState();
      setRenderError(null);

      return () => {
        disposed = true;
        stopAnimation();
        resizeObserver?.disconnect();
        intersectionObserver?.disconnect();
        document.removeEventListener(
          "visibilitychange",
          syncAnimationState
        );
        reducedMotionQuery.removeEventListener(
          "change",
          syncAnimationState
        );
        renderer?.domElement.removeEventListener(
          "webglcontextlost",
          handleContextLost
        );
        renderer?.domElement.removeEventListener(
          "webglcontextrestored",
          handleContextRestored
        );
        gui?.destroy();
        renderPass.dispose();
        bloomPass.dispose();
        outputPass.dispose();
        composer.dispose();
        screenGradientSource.dispose();
        projectionGradientSource.dispose();
        screen.geometry.dispose();
        screen.material.dispose();
        floorKeyboardMaterial.dispose();
        floorMesh.geometry.dispose();
        keyboard.geometries.forEach((geometry) => geometry.dispose());
        spot.dispose();
        renderer?.dispose();
        renderer?.domElement.remove();
      };
    } catch (error) {
      reportError(error);
      renderer?.dispose();
      renderer?.domElement.remove();
    }
  }, [showControls]);

  return (
    <div
      ref={rootRef}
      className={cn(styles.root, className)}
      {...props}
    >
      <div ref={canvasHostRef} className={styles.canvasHost} />
      {renderError ? (
        <div className={styles.fallback} role="alert">
          {fallback}
        </div>
      ) : null}
    </div>
  );
}
