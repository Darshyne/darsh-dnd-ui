/**
 * §52 : la fenêtre de configuration des jeux d'armes, ouverte par l'engrenage sous les flèches de la Barre (demande de l'utilisateur,
 * 2026-10-24). Tous les jeux de l'acteur montré, un par ligne : la main principale (gauche) et la main secondaire (droite) en icônes,
 * qu'on remplit par glisser-déposer — depuis la réserve en bas de la fenêtre (armes, boucliers, sources de lumière de l'acteur), depuis
 * un autre emplacement, depuis la fiche ou la Barre ; un emplacement lâché sur la réserve se vide. « Prendre » met le jeu en main,
 * la corbeille le vide ; en tête, le nombre de jeux montrés par cet ordinateur (réglage client `weaponSets`). Tout passe par la Barre
 * (`setWeaponSlot`, `selectWeaponSet`) : mêmes règles que le glisser-déposer sur la Barre — main principale d'abord, arme à deux mains,
 * équipement du jeu en main.
 */
import { MODULE_ID, loc } from "../shared.mjs";
import { resolveRef, isTwoHanded, weaponSetCandidates } from "../adapter/items.mjs";
import { carriedLightOf } from "../adapter/engine.mjs";

const { ApplicationV2 } = foundry.applications.api;
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const ID = "ddu-weapon-sets";

export class WeaponSetsConfig extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: ID,
    classes: ["ddu-weapon-sets-window"],
    window: { title: "DDU.Bar.WeaponConfig", resizable: true, icon: "fa-solid fa-gear" },
    position: { width: 420, height: "auto" }
  };

  /**
   * La fenêtre ouverte, redessinée quand les jeux ont changé sur la Barre (un dépôt, la touche F) — pas à chaque dessin de la Barre ;
   * fermée si la Barre montre un autre acteur.
   */
  static refresh(bar) {
    const open = foundry.applications.instances.get(ID);
    if ( !open?.rendered ) return;
    if ( (open.bar !== bar) || (open.actor !== bar.actor) ) return open.close();
    if ( open.key !== open.#keyOf() ) open.render();
  }

  /** @param {import("./bar.mjs").Bar} bar */
  constructor(bar, options={}) {
    super(options);
    this.bar = bar;
    this.actor = bar.actor;
  }

  get title() {
    return loc("WeaponSets.Title", { name: this.actor?.name ?? "" });
  }

  /** Ce que la fenêtre montre : les jeux, leur nombre, les objets de l'acteur. */
  #keyOf() {
    return JSON.stringify([this.bar.layout?.weapons?.sets, this.bar.layout?.weapons?.active, this.bar.weaponSetCount, this.actor?.items?.size]);
  }

  async _renderHTML() {
    const bar = this.bar;
    this.key = this.#keyOf();
    const { sets, active } = bar.layout.weapons;
    const count = bar.weaponSetCount;
    const editable = bar.canArrange;
    const placed = new Set(sets.flat().filter(Boolean));
    const tile = (set, hand) => {
      const ref = sets[set]?.[hand] ?? null;
      const item = resolveRef(this.actor, ref)?.item;
      const main = resolveRef(this.actor, sets[set]?.[0])?.item;
      const blocked = (hand === 1) && !item && isTwoHanded(main);
      const tip = item ? item.name : blocked ? loc("Bar.TwoHandedOff", { name: main.name }) : loc(hand ? "WeaponSets.Off" : "WeaponSets.Main");
      const ghost = blocked ? main : null;
      return `<div class="ddu-weapon-sets__slot${blocked ? " ddu-blocked" : ""}${ghost ? " ddu-ghost" : ""}" data-set="${set}" data-hand="${hand}"
        ${item && editable ? 'draggable="true"' : ""} data-tooltip="${esc(tip)}">
        ${(item ?? ghost) ? `<img src="${esc((item ?? ghost).img)}" alt="" draggable="false">` : ""}</div>`;
    };
    const rows = Array.from({ length: count }, (_, s) => `
      <div class="ddu-weapon-sets__row${s === active ? " ddu-active" : ""}">
        <span class="ddu-weapon-sets__set">${esc(loc("WeaponSets.Set"))} ${s + 1}</span>
        <div class="ddu-weapon-sets__hands">${tile(s, 0)}${tile(s, 1)}</div>
        ${(s === active) ? `<strong class="ddu-weapon-sets__held">${esc(loc("WeaponSets.Held"))}</strong>`
          : `<button type="button" data-action="hold" data-set="${s}" ${bar.canEdit ? "" : "disabled"}>${esc(loc("WeaponSets.Hold"))}</button>`}
        <button type="button" class="ddu-weapon-sets__clear" data-action="clear" data-set="${s}" ${editable ? "" : "disabled"}
          data-tooltip="${esc(loc("WeaponSets.Clear"))}"><i class="fa-solid fa-trash"></i></button>
      </div>`).join("");
    const pool = weaponSetCandidates(this.actor, i => !!carriedLightOf(i)).map(i => `
      <div class="ddu-weapon-sets__item${placed.has(`Item.${i.id}`) ? " ddu-placed" : ""}" data-item="${i.id}" ${editable ? 'draggable="true"' : ""}
        data-tooltip="${esc(i.name)}"><img src="${esc(i.img)}" alt="" draggable="false"></div>`).join("");
    const counts = [2, 3, 4, 5, 6].map(n => `<option value="${n}" ${(n === Number(game.settings.get(MODULE_ID, "weaponSets"))) ? "selected" : ""}>${n}</option>`).join("");
    const root = document.createElement("div");
    root.className = "ddu-weapon-sets";
    root.innerHTML = `
      <label class="ddu-weapon-sets__count">${esc(loc("WeaponSets.Count"))} <select data-part="count">${counts}</select></label>
      <div class="ddu-weapon-sets__rows">${rows}</div>
      <div class="ddu-weapon-sets__pool" data-part="pool">
        <span class="ddu-weapon-sets__pool-label">${esc(loc("WeaponSets.Pool"))}</span>
        <div class="ddu-weapon-sets__items">${pool || `<em>${esc(loc("WeaponSets.None"))}</em>`}</div>
      </div>
      <p class="ddu-weapon-sets__hint">${esc(loc(editable ? "WeaponSets.Hint" : "WeaponSets.Locked"))}</p>`;
    return root;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  _onRender() {
    const el = this.element;
    el.querySelector("[data-part=count]")?.addEventListener("change", async ev => {
      await game.settings.set(MODULE_ID, "weaponSets", Number(ev.currentTarget.value));
      this.render();
    });
    for ( const button of el.querySelectorAll("button[data-action]") ) {
      button.addEventListener("click", async ev => {
        const set = Number(ev.currentTarget.dataset.set);
        if ( ev.currentTarget.dataset.action === "hold" ) await this.bar.selectWeaponSet(set);
        else {
          await this.bar.setWeaponSlot(set, 1, null);
          await this.bar.setWeaponSlot(set, 0, null);
        }
        this.render();
      });
    }
  }

  /** Les gestes de glisser-déposer, posés une fois sur la fenêtre (son contenu est remplacé à chaque dessin, pas elle). */
  _onFirstRender() {
    const el = this.element;
    // Glisser : depuis la réserve ou un emplacement — les données Foundry d'un objet (une fiche les comprend aussi), plus l'emplacement
    // d'origine pour un emplacement.
    el.addEventListener("dragstart", ev => {
      const from = ev.target.closest?.(".ddu-weapon-sets__slot[draggable], .ddu-weapon-sets__item[draggable]");
      if ( !from ) return;
      const slot = from.classList.contains("ddu-weapon-sets__slot") ? { set: Number(from.dataset.set), hand: Number(from.dataset.hand) } : null;
      const item = slot ? resolveRef(this.actor, this.bar.layout.weapons.sets[slot.set]?.[slot.hand])?.item : this.actor.items.get(from.dataset.item);
      if ( !item ) return;
      ev.dataTransfer.effectAllowed = "move";
      ev.dataTransfer.setData("text/plain", JSON.stringify({ type: "Item", uuid: item.uuid, dduWeaponSlot: slot }));
    });
    const targetOf = ev => ev.target.closest?.(".ddu-weapon-sets__slot:not(.ddu-blocked), [data-part=pool]");
    el.addEventListener("dragover", ev => {
      const target = targetOf(ev);
      if ( !target || !this.bar.canArrange ) return;
      ev.preventDefault();
      for ( const x of el.querySelectorAll(".ddu-drop") ) x.classList.remove("ddu-drop");
      target.classList.add("ddu-drop");
    });
    el.addEventListener("dragleave", ev => ev.target.closest?.(".ddu-drop")?.classList.remove("ddu-drop"));
    el.addEventListener("drop", ev => this.#onDrop(ev));
  }

  async #onDrop(ev) {
    const target = ev.target.closest?.(".ddu-weapon-sets__slot:not(.ddu-blocked), [data-part=pool]");
    for ( const x of this.element.querySelectorAll(".ddu-drop") ) x.classList.remove("ddu-drop");
    if ( !target || !this.bar.canArrange ) return;
    ev.preventDefault();
    ev.stopPropagation();
    // Une case glissée depuis la Barre : lâchée ici, elle n'est pas « lâchée hors de la Barre » (qui la retirerait de la grille).
    this.bar.dropped = true;
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(ev);
    const from = data?.dduWeaponSlot ?? null;
    if ( target.dataset.part === "pool" ) {
      if ( from ) await this.bar.setWeaponSlot(from.set, from.hand, null);
      return this.render();
    }
    const doc = data?.uuid ? await fromUuid(data.uuid) : null;
    const item = (doc?.documentName === "Item") ? doc : doc?.item;
    if ( !item || (item.parent !== this.actor) ) return ui.notifications.warn(loc("Bar.NotOwnedItem"));
    await this.bar.setWeaponSlot(Number(target.dataset.set), Number(target.dataset.hand), `Item.${item.id}`);
    this.render();
  }
}
