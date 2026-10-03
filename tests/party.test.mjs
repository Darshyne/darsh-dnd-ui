import { describe, it, expect } from "vitest";
import { orderMembers, moveMember, effectColumn } from "../module/scripts/core/party.mjs";

const m = (id, name) => ({ id, name });
const members = [m("c", "Clerc"), m("a", "Ariane"), m("r", "Roublard"), m("b", "Basile")];
const ids = list => list.map(x => x.id);

describe("orderMembers", () => {
  it("par nom sans ordre enregistré", () => {
    expect(ids(orderMembers(members))).toEqual(["a", "b", "c", "r"]);
  });
  it("ordre enregistré d'abord, les autres ensuite par nom", () => {
    expect(ids(orderMembers(members, ["r", "c"]))).toEqual(["r", "c", "a", "b"]);
  });
  it("le personnage du joueur en tête", () => {
    expect(ids(orderMembers(members, ["r", "c"], "c"))).toEqual(["c", "r", "a", "b"]);
  });
  it("ignore un id enregistré qui n'est plus là", () => {
    expect(ids(orderMembers(members, ["x", "b"]))).toEqual(["b", "a", "c", "r"]);
  });
});

describe("moveMember", () => {
  it("déplace vers le haut et vers le bas", () => {
    expect(moveMember(["a", "b", "c", "d"], "d", 0)).toEqual(["d", "a", "b", "c"]);
    expect(moveMember(["a", "b", "c", "d"], "a", 3)).toEqual(["b", "c", "d", "a"]);
  });
  it("membre inconnu : rien", () => {
    expect(moveMember(["a", "b"], "z", 0)).toEqual(["a", "b"]);
  });
});

describe("effectColumn", () => {
  it("concentration d'abord, reste compté", () => {
    const col = effectColumn([{ id: 1 }, { id: 2 }, { id: 3, concentration: true }, { id: 4 }, { id: 5 }]);
    expect(col.shown.map(e => e.id)).toEqual([3, 1, 2]);
    expect(col.more).toBe(2);
    expect(col.rest.map(e => e.id)).toEqual([4, 5]);
  });
});
