import { describe, it, expect } from "vitest";
import { equipWeaponSet } from "../module/scripts/adapter/items.mjs";

/**
 * §52 : passer d'un jeu d'armes à l'autre. Les objets ne changent chez le client qu'au retour du serveur : deux bascules
 * rapprochées (touche pressée deux fois) doivent finir avec le dernier jeu demandé en main.
 */
function actorWith(equipped, { delay = 5, fail = 0 } = {}) {
  const items = new Map(Object.entries(equipped).map(([id, on]) => [id, { system: { equipped: on } }]));
  const sent = [];
  let failures = fail;
  return {
    items, sent,
    state: () => Object.fromEntries([...items].map(([id, i]) => [id, i.system.equipped])),
    updateEmbeddedDocuments: (_type, updates) => new Promise((resolve, reject) => setTimeout(() => {
      if ( failures-- > 0 ) return reject(new Error("refusé"));
      sent.push(updates);
      for ( const u of updates ) items.get(u._id).system.equipped = u["system.equipped"];
      resolve();
    }, delay))
  };
}

const sets = [["Item.sword", null], ["Item.bow", null]];

describe("§52 : équiper le jeu d'armes en main", () => {
  it("une bascule : le jeu choisi équipé, l'autre déséquipé, en une seule mise à jour", async () => {
    const actor = actorWith({ sword: true, bow: false, shield: true });
    await equipWeaponSet(actor, sets, 1);
    expect(actor.state()).toEqual({ sword: false, bow: true, shield: true });
    expect(actor.sent).toHaveLength(1);
  });

  it("déjà en main : aucune mise à jour", async () => {
    const actor = actorWith({ sword: true, bow: false });
    await equipWeaponSet(actor, sets, 0);
    expect(actor.sent).toHaveLength(0);
  });

  it("deux bascules avant le retour de la première : le dernier jeu demandé est en main", async () => {
    const actor = actorWith({ sword: true, bow: false });
    const first = equipWeaponSet(actor, sets, 1);
    const second = equipWeaponSet(actor, sets, 0);
    await Promise.all([first, second]);
    expect(actor.state()).toEqual({ sword: true, bow: false });
  });

  it("trois bascules d'affilée, puis une arme sortie du jeu : chacune part de l'état laissé par la précédente", async () => {
    const actor = actorWith({ sword: true, bow: false, axe: false });
    const three = [["Item.sword", null], ["Item.bow", null], ["Item.axe", null]];
    await Promise.all([
      equipWeaponSet(actor, three, 1), equipWeaponSet(actor, three, 2),
      equipWeaponSet(actor, [["Item.sword", null], ["Item.bow", null], [null, null]], 2, { released: ["Item.axe"] })
    ]);
    expect(actor.state()).toEqual({ sword: false, bow: false, axe: false });
  });

  it("une mise à jour refusée ne bloque pas la bascule suivante, et son appelant voit l'échec", async () => {
    const actor = actorWith({ sword: true, bow: false }, { fail: 1 });
    const first = equipWeaponSet(actor, sets, 1);
    const second = equipWeaponSet(actor, sets, 1);
    await expect(first).rejects.toThrow("refusé");
    await second;
    expect(actor.state()).toEqual({ sword: false, bow: true });
  });

  it("deux acteurs ne s'attendent pas l'un l'autre", async () => {
    const slow = actorWith({ sword: true, bow: false }, { delay: 40 });
    const fast = actorWith({ sword: true, bow: false }, { delay: 1 });
    const pending = equipWeaponSet(slow, sets, 1);
    await equipWeaponSet(fast, sets, 1);
    expect(fast.state()).toEqual({ sword: false, bow: true });
    expect(slow.state()).toEqual({ sword: true, bow: false });
    await pending;
  });
});
