const victoryAssetUrl = new URL("../../assets/sfx/victory.wav", import.meta.url).href;

let victorySfxPromise = null;

export const victorySfx = {
  play: () => playVictorySfx(),
};

export async function playVictorySfx() {
  const audio = await getVictoryAudio();

  if (!audio) {
    return Promise.resolve();
  }

  audio.currentTime = 0;

  const playPromise = audio.play();

  if (playPromise && typeof playPromise.catch === "function") {
    return playPromise.catch(() => undefined);
  }

  return Promise.resolve();
}

async function getVictoryAudio() {
  if (typeof Audio === "undefined" || typeof fetch === "undefined") {
    return null;
  }

  if (!victorySfxPromise) {
    victorySfxPromise = fetch(victoryAssetUrl)
      .then((response) => {
        if (!response.ok) {
          return null;
        }

        return response.blob();
      })
      .then((audioBlob) => {
        if (!audioBlob) {
          return null;
        }

        return createAudioFrom(audioBlob);
      })
      .catch(() => null);
  }

  return victorySfxPromise;
}

function createAudioFrom(audioBlob) {
  const audio = new Audio(URL.createObjectURL(audioBlob));

  audio.preload = "auto";

  return audio;
}
