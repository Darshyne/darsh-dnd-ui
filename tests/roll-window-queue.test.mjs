import { describe, it, expect, beforeAll, afterAll } from "vitest";

/**
 * §54 : les demandes de jet s'ouvrent une à la fois, à la file. Une fenêtre qui échoue ne doit pas emporter les suivantes : le moteur
 * tient une demande dont la promesse est rejetée pour répondue, sans jet.
 */
describe("§54 : file des fenêtres de jet", () => {
  let ask;

  beforeAll(async () => {
    const handlers = new Map();
    globalThis.Hooks = { on: (hook, fn) => handlers.set(hook, fn) };
    globalThis.game = { settings: { get: () => true } };
    const { registerRollWindow } = await import("../module/scripts/runtime/roll-window.mjs");
    registerRollWindow();
    ask = prompt => { handlers.get("dnd5e-combat.groupRollPrompt")(prompt); return prompt.result; };
  });
  afterAll(() => {
    for ( const k of ["Hooks", "game"] ) delete globalThis[k];
  });

  /** Une demande que la fenêtre ne sait pas ouvrir. */
  const broken = () => ({ get actor() { throw new Error("demande illisible"); } });
  /** Une demande dont le délai est passé pendant l'attente : pas de fenêtre, issue nulle. */
  const expired = () => ({ signal: { aborted: true } });

  it("une demande dont le délai est passé ne s'ouvre pas", async () => {
    await expect(ask(expired())).resolves.toBe(null);
  });

  it("une fenêtre qui échoue : sa demande le voit, les suivantes s'ouvrent quand même", async () => {
    const first = ask(broken());
    const second = ask(expired());
    await expect(first).rejects.toThrow("demande illisible");
    await expect(second).resolves.toBe(null);
    await expect(ask(expired())).resolves.toBe(null);
  });
});
