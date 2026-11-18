import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Portrait } from "../module/scripts/apps/portrait.mjs";

/**
 * Un portrait gardé par sa zone mais sorti de la page (Groupe replié, Barre repliée) doit rester suivi : remis dans la page, il
 * suit de nouveau les PV de son acteur. Faux DOM minimal — juste ce que Portrait touche.
 */
function fakeElement() {
  const classes = new Set();
  const parts = new Map();
  const attrs = new Map();
  return {
    isConnected: false, hidden: false, dataset: {}, innerHTML: "", textContent: "", offsetWidth: 0,
    classList: {
      add: (...c) => c.forEach(x => classes.add(x)),
      remove: (...c) => c.forEach(x => classes.delete(x)),
      toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)),
      contains: c => classes.has(c)
    },
    style: { setProperty() {} },
    querySelector(selector) {
      if ( !parts.has(selector) ) parts.set(selector, fakeElement());
      return parts.get(selector);
    },
    querySelectorAll: () => [],
    addEventListener() {},
    append() {},
    remove() { this.isConnected = false; },
    getAttribute: k => attrs.get(k) ?? null,
    removeAttribute: k => attrs.delete(k)
  };
}

const actorWith = (id, value) => ({
  id, name: id, type: "npc", img: `${id}.webp`, statuses: new Set(),
  system: { attributes: { hp: { value, max: 30, temp: 0 } } }
});

describe("Portrait : suivi des portraits vivants", () => {
  const made = [];
  const portraitOf = actor => {
    const p = new Portrait({ actor, policy: "exact" });
    made.push(p);
    return p;
  };

  beforeEach(() => {
    globalThis.document = { createElement: fakeElement };
    globalThis.CONST = { DEFAULT_TOKEN: "icons/svg/mystery-man.svg", VIDEO_FILE_EXTENSIONS: { webm: "video/webm" } };
    globalThis.CONFIG = { specialStatusEffects: { DEFEATED: "dead" } };
    globalThis.canvas = { scene: null, tokens: { controlled: [] } };
    globalThis.game = {
      user: { isGM: true },
      settings: { get: () => "actor" },
      modules: { get: () => undefined },
      i18n: { localize: k => k, format: k => k }
    };
  });
  afterEach(() => {
    for ( const p of made.splice(0) ) p.destroy();
    for ( const k of ["document", "CONST", "CONFIG", "canvas", "game"] ) delete globalThis[k];
  });

  it("dans la page : suit les PV de son acteur", () => {
    const hero = actorWith("hero", 30);
    const portrait = portraitOf(hero);
    portrait.element.isConnected = true;
    hero.system.attributes.hp.value = 25;
    Portrait.refreshFor(hero);
    expect(portrait.health.value).toBe(25);
  });

  it("sorti de la page pendant qu'un autre acteur change, puis remis : suit toujours les PV", () => {
    const hero = actorWith("hero", 30);
    const other = actorWith("other", 30);
    const portrait = portraitOf(hero);
    portrait.element.isConnected = true;

    portrait.element.isConnected = false;      // le Groupe se replie : il garde le portrait, sans le poser
    Portrait.refreshFor(other);                // n'importe quel updateActor pendant ce temps
    portrait.element.isConnected = true;       // le Groupe se déplie et réutilise le même portrait
    portrait.refresh();

    hero.system.attributes.hp.value = 10;
    Portrait.refreshFor(hero);
    expect(portrait.health.value).toBe(10);
  });

  it("hors de la page : pas rafraîchi (le flash se rejouerait à son retour)", () => {
    const hero = actorWith("hero", 30);
    const portrait = portraitOf(hero);
    hero.system.attributes.hp.value = 10;
    Portrait.refreshFor(hero);
    expect(portrait.health.value).toBe(30);
  });

  it("détruit : n'est plus rafraîchi", () => {
    const hero = actorWith("hero", 30);
    const portrait = portraitOf(hero);
    portrait.element.isConnected = true;
    portrait.destroy();
    portrait.element.isConnected = true;
    hero.system.attributes.hp.value = 10;
    Portrait.refreshFor(hero);
    expect(portrait.health.value).toBe(30);
  });
});
