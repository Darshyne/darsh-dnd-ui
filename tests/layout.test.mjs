import { describe, it, expect } from "vitest";
import {
  emptyLayout, normalize, capacity, place, remove, move, populate, cleanup, resize, setRows,
  setWeapon, seedWeapons, totalColumns, formKey, populateTab, columnsOf, isMove, withdrawRefs, VERSION
} from "../module/scripts/core/layout.mjs";

describe("version 2 : passifs retirés", () => {
  it("retire des conteneurs automatiques, garde Personnalisé et Passifs, reste connu", () => {
    let layout = normalize({ v: 1, cells: { class: ["Item.p", "Item.a"], custom: ["Item.p"],
      tab_class: ["Item.p.Activity.x"], tab_passives: ["Item.p"] }, known: ["Item.p", "Item.a"] });
    expect(layout.v).toBe(1);
    layout = withdrawRefs(layout, new Set(["Item.p", "Item.p.Activity.x"]));
    expect(layout.v).toBe(VERSION);
    expect(layout.cells.class).toEqual([null, "Item.a"]);
    expect(layout.cells.tab_class).toEqual([null]);
    expect(layout.cells.custom).toEqual(["Item.p"]);
    expect(layout.cells.tab_passives).toEqual(["Item.p"]);
    expect(populate(layout, [{ ref: "Item.p", container: "class" }]).changed).toBe(false);
  });
  it("une disposition neuve est déjà à jour", () => {
    expect(normalize(null).v).toBe(VERSION);
  });
});

describe("onglets conteneurs", () => {
  it("remplis au départ, dans l'ordre, et prolongés au besoin", () => {
    const { layout, changed } = populateTab(emptyLayout(), "class", ["Item.a", "Item.b", "Item.c"]);
    expect(changed).toBe(true);
    expect(layout.cells.tab_class).toEqual(["Item.a", "Item.b", "Item.c"]);
    expect(layout.tabKnown.tab_class).toEqual(["Item.a", "Item.b", "Item.c"]);
  });
  it("réorganisés par le joueur, les nouveautés comblent les trous sans rien déplacer", () => {
    let { layout } = populateTab(emptyLayout(), "class", ["Item.a", "Item.b", "Item.c"]);
    layout = move(layout, { container: "tab_class", index: 0 }, { container: "tab_class", index: 5 });
    layout = populateTab(layout, "class", ["Item.a", "Item.b", "Item.c", "Item.d"]).layout;
    expect(layout.cells.tab_class).toEqual(["Item.d", "Item.b", "Item.c", null, null, "Item.a"]);
  });
  it("retiré à la main, ne revient pas", () => {
    let { layout } = populateTab(emptyLayout(), "items", ["Item.p"]);
    layout = remove(layout, "tab_items", 0);
    expect(populateTab(layout, "items", ["Item.p"]).changed).toBe(false);
  });
  it("nettoyés comme le reste", () => {
    const { layout } = populateTab(emptyLayout(), "passives", ["Item.x", "Item.y"]);
    const c = cleanup(layout, new Set(["Item.y"]));
    expect(c.layout.cells.tab_passives).toEqual([null, "Item.y"]);
    expect(c.layout.tabKnown.tab_passives).toEqual(["Item.y"]);
  });
  it("toute la largeur ; déplacement dans la vue par défaut, copie depuis un onglet", () => {
    expect(columnsOf(emptyLayout(), "tab_class")).toBe(14);
    expect(isMove("common", "class")).toBe(true);
    expect(isMove("tab_class", "tab_class")).toBe(true);
    expect(isMove("tab_class", "custom")).toBe(false);
    expect(isMove("tab_class", "common")).toBe(false);
  });
  it("aucune clé pointée (Foundry les développerait à l'écriture)", () => {
    expect(Object.keys(emptyLayout().cells).some(k => k.includes("."))).toBe(false);
  });
});

describe("formKey", () => {
  const druid = ["d1", "d2", "d3"];
  it("même forme, même clé, quel que soit l'ordre", () => {
    expect(formKey(["d1", "w1", "w2"], druid)).toBe(formKey(["w2", "d2", "w1"], druid));
  });
  it("formes différentes, clés différentes", () => {
    expect(formKey(["d1", "w1", "w2"], druid)).not.toBe(formKey(["d1", "b1"], druid));
  });
  it("sans objet propre à la forme : pas de clé", () => {
    expect(formKey(["d1", "d2"], druid)).toBe(null);
  });
  it("clé utilisable comme segment de flag (pas de point)", () => {
    expect(formKey(["x.y", "z"], [])).toMatch(/^f[0-9a-z]+$/);
  });
});

describe("normalize", () => {
  it("rend une disposition complète à partir de rien", () => {
    const l = normalize(undefined);
    expect(l.rows).toBe(2);
    expect(l.widths).toEqual({ common: 7, class: 5, items: 2 });
    expect(l.weapons.sets).toEqual([[null, null], [null, null]]);
  });
  it("borne les rangées et garde ce qui est connu", () => {
    const l = normalize({ rows: 9, widths: { common: 3 }, cells: { common: ["Item.a"] } });
    expect(l.rows).toBe(4);
    expect(l.widths.common).toBe(3);
    expect(l.widths.class).toBe(5);
    expect(l.cells.common).toEqual(["Item.a"]);
    expect(l.cells.custom).toEqual([]);
  });
});

describe("capacité", () => {
  it("colonnes × rangées ; Personnalisé prend toute la largeur", () => {
    const l = emptyLayout();
    expect(capacity(l, "common")).toBe(14);
    expect(totalColumns(l)).toBe(14);
    expect(capacity(l, "custom")).toBe(28);
  });
});

describe("placer, retirer, déplacer", () => {
  it("place loin sans trou manquant", () => {
    const l = place(emptyLayout(), "class", 3, "Item.x");
    expect(l.cells.class).toEqual([null, null, null, "Item.x"]);
  });
  it("retire", () => {
    const l = remove(place(emptyLayout(), "items", 0, "Item.p"), "items", 0);
    expect(l.cells.items[0]).toBe(null);
  });
  it("déplace vers une case vide, échange avec une case pleine", () => {
    let l = place(place(emptyLayout(), "common", 0, "Item.a"), "class", 1, "Item.b");
    l = move(l, { container: "common", index: 0 }, { container: "class", index: 1 });
    expect(l.cells.common[0]).toBe("Item.b");
    expect(l.cells.class[1]).toBe("Item.a");
    l = move(l, { container: "class", index: 1 }, { container: "items", index: 2 });
    expect(l.cells.class[1]).toBe(null);
    expect(l.cells.items[2]).toBe("Item.a");
  });
  it("ne modifie jamais l'original", () => {
    const l = emptyLayout();
    place(l, "common", 0, "Item.a");
    expect(l.cells.common).toEqual([]);
  });
});

describe("populate", () => {
  const entries = [
    { ref: "Item.sword", container: "common" },
    { ref: "Item.bless", container: "class" },
    { ref: "Item.potion", container: "items" }
  ];
  it("remplit les premières places libres et retient", () => {
    const { layout, changed } = populate(emptyLayout(), entries);
    expect(changed).toBe(true);
    expect(layout.cells.common[0]).toBe("Item.sword");
    expect(layout.cells.class[0]).toBe("Item.bless");
    expect(layout.known).toEqual(["Item.sword", "Item.bless", "Item.potion"]);
  });
  it("ne déplace pas ce que le joueur a posé", () => {
    const start = place(emptyLayout(), "class", 0, "Item.custom");
    const { layout } = populate(start, entries);
    expect(layout.cells.class).toEqual(["Item.custom", "Item.bless"]);
  });
  it("une entrée retirée à la main ne revient pas", () => {
    let { layout } = populate(emptyLayout(), entries);
    layout = remove(layout, "class", 0);
    const again = populate(layout, entries);
    expect(again.changed).toBe(false);
    expect(again.layout.cells.class[0]).toBe(null);
  });
  it("conteneur plein : l'entrée attend", () => {
    let l = setRows(emptyLayout(), 1);
    l = resize(l, "items", "class", -1);         // items : 1 colonne
    l = place(l, "items", 0, "Item.full");
    const { layout, changed } = populate(l, [{ ref: "Item.potion", container: "items" }]);
    expect(changed).toBe(false);
    expect(layout.known).not.toContain("Item.potion");
  });
});

describe("cleanup", () => {
  it("oublie les références disparues, garde les macros", () => {
    let l = place(place(emptyLayout(), "common", 0, "Item.gone"), "common", 1, "Macro.m");
    l = setWeapon(l, 0, 0, "Item.gone");
    l.known.push("Item.gone");
    const { layout, changed } = cleanup(l, new Set(["Item.kept"]));
    expect(changed).toBe(true);
    expect(layout.cells.common).toEqual([null, "Macro.m"]);
    expect(layout.known).toEqual([]);
    expect(layout.weapons.sets[0][0]).toBe(null);
  });
});

describe("resize, rangées", () => {
  it("la barre rouge prend à l'un ce qu'elle donne à l'autre", () => {
    const l = resize(emptyLayout(), "common", "class", 2);
    expect(l.widths).toEqual({ common: 9, class: 3, items: 2 });
  });
  it("jamais moins d'une colonne", () => {
    const l = emptyLayout();
    expect(resize(l, "class", "items", 2)).toBe(l);
  });
  it("1 à 4 rangées", () => {
    expect(setRows(emptyLayout(), 0).rows).toBe(1);
    expect(setRows(emptyLayout(), 7).rows).toBe(4);
  });
});

describe("armes", () => {
  it("une arme n'est que dans une main à la fois", () => {
    let l = setWeapon(emptyLayout(), 0, 0, "Item.axe");
    l = setWeapon(l, 1, 1, "Item.axe");
    expect(l.weapons.sets).toEqual([[null, null], [null, "Item.axe"]]);
  });
  it("premier remplissage : équipées puis une arme à distance", () => {
    const { layout, changed } = seedWeapons(emptyLayout(), [
      { ref: "Item.sword", equipped: true, ranged: false },
      { ref: "Item.shield", equipped: true, ranged: false },
      { ref: "Item.bow", equipped: false, ranged: true }
    ]);
    expect(changed).toBe(true);
    expect(layout.weapons.sets).toEqual([["Item.sword", "Item.shield"], ["Item.bow", null]]);
  });
  it("ne réécrit pas des jeux déjà remplis", () => {
    const l = setWeapon(emptyLayout(), 1, 0, "Item.bow");
    expect(seedWeapons(l, [{ ref: "Item.sword", equipped: true }]).changed).toBe(false);
  });
});
