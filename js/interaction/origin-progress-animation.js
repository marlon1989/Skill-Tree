const ANIMATION_DURATION_MS = 820;
const TRACK_COLOR = "rgba(191, 219, 254, 0.45)";
const FILL_COLOR = "#2563eb";
const ACTIVATION_PHASE_RATIO = 0.24;

export function animateOriginProgress(nodeId, fromProgress, toProgress, onComplete = () => undefined) {
  const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
  const orbElement = nodeElement?.querySelector("[data-node-orb]");

  if (!nodeElement || !orbElement || toProgress <= fromProgress) {
    onComplete();
    return;
  }

  if (prefersReducedMotion()) {
    onComplete();
    return;
  }

  const animatedRing = buildAnimatedRing();
  const coreElement = orbElement.lastElementChild;
  const startAngle = progressToAngle(fromProgress);
  const endAngle = progressToAngle(toProgress);
  const startTime = performance.now();

  animatedRing.progress.style.background = ringGradient(startAngle);
  setInitialActivationState(animatedRing);
  insertAnimatedLayers(orbElement, coreElement, animatedRing);
  nodeElement.animate(nodeKeyframes(), animationTiming(ANIMATION_DURATION_MS));

  const tick = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progressRatio = Math.min(1, elapsed / ANIMATION_DURATION_MS);
    const activationRatio = Math.min(1, progressRatio / ACTIVATION_PHASE_RATIO);
    const easedActivation = easeOutCubic(activationRatio);
    const easedProgress = easeOutCubic(progressRatio);
    const currentAngle = startAngle + (endAngle - startAngle) * easedProgress;

    animatedRing.progress.style.background = ringGradient(currentAngle);
    animatedRing.progress.style.opacity = String(0.08 + easedActivation * (0.42 + easedProgress * 0.4));
    animatedRing.progress.style.transform = `scale(${0.92 + easedActivation * 0.08})`;
    animatedRing.glow.style.opacity = String(easedActivation * (0.16 + easedProgress * 0.26));
    animatedRing.glow.style.transform = `scale(${0.86 + easedActivation * 0.18})`;
    animatedRing.mask.style.opacity = String(0.35 + easedActivation * 0.65);

    if (progressRatio < 1) {
      window.requestAnimationFrame(tick);
      return;
    }

    onComplete();
  };

  window.requestAnimationFrame(tick);
}

function animationTiming(duration) {
  return {
    duration,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  };
}

function buildAnimatedRing() {
  return {
    glow: buildLayer("absolute inset-0 rounded-full bg-blue-400/30 blur-xl pointer-events-none"),
    mask: buildLayer("absolute inset-[3px] rounded-full bg-slate-700 pointer-events-none"),
    progress: buildLayer("absolute inset-0 rounded-full pointer-events-none"),
  };
}

function buildLayer(className) {
  const element = document.createElement("div");

  element.className = className;
  element.style.transition = "opacity 140ms linear, transform 220ms cubic-bezier(0.22, 1, 0.36, 1)";

  return element;
}

function insertAnimatedLayers(orbElement, coreElement, animatedRing) {
  [animatedRing.glow, animatedRing.progress, animatedRing.mask].forEach((layer) => {
    orbElement.insertBefore(layer, coreElement);
  });
}

function setInitialActivationState(animatedRing) {
  animatedRing.glow.style.opacity = "0";
  animatedRing.glow.style.transform = "scale(0.86)";
  animatedRing.mask.style.opacity = "0.35";
  animatedRing.progress.style.opacity = "0.08";
  animatedRing.progress.style.transform = "scale(0.92)";
}

function easeOutCubic(value) {
  return 1 - (1 - value) ** 3;
}

function nodeKeyframes() {
  return [
    { transform: "translateY(0) scale(1)", filter: "drop-shadow(0 0 0 rgba(37, 99, 235, 0))" },
    { transform: "translateY(-6px) scale(1.06)", filter: "drop-shadow(0 10px 18px rgba(37, 99, 235, 0.28))", offset: 0.35 },
    { transform: "translateY(0) scale(1)", filter: "drop-shadow(0 0 0 rgba(37, 99, 235, 0))" },
  ];
}

function progressToAngle(progressValue) {
  return Math.max(0, Math.min(100, Number(progressValue) || 0)) * 3.6;
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

function ringGradient(angle) {
  return `conic-gradient(${FILL_COLOR} ${angle}deg, ${TRACK_COLOR} ${angle}deg 360deg)`;
}
