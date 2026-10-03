/**
 * Aperçu des portraits (étape 1 du SPEC) : montre le portrait des tokens contrôlés sous ses trois formes
 * (Barre, Groupe, Frise) pour le vérifier en jeu avant que les zones existent. Ouvert par
 * `game.modules.get("darsh-dnd-ui").api.preview()`.
 */
import { Portrait } from "./portrait.mjs";
import { loc } from "../shared.mjs";

const { ApplicationV2 } = foundry.applications.api;

export class PortraitPreview extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "ddu-portrait-preview",
    classes: ["ddu-preview"],
    window: { title: "DDU.Preview.Title", resizable: true },
    position: { width: 520, height: "auto" }
  };

  /** @type {Portrait[]} */
  #portraits = [];

  /** Tokens contrôlés, sinon le personnage de l'utilisateur. */
  #subjects() {
    const tokens = canvas.tokens?.controlled.map(t => t.document).filter(t => t.actor) ?? [];
    if ( tokens.length ) return tokens.map(token => ({ token }));
    return game.user.character ? [{ actor: game.user.character }] : [];
  }

  async _renderHTML() {
    for ( const p of this.#portraits ) p.destroy();
    this.#portraits = [];
    const root = document.createElement("div");
    const subjects = this.#subjects();
    if ( !subjects.length ) {
      root.innerHTML = `<p class="ddu-preview__empty">${loc("Preview.Empty")}</p>`;
      return root;
    }
    for ( const subject of subjects ) {
      const row = document.createElement("div");
      row.className = "ddu-preview__row";
      const round = new Portrait({ ...subject, shape: "round" });
      const party = new Portrait({ ...subject, shape: "card" });
      const frieze = new Portrait({ ...subject, shape: "card", showSide: true });
      party.element.classList.add("ddu-portrait--party");
      frieze.element.classList.add("ddu-portrait--frieze");
      this.#portraits.push(round, party, frieze);
      const label = document.createElement("div");
      label.className = "ddu-preview__name";
      label.textContent = subject.token?.name ?? subject.actor.name;
      row.append(label, round.element, party.element, frieze.element);
      root.append(row);
    }
    return root;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  _onClose(options) {
    for ( const p of this.#portraits ) p.destroy();
    this.#portraits = [];
    super._onClose(options);
  }
}
