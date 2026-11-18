import { describe, it, expect } from "vitest";
import { valueBetween, reorder, hasPlayed } from "../module/scripts/core/initiative.mjs";

/** Applique des mises à jour puis trie comme le cœur (décroissant, égalité par id). */
function apply(order, updates) {
  const byId = new Map(updates.map(u => [u.id, u.initiative]));
  const list = order.map(c => ({ ...c, initiative: byId.has(c.id) ? byId.get(c.id) : c.initiative }));
  const val = v => (typeof v === "number" ? v : -Infinity);
  return list.sort((a, b) => (val(b.initiative) - val(a.initiative)) || (a.id > b.id ? 1 : -1)).map(c => c.id);
}

const order = [
  { id: "a", initiative: 20 },
  { id: "b", initiative: 15 },
  { id: "c", initiative: 14 },
  { id: "d", initiative: 8 }
];

describe("valueBetween", () => {
  it("un entier quand il y a la place", () => expect(valueBetween(20, 15)).toBe(17));
  it("une décimale sinon", () => expect(valueBetween(15, 14)).toBe(14.5));
  it("premier / dernier", () => {
    expect(valueBetween(null, 20)).toBe(21);
    expect(valueBetween(8, null)).toBe(7);
  });
  it("aucun repère", () => expect(valueBetween(null, null)).toBe(null));
  it("voisins égaux : un cran sous le précédent", () => expect(valueBetween(12, 12)).toBe(11.9));
});

describe("reorder", () => {
  it.each([
    ["d", 0, ["d", "a", "b", "c"]],
    ["a", 3, ["b", "c", "d", "a"]],
    ["d", 1, ["a", "d", "b", "c"]],
    ["a", 2, ["b", "c", "a", "d"]],
    ["b", 2, ["a", "c", "b", "d"]]
  ])("%s → place %i", (id, to, expected) => {
    expect(apply(order, reorder(order, id, to))).toEqual(expected);
  });

  it("ne touche qu'au combattant déplacé quand c'est possible", () => {
    expect(reorder(order, "d", 1)).toEqual([{ id: "d", initiative: 17 }]);
  });

  it("même place : rien", () => expect(reorder(order, "b", 1)).toEqual([]));

  it("égalités : repousse juste ce qu'il faut", () => {
    const tied = [
      { id: "a", initiative: 12 }, { id: "b", initiative: 12 }, { id: "c", initiative: 12 }, { id: "d", initiative: 5 }
    ];
    const updates = reorder(tied, "d", 1);
    expect(apply(tied, updates)).toEqual(["a", "d", "b", "c"]);
    expect(updates.every(u => ["d", "b", "c"].includes(u.id))).toBe(true);
  });

  it("égalités : le déplacé passe après son voisin même si son id trie avant", () => {
    const tied = [{ id: "a", initiative: 10 }, { id: "b", initiative: 10 }, { id: "c", initiative: 10 }];
    expect(apply(tied, reorder(tied, "a", 1))).toEqual(["b", "a", "c"]);
    expect(apply(tied, reorder(tied, "a", 2))).toEqual(["b", "c", "a"]);
    const pair = [{ id: "a", initiative: 14 }, { id: "b", initiative: 9 }, { id: "c", initiative: 9 }, { id: "z", initiative: 3 }];
    expect(apply(pair, reorder(pair, "a", 2))).toEqual(["b", "c", "a", "z"]);
  });

  // Propriété : quel que soit le tirage (peu de valeurs, donc beaucoup d'égalités), l'ordre obtenu après le tri du
  // cœur est celui demandé. Générateur à graine fixe : un échec se rejoue à l'identique.
  it("propriété : tout déplacement donne l'ordre demandé, égalités comprises", () => {
    let seed = 7;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const wrong = [];
    let moves = 0;
    for ( let n = 0; n < 20000; n++ ) {
      const size = 2 + Math.floor(rnd() * 5);
      const list = Array.from({ length: size }, (_, i) => ({
        id: `c${String.fromCharCode(97 + Math.floor(rnd() * 26))}${i}`,
        initiative: Math.floor(rnd() * 6) + 8
      }));
      const sorted = apply(list, []).map(id => list.find(c => c.id === id));
      const from = Math.floor(rnd() * size);
      const to = Math.floor(rnd() * size);
      if ( to === from ) continue;
      moves++;
      const id = sorted[from].id;
      const expected = sorted.filter(c => c.id !== id).map(c => c.id);
      expected.splice(to, 0, id);
      const got = apply(sorted, reorder(sorted, id, to));
      if ( got.join() !== expected.join() ) wrong.push({ sorted, id, to, got });
    }
    expect(moves).toBeGreaterThan(10000);
    expect(wrong.length, JSON.stringify(wrong[0])).toBe(0);
  });

  it("combattants sans initiative restent en bas", () => {
    const partial = [{ id: "a", initiative: 18 }, { id: "b", initiative: 11 }, { id: "x", initiative: null }];
    expect(apply(partial, reorder(partial, "x", 1))).toEqual(["a", "x", "b"]);
    expect(apply(partial, reorder(partial, "a", 1))).toEqual(["b", "a", "x"]);
  });
});

describe("hasPlayed", () => {
  it("avant le combattant actif, combat démarré", () => {
    expect(hasPlayed(0, 2, true)).toBe(true);
    expect(hasPlayed(2, 2, true)).toBe(false);
    expect(hasPlayed(0, 2, false)).toBe(false);
  });
});
