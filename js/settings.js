(() => {
  "use strict";

  const SOUND_KEY = "labz-sound";
  let soundOn = true;

  function readSoundSetting() {
    try {
      const saved = window.localStorage.getItem(SOUND_KEY);
      if (saved === "on") return true;
      if (saved === "off") return false;
      if (saved !== null) {
        console.warn("LAB-Z ignored an invalid sound setting and restored sound to on.");
      }
    } catch (error) {
      console.warn("LAB-Z could not read the sound setting; sound remains on.", error);
    }
    return true;
  }

  function notifySoundChange() {
    window.dispatchEvent(new CustomEvent("labz:soundchange", { detail: { soundOn } }));
  }

  function setSoundOn(value) {
    soundOn = Boolean(value);
    try {
      window.localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off");
    } catch (error) {
      console.warn("LAB-Z could not save the sound setting; this page will use the selected setting.", error);
    }
    notifySoundChange();
  }

  soundOn = readSoundSetting();
  window.addEventListener("storage", (event) => {
    if (event.key !== SOUND_KEY) return;
    soundOn = readSoundSetting();
    notifySoundChange();
  });

  window.LABZ = Object.assign(window.LABZ || {}, {
    isSoundOn: () => soundOn,
    setSoundOn
  });
})();
