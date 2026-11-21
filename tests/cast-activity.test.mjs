import { describe, it, expect } from "vitest";
import { castActivity } from "../module/scripts/core/cells.mjs";
import { castActivityOf } from "../module/scripts/adapter/items.mjs";

/**
 * Issue #11 : un sort à plusieurs activités lancé depuis la Barre avec un emplacement déjà choisi. L'activité qui lance le sort a
 * un temps d'incantation ; une suite que le sort déclenche ensuite (des dégâts de plus à chaque attaque qui touche) n'en a pas.
 * Quand la donnée laisse à cette suite « dépense un emplacement » (la valeur par défaut de dnd5e), la Barre la prenait pour
 * l'incantation : des dégâts tout de suite, et pas de malédiction posée.
 */

/** Une activité telle que dnd5e la prépare sur un sort à emplacements : `slot` = sa case « dépense un emplacement ». */
const activity = (id, type, { time="", slot=true }={}) => ({ id, type, requiresSpellSlot: true, activation: { type: time },
  consumption: { spellSlot: slot } });
/** Un sort : ses activités dans l'ordre où dnd5e les range (`contents`). */
const spell = (...acts) => ({ type: "spell", system: { level: 1, activities: { contents: acts, size: acts.length } } });

describe("issue #11 : l'activité qui lance le sort, emplacement choisi", () => {
  it("donnée officielle : la suite ne dépense pas d'emplacement — l'incantation", () => {
    const item = spell(activity("lancer", "utility", { time: "bonus" }), activity("suite", "damage", { slot: false }),
      activity("deplacer", "utility", { time: "bonus", slot: false }));
    expect(castActivityOf(item)?.id).toBe("lancer");
  });

  it("la suite, rangée avant et laissée à « dépense un emplacement » : l'incantation quand même", () => {
    const item = spell(activity("suite", "damage"), activity("lancer", "utility", { time: "bonus" }),
      activity("deplacer", "utility", { time: "bonus", slot: false }));
    expect(castActivityOf(item)?.id).toBe("lancer");
  });

  it("deux façons de lancer (mur ou anneau) : la première, comme avant", () => {
    const item = spell(activity("mur", "save", { time: "action" }), activity("anneau", "save", { time: "action" }));
    expect(castActivityOf(item)?.id).toBe("mur");
  });

  it("aucune activité à temps d'incantation ne dépense l'emplacement : la première qui le dépense, comme avant", () => {
    const item = spell(activity("gratuite", "utility", { time: "action", slot: false }), activity("seule", "save"));
    expect(castActivityOf(item)?.id).toBe("seule");
  });

  it("rien ne dépense d'emplacement, ou pas d'activité : null (dnd5e pose sa question)", () => {
    expect(castActivityOf(spell(activity("a", "utility", { time: "action", slot: false })))).toBeNull();
    expect(castActivityOf(spell())).toBeNull();
    expect(castActivityOf(null)).toBeNull();
  });

  it("hors d'un lanceur à emplacements (`requiresSpellSlot` faux) : null", () => {
    const item = spell({ ...activity("lancer", "utility", { time: "bonus" }), requiresSpellSlot: false });
    expect(castActivityOf(item)).toBeNull();
  });
});

describe("castActivity (règle pure)", () => {
  it("la première qui dépense l'emplacement et a un temps d'incantation, sinon la première qui le dépense", () => {
    expect(castActivity([{ id: "a", slot: true, timed: false }, { id: "b", slot: true, timed: true }])).toBe("b");
    expect(castActivity([{ id: "a", slot: false, timed: true }, { id: "b", slot: true, timed: false }])).toBe("b");
    expect(castActivity([{ id: "a", slot: false, timed: true }])).toBeNull();
    expect(castActivity()).toBeNull();
  });
});
