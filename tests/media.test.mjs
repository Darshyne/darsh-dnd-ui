import { describe, it, expect } from "vitest";
import { isVideoSrc, stillFor } from "../module/scripts/core/media.mjs";

// Les extensions du cœur V14 (common/constants.mjs:1654).
const EXT = ["m4v", "mp4", "ogv", "webm"];

describe("isVideoSrc", () => {
  it("reconnaît les vidéos par leur extension, sans tenir compte de la casse ni de la requête", () => {
    expect(isVideoSrc("modules/jb2a_patreon/Library/2nd_Level/Spiritual_Weapon/SpiritualWeapon_Mace01_01_Spectral_Blue_200x200.webm", EXT)).toBe(true);
    expect(isVideoSrc("tokens/Goblin.WEBM", EXT)).toBe(true);
    expect(isVideoSrc("tokens/loop.mp4?v=3", EXT)).toBe(true);
    expect(isVideoSrc("https://example.org/a.m4v#t=2", EXT)).toBe(true);
  });
  it("laisse les images fixes", () => {
    expect(isVideoSrc("tokens/goblin.webp", EXT)).toBe(false);
    expect(isVideoSrc("icons/svg/mystery-man.svg", EXT)).toBe(false);
    expect(isVideoSrc("tokens/webm-fan.png", EXT)).toBe(false);
    expect(isVideoSrc("", EXT)).toBe(false);
    expect(isVideoSrc(null, EXT)).toBe(false);
    expect(isVideoSrc("a.webm", [])).toBe(false);
  });
});

describe("stillFor", () => {
  it("une image fixe passe telle quelle", () => {
    expect(stillFor({ src: "a.webp", extensions: EXT, fallback: "b.webp" })).toEqual({ src: "a.webp", video: false });
  });
  it("sans image, le repli", () => {
    expect(stillFor({ src: "", extensions: EXT, fallback: "b.webp" })).toEqual({ src: "b.webp", video: false });
  });
  it("une vidéo prend sa vignette déjà calculée", () => {
    expect(stillFor({ src: "a.webm", extensions: EXT, thumb: "data:image/webp;base64,x", fallback: "b.webp" }))
      .toEqual({ src: "data:image/webp;base64,x", video: false });
  });
  it("une vidéo sans vignette montre le repli et demande la vignette", () => {
    expect(stillFor({ src: "a.webm", extensions: EXT, fallback: "b.webp" })).toEqual({ src: "b.webp", video: true });
  });
  it("jamais une vidéo dans l'image, même en repli", () => {
    expect(stillFor({ src: "a.webm", extensions: EXT, fallback: "c.mp4" })).toEqual({ src: null, video: true });
    expect(stillFor({ src: "a.webm", extensions: EXT })).toEqual({ src: null, video: true });
  });
});
