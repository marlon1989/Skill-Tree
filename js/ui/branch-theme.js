const ROOT_BRANCH_TONES = Object.freeze([
  {
    accent: "#5a9dff",
    accentStrong: "#7bb7ff",
    bannerGlow: "rgba(90,157,255,0.24)",
    border: "rgba(123,183,255,0.72)",
    connectionGlow: "rgba(90,157,255,0.24)",
    connectionStroke: "rgba(90,157,255,0.78)",
    glow: "rgba(90,157,255,0.2)",
    glowStrong: "rgba(90,157,255,0.32)",
    plaqueBackground: "rgba(8,18,36,0.92)",
    plaqueBorder: "rgba(123,183,255,0.45)",
    shadow: "rgba(90,157,255,0.18)",
    shadowStrong: "rgba(90,157,255,0.28)",
  },
  {
    accent: "#39d9df",
    accentStrong: "#73f4f7",
    bannerGlow: "rgba(57,217,223,0.24)",
    border: "rgba(115,244,247,0.72)",
    connectionGlow: "rgba(57,217,223,0.22)",
    connectionStroke: "rgba(57,217,223,0.74)",
    glow: "rgba(57,217,223,0.18)",
    glowStrong: "rgba(57,217,223,0.28)",
    plaqueBackground: "rgba(8,23,25,0.92)",
    plaqueBorder: "rgba(115,244,247,0.42)",
    shadow: "rgba(57,217,223,0.16)",
    shadowStrong: "rgba(57,217,223,0.26)",
  },
  {
    accent: "#b9dd49",
    accentStrong: "#d8f16d",
    bannerGlow: "rgba(185,221,73,0.22)",
    border: "rgba(216,241,109,0.68)",
    connectionGlow: "rgba(185,221,73,0.2)",
    connectionStroke: "rgba(185,221,73,0.72)",
    glow: "rgba(185,221,73,0.16)",
    glowStrong: "rgba(185,221,73,0.24)",
    plaqueBackground: "rgba(24,27,8,0.92)",
    plaqueBorder: "rgba(216,241,109,0.38)",
    shadow: "rgba(185,221,73,0.14)",
    shadowStrong: "rgba(185,221,73,0.22)",
  },
  {
    accent: "#f2aa4a",
    accentStrong: "#ffc86f",
    bannerGlow: "rgba(242,170,74,0.24)",
    border: "rgba(255,200,111,0.7)",
    connectionGlow: "rgba(242,170,74,0.22)",
    connectionStroke: "rgba(242,170,74,0.74)",
    glow: "rgba(242,170,74,0.18)",
    glowStrong: "rgba(242,170,74,0.28)",
    plaqueBackground: "rgba(31,19,8,0.92)",
    plaqueBorder: "rgba(255,200,111,0.4)",
    shadow: "rgba(242,170,74,0.16)",
    shadowStrong: "rgba(242,170,74,0.26)",
  },
  {
    accent: "#bb7dff",
    accentStrong: "#d4a6ff",
    bannerGlow: "rgba(187,125,255,0.24)",
    border: "rgba(212,166,255,0.68)",
    connectionGlow: "rgba(187,125,255,0.22)",
    connectionStroke: "rgba(187,125,255,0.74)",
    glow: "rgba(187,125,255,0.18)",
    glowStrong: "rgba(187,125,255,0.28)",
    plaqueBackground: "rgba(20,10,31,0.92)",
    plaqueBorder: "rgba(212,166,255,0.4)",
    shadow: "rgba(187,125,255,0.16)",
    shadowStrong: "rgba(187,125,255,0.26)",
  },
  {
    accent: "#f06aa4",
    accentStrong: "#ff8ec0",
    bannerGlow: "rgba(240,106,164,0.24)",
    border: "rgba(255,142,192,0.72)",
    connectionGlow: "rgba(240,106,164,0.22)",
    connectionStroke: "rgba(240,106,164,0.76)",
    glow: "rgba(240,106,164,0.18)",
    glowStrong: "rgba(240,106,164,0.28)",
    plaqueBackground: "rgba(34,8,23,0.92)",
    plaqueBorder: "rgba(255,142,192,0.42)",
    shadow: "rgba(240,106,164,0.16)",
    shadowStrong: "rgba(240,106,164,0.26)",
  },
]);

export class BranchTheme {
  constructor(values) {
    this.values = values;
  }

  static fromPalette(rootIndex) {
    return new BranchTheme(ROOT_BRANCH_TONES[rootIndex % ROOT_BRANCH_TONES.length]);
  }

  bannerGlow() {
    return this.values.bannerGlow;
  }

  connectionGlow() {
    return this.values.connectionGlow;
  }

  connectionStroke() {
    return this.values.connectionStroke;
  }

  cssVariables() {
    return [
      `--branch-accent:${this.values.accent}`,
      `--branch-accent-strong:${this.values.accentStrong}`,
      `--branch-border:${this.values.border}`,
      `--branch-glow:${this.values.glow}`,
      `--branch-glow-strong:${this.values.glowStrong}`,
      `--branch-plaque-background:${this.values.plaqueBackground}`,
      `--branch-plaque-border:${this.values.plaqueBorder}`,
      `--branch-shadow:${this.values.shadow}`,
      `--branch-shadow-strong:${this.values.shadowStrong}`,
    ].join("; ");
  }
}
