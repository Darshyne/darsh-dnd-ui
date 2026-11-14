import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useFromBar } from "../module/scripts/adapter/engine.mjs";

/**
 * §65 : un sort lancé depuis la barre passe par le moteur (`api.antimagic.use`) — dans un champ antimagie, dnd5e le refuse sans hook,
 * le moteur propose « le faire quand même » et prévient le MJ. Sans ce moteur (en veille, trop ancien), dnd5e tel quel.
 */
describe("§65 : barre et champ antimagie", () => {
  let api;
  const setEngine = (active, extra={}) => {
    api = { active, ...extra };
    globalThis.game = { modules: { get: id => (id === "dnd5e-combat" ? { active: true, api } : undefined) } };
  };
  const subject = () => ({ use: vi.fn(async () => "dnd5e") });

  beforeEach(() => setEngine(true));
  afterEach(() => { delete globalThis.game; });

  it("moteur actif avec api.antimagic.use : tout passe par lui, mêmes arguments", async () => {
    const use = vi.fn(async () => "moteur");
    setEngine(true, { antimagic: { use } });
    const activity = subject();
    const usage = { event: null, spell: { slot: "spell3" } };
    expect(await useFromBar(activity, usage, { configure: false })).toBe("moteur");
    expect(use).toHaveBeenCalledWith(activity, usage, { configure: false }, {});
    expect(activity.use).not.toHaveBeenCalled();
  });

  it("moteur sans api.antimagic (plus ancien) : dnd5e directement", async () => {
    const activity = subject();
    expect(await useFromBar(activity, { event: null })).toBe("dnd5e");
    expect(activity.use).toHaveBeenCalledWith({ event: null }, {}, {});
  });

  it("moteur en veille : dnd5e directement, même si l'API existe", async () => {
    const use = vi.fn();
    setEngine(false, { antimagic: { use } });
    const item = subject();
    await useFromBar(item, { event: null });
    expect(use).not.toHaveBeenCalled();
    expect(item.use).toHaveBeenCalled();
  });
});
