/** Issue #35 (moteur §381) : le sablier sur le Groupe et la Frise — qui est attendu, d'après la liste du moteur. */
import { describe, it, expect } from "vitest";
import { awaitedKeys, awaitedNames } from "../module/scripts/core/awaiting.mjs";

const list = [
  { token: "Scene.s.Token.tokA", actor: "Actor.actA", userName: "Alice", shown: "token" },
  { token: "Scene.s.Token.tokB", actor: "Scene.s.Token.tokB.Actor.actB", userName: "Gamemaster", shown: "banner" },
  { token: "Scene.s.Token.tokC", actor: "Actor.actC", userName: "Bob", shown: "none" },
  { token: "Scene.s.Token.tokD", actor: "Scene.s.Token.tokD.Actor.actD", userName: "Gamemaster", shown: "token" },
  { token: "Scene.s.Token.tokA", actor: "Actor.actA", userName: "Alice", shown: "token" }
];

describe("sablier du Groupe et de la Frise", () => {
  const keys = awaitedKeys(list);
  it("seul ce que le moteur montre sur le token : ni décision secrète du MJ, ni sablier masqué chez soi", () => {
    expect(awaitedNames(keys, { tokenId: "tokA" })).toEqual(["Alice"]);
    expect(awaitedNames(keys, { tokenId: "tokB" })).toBeNull();
    expect(awaitedNames(keys, { tokenId: "tokC", actorId: "actC" })).toBeNull();
  });
  it("le portrait du Groupe se reconnaît par l'acteur du monde ; un token non lié, par son token seul", () => {
    expect(awaitedNames(keys, { actorId: "actA" })).toEqual(["Alice"]);
    expect(awaitedNames(keys, { actorId: "actD" })).toBeNull();
    expect(awaitedNames(keys, { tokenId: "tokD" })).toEqual(["Gamemaster"]);
  });
  it("une liste vide ou absente (moteur ancien) : personne", () => {
    expect(awaitedNames(awaitedKeys(undefined), { tokenId: "tokA" })).toBeNull();
    expect(awaitedNames(awaitedKeys([]), { actorId: "actA" })).toBeNull();
  });
});
