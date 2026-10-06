import { describe, it, expect } from "vitest";
import { smoothDamp, smoothDamp2D, settled, viewAhead } from "../module/scripts/core/camera.mjs";

/** Simule `seconds` à 60 images/s ; rend les positions successives. */
function run(from, to, { smoothTime=0.45, maxSpeed=1260, seconds=6 }={}) {
  let position = { ...from }, velocity = { x: 0, y: 0 };
  const track = [position];
  for ( let i = 0; i < seconds * 60; i++ ) {
    ({ position, velocity } = smoothDamp2D(position, to, velocity, smoothTime, maxSpeed, 1 / 60));
    track.push(position);
  }
  return { track, position, velocity };
}
const speeds = track => track.slice(1).map((p, i) => Math.hypot(p.x - track[i].x, p.y - track[i].y) * 60);

describe("caméra qui suit", () => {
  it("part en douceur (pas de saut à la première image)", () => {
    const { track } = run({ x: 0, y: 0 }, { x: 5000, y: 0 });
    expect(speeds(track)[0]).toBeLessThan(200);
  });
  it("ne dépasse jamais la vitesse maximale, même de loin", () => {
    const { track } = run({ x: 0, y: 0 }, { x: 8000, y: 6000 }, { seconds: 15 });
    expect(Math.max(...speeds(track))).toBeLessThanOrEqual(1260 * 1.01);
  });
  it("met plus de temps à rejoindre de loin que de près", () => {
    const arrive = to => run({ x: 0, y: 0 }, to, { seconds: 20 }).track.findIndex(p => Math.hypot(to.x - p.x, to.y - p.y) < 2);
    expect(arrive({ x: 8000, y: 0 })).toBeGreaterThan(arrive({ x: 500, y: 0 }) * 3);
  });
  it("arrive sans dépasser la cible ni osciller", () => {
    const { track, position, velocity } = run({ x: 0, y: 0 }, { x: 1000, y: 0 });
    expect(Math.max(...track.map(p => p.x))).toBeLessThanOrEqual(1000);
    expect(settled(position, { x: 1000, y: 0 }, velocity)).toBe(true);
  });
  it("une diagonale n'est pas plus rapide qu'une ligne droite", () => {
    const { track } = run({ x: 0, y: 0 }, { x: 9000, y: 9000 }, { seconds: 4 });
    expect(Math.max(...speeds(track))).toBeLessThanOrEqual(1260 * 1.01);
  });
  it("sans durée d'image, rien ne bouge", () => {
    expect(smoothDamp(10, 100, 3, 0.4, 50, 0)).toEqual({ value: 10, velocity: 3 });
  });
});

describe("vue déjà en avant du token", () => {
  it("vue plus près de l'arrivée que le token : elle reste", () => {
    expect(viewAhead({ x: 900, y: 0 }, { x: 0, y: 0 }, { x: 1000, y: 0 })).toBe(true);
  });
  it("vue derrière le token, ou loin de côté : elle suit", () => {
    expect(viewAhead({ x: -500, y: 0 }, { x: 0, y: 0 }, { x: 1000, y: 0 })).toBe(false);
    expect(viewAhead({ x: 1000, y: 3000 }, { x: 0, y: 0 }, { x: 1000, y: 0 })).toBe(false);
  });
});
