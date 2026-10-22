import { describe, it, expect } from "vitest";
import { pathStyleOf } from "../module/scripts/core/path-style.mjs";

describe("tracé du chemin (§49)", () => {
  it("les trois choix se lisent tels quels", () => {
    expect(["flat", "soft", "dots"].map(pathStyleOf)).toEqual(["flat", "soft", "dots"]);
  });
  it("l'ancienne case à cocher : cochée → fondu, décochée → aplats ; inconnu → fondu (défaut)", () => {
    expect([true, "true", false, "false"].map(pathStyleOf)).toEqual(["soft", "soft", "flat", "flat"]);
    expect([undefined, null, "autre"].map(pathStyleOf)).toEqual(["soft", "soft", "soft"]);
  });
});
