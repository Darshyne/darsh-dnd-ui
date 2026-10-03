/**
 * La Frise : ordre du tour en haut de l'écran, en combat seulement (SPEC §7).
 *
 * Composant DOM posé dans #ui-top (pas une ApplicationV2 : pas de fenêtre, et les PV se rafraîchissent
 * portrait par portrait sans redessiner la frise). Aucun modèle propre : tout se relit sur le Combat du
 * cœur ; toute modification passe par les méthodes du cœur (rollInitiative, combatant.update, nextTurn…),
 * donc le tracker natif et la Frise restent synchronisés dans les deux sens.
 */
import { Portrait } from "./portrait.mjs";
import { reorder } from "../core/initiative.mjs";
import {
  viewedCombat, friezeWanted, entriesOf, nameFor, subtitleFor, initiativeVisible, tokenVisible,
  toggleDefeated, rollInitiativeFor
} from "../adapter/combat.mjs";
import { budgetOf } from "../adapter/engine.mjs";
import { iconEffectsOf } from "../adapter/actor.mjs";
import { loc, setting } from "../shared.mjs";

/** États montrés en pastille sur le portrait, du plus important au moins important. */
const STATUS_PRIORITY = [
  "unconscious", "paralyzed", "petrified", "stunned", "incapacitated", "concentrating", "invisible",
  "restrained", "grappled", "frightened", "charmed", "blinded", "prone", "poisoned"
];

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

export class Frieze {
  constructor() {
    this.element = document.createElement("section");
    this.element.id = "ddu-frieze";
    this.element.className = "ddu-frieze";
    this.element.hidden = true;
    /**
     * Portraits gardés d'un rendu à l'autre (par combattant) : un redessin (effet posé, tour qui change)
     * ne doit pas avaler le flash d'un changement de PV — dnd5e pose / retire « en sang » au même moment.
     * @type {Map<string, Portrait>}
     */
    this.portraits = new Map();
    this.hoveredId = null;
    this.highlighted = null;
    this.dragId = null;
    this.#listen();
  }

  /** Pose la Frise dans l'interface (une fois, au ready). */
  attach() {
    const host = document.getElementById("ui-top") ?? document.getElementById("interface") ?? document.body;
    host.prepend(this.element);
    this.#contextMenu();
  }

  /** Redessin groupé : plusieurs hooks dans la même frame ne coûtent qu'un rendu. */
  scheduleRender = foundry.utils.debounce(() => this.render(), 30);

  get combat() {
    return viewedCombat();
  }

  render() {
    const combat = this.combat;
    const show = setting("frieze") && friezeWanted(combat, { prepToPlayers: setting("friezePrepToPlayers") });
    this.element.hidden = !show;
    const entries = show ? entriesOf(combat, { hideDefeated: setting("friezeHideDefeated") }) : [];

    // Portraits des combattants partis : détruits ; les autres sont réutilisés par #slot.
    const keep = new Set(entries.map(e => e.combatant.id));
    for ( const [id, p] of this.portraits ) {
      if ( keep.has(id) && p.token === (entries.find(e => e.combatant.id === id).combatant.token ?? null) ) continue;
      p.destroy();
      this.portraits.delete(id);
    }
    this.element.replaceChildren();
    if ( !show ) return;
    this.element.classList.toggle("ddu-frieze--prep", !combat.started);
    this.element.classList.toggle("ddu-frieze--gm", game.user.isGM);

    const bar = document.createElement("div");
    bar.className = "ddu-frieze__bar";

    if ( setting("friezeRound") && combat.started ) {
      const round = document.createElement("div");
      round.className = "ddu-frieze__round";
      round.textContent = loc("Frieze.Round", { round: combat.round });
      bar.append(round);
    }

    const left = document.createElement("div");
    left.className = "ddu-frieze__ornament ddu-ornament--left";
    const track = document.createElement("ol");
    track.className = "ddu-frieze__track";
    for ( const entry of entries ) track.append(this.#slot(combat, entry));
    const right = document.createElement("div");
    right.className = "ddu-frieze__ornament ddu-ornament--right";
    bar.append(left, track, right, this.#controls(combat));

    const caption = document.createElement("div");
    caption.className = "ddu-frieze__caption";
    this.element.append(bar, caption);
    this.#updateCaption();

    // Garder le combattant actif visible quand la frise déborde.
    track.querySelector(".ddu-frieze__slot--active")?.scrollIntoView({ block: "nearest", inline: "center" });
  }

  /* -------------------------------------------- */
  /*  Construction                                */
  /* -------------------------------------------- */

  #slot(combat, { combatant, active, played }) {
    const li = document.createElement("li");
    li.className = "ddu-frieze__slot";
    li.dataset.combatantId = combatant.id;
    li.classList.toggle("ddu-frieze__slot--active", active);
    li.classList.toggle("ddu-frieze__slot--played", played);
    li.classList.toggle("ddu-frieze__slot--hidden", combatant.hidden);
    li.classList.toggle("ddu-frieze__slot--defeated", combatant.isDefeated);
    if ( game.user.isGM ) li.draggable = true;

    let portrait = this.portraits.get(combatant.id);
    if ( portrait ) {
      portrait.label = nameFor(combatant);
      portrait.refresh();   // flash seulement si les PV ont vraiment changé
    } else {
      portrait = new Portrait({
        token: combatant.token, actor: combatant.actor, shape: "card", showSide: true, label: nameFor(combatant)
      });
      portrait.element.classList.add("ddu-portrait--frieze");
      this.portraits.set(combatant.id, portrait);
    }
    li.append(portrait.element);

    const status = this.#statusIcon(combatant.actor);
    if ( status ) {
      const s = document.createElement("img");
      s.className = "ddu-frieze__status";
      s.src = status.img;
      s.alt = "";
      li.append(s);
    }

    // Initiative : pastille pour le MJ (cliquable) et pendant le lancer ; ailleurs dans l'infobulle.
    const hasInit = Number.isFinite(combatant.initiative);
    if ( hasInit && (game.user.isGM || !combat.started) && initiativeVisible(combatant, this.#initOpts) ) {
      const init = document.createElement("span");
      init.className = "ddu-frieze__init";
      init.textContent = formatInit(combatant.initiative);
      if ( game.user.isGM ) init.dataset.action = "editInitiative";
      li.append(init);
    }
    if ( !hasInit && combatant.isOwner ) {
      const roll = document.createElement("button");
      roll.type = "button";
      roll.className = "ddu-frieze__roll";
      roll.dataset.action = "rollInitiative";
      roll.dataset.tooltip = loc("Frieze.RollInitiative");
      roll.innerHTML = '<i class="fa-solid fa-dice-d20"></i>';
      li.append(roll);
    }

    const marker = document.createElement("span");
    marker.className = "ddu-frieze__marker";
    li.append(marker);

    li.dataset.tooltipHtml = this.#tooltip(combatant);
    li.dataset.tooltipDirection = "DOWN";
    return li;
  }

  get #initOpts() {
    return { enemyInitiative: setting("friezeEnemyInitiative") };
  }

  #statusIcon(actor) {
    if ( !actor ) return null;
    const effects = iconEffectsOf(actor);
    for ( const status of STATUS_PRIORITY ) {
      const effect = effects.find(e => e.statuses?.has(status));
      if ( effect ) return effect;
    }
    return null;
  }

  #tooltip(combatant) {
    const lines = [`<strong>${esc(nameFor(combatant))}</strong>`];
    const sub = subtitleFor(combatant);
    if ( sub ) lines.push(esc(sub));
    if ( Number.isFinite(combatant.initiative) && initiativeVisible(combatant, this.#initOpts) ) {
      lines.push(esc(loc("Frieze.InitiativeValue", { value: formatInit(combatant.initiative) })));
    }
    const budget = budgetOf(combatant);
    if ( budget ) {
      const pip = (on, kind, label) =>
        `<span class="ddu-pip ddu-pip--${kind}${on ? "" : " ddu-pip--spent"}" aria-label="${label}"></span>`;
      lines.push(`<span class="ddu-budget">${pip(budget.action, "action", loc("Budget.Action"))}`
        + `${pip(budget.bonus, "bonus", loc("Budget.Bonus"))}${pip(budget.reaction, "reaction", loc("Budget.Reaction"))}`
        + `${budget.attacksLeft ? ` <span>${esc(loc("Budget.Attacks", { n: budget.attacksLeft }))}</span>` : ""}</span>`);
    }
    const actor = combatant.actor;
    if ( actor && (game.user.isGM || combatant.isOwner || !combatant.hidden) ) {
      const names = iconEffectsOf(actor).map(e => esc(e.name));
      if ( names.length ) lines.push(`<em>${names.join(", ")}</em>`);
    }
    return `<div class="ddu-tooltip">${lines.join("<br>")}</div>`;
  }

  #controls(combat) {
    const box = document.createElement("div");
    box.className = "ddu-frieze__controls";
    const button = (action, icon, label) =>
      `<button type="button" data-action="${action}" data-tooltip="${esc(loc(label))}">`
      + `<i class="fa-solid ${icon}"></i></button>`;
    const html = [];
    if ( game.user.isGM ) {
      if ( !combat.started ) {
        html.push(button("rollAll", "fa-users", "Frieze.RollAll"));
        html.push(button("rollNPC", "fa-user-group", "Frieze.RollNPC"));
        html.push(button("resetAll", "fa-rotate-left", "Frieze.Reset"));
        html.push(button("startCombat", "fa-play", "Frieze.Start"));
      } else {
        html.push(button("previousRound", "fa-backward-fast", "Frieze.PreviousRound"));
        html.push(button("previousTurn", "fa-backward-step", "Frieze.PreviousTurn"));
        html.push(button("nextTurn", "fa-forward-step", "Frieze.NextTurn"));
        html.push(button("nextRound", "fa-forward-fast", "Frieze.NextRound"));
        html.push(button("endCombat", "fa-flag-checkered", "Frieze.End"));
      }
      html.push(button("openTracker", "fa-list", "Frieze.OpenTracker"));
    } else if ( combat.started && combat.combatant?.isOwner ) {
      html.push(button("endTurn", "fa-hourglass-end", "Frieze.EndTurn"));
    }
    box.innerHTML = html.join("");
    box.hidden = !html.length;
    return box;
  }

  #updateCaption() {
    const caption = this.element.querySelector(".ddu-frieze__caption");
    if ( !caption ) return;
    const combat = this.combat;
    const combatant = (this.hoveredId && combat?.combatants.get(this.hoveredId)) || combat?.combatant;
    if ( !combatant || !combatant.visible ) {
      caption.replaceChildren();
      return;
    }
    const sub = subtitleFor(combatant);
    caption.innerHTML = `<span class="ddu-frieze__name">${esc(nameFor(combatant))}</span>`
      + (sub ? ` <span class="ddu-frieze__sub">${esc(sub)}</span>` : "");
    for ( const li of this.element.querySelectorAll(".ddu-frieze__slot") ) {
      li.classList.toggle("ddu-frieze__slot--hover", li.dataset.combatantId === this.hoveredId);
    }
  }

  /* -------------------------------------------- */
  /*  Gestes                                      */
  /* -------------------------------------------- */

  #combatantOf(target) {
    const id = target?.closest?.("[data-combatant-id]")?.dataset.combatantId;
    return id ? this.combat?.combatants.get(id) ?? null : null;
  }

  #listen() {
    const el = this.element;
    el.addEventListener("click", event => this.#onClick(event));
    el.addEventListener("dblclick", event => {
      const combatant = this.#combatantOf(event.target);
      if ( combatant?.actor?.testUserPermission(game.user, "OBSERVER") ) combatant.actor.sheet.render(true);
    });
    el.addEventListener("pointerover", event => this.#onHover(event, true), { passive: true });
    el.addEventListener("pointerout", event => this.#onHover(event, false), { passive: true });

    // Glisser-déposer du MJ pour réordonner.
    el.addEventListener("dragstart", event => {
      const li = event.target.closest?.(".ddu-frieze__slot");
      if ( !li || !game.user.isGM ) return;
      this.dragId = li.dataset.combatantId;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", JSON.stringify({ type: "ddu-frieze", id: this.dragId }));
      li.classList.add("ddu-frieze__slot--dragging");
    });
    el.addEventListener("dragover", event => {
      if ( !this.dragId ) return;
      const li = event.target.closest?.(".ddu-frieze__slot");
      if ( !li ) return;
      event.preventDefault();
      this.#clearDropMarks();
      li.classList.add(this.#dropSide(event, li) === "before" ? "ddu-drop--before" : "ddu-drop--after");
    });
    el.addEventListener("dragleave", event => {
      if ( !el.contains(event.relatedTarget) ) this.#clearDropMarks();
    });
    el.addEventListener("drop", event => this.#onDrop(event));
    el.addEventListener("dragend", () => {
      this.dragId = null;
      this.#clearDropMarks();
      el.querySelector(".ddu-frieze__slot--dragging")?.classList.remove("ddu-frieze__slot--dragging");
    });
  }

  async #onClick(event) {
    const combat = this.combat;
    if ( !combat ) return;
    const actionEl = event.target.closest("[data-action]");
    const action = actionEl?.dataset.action;
    const combatant = this.#combatantOf(event.target);

    switch ( action ) {
      case "rollInitiative": return combatant && rollInitiativeFor(combat, combatant, event);
      case "editInitiative": return combatant && this.#editInitiative(actionEl, combatant);
      case "rollAll": return combat.rollAll();
      case "rollNPC": return combat.rollNPC();
      case "resetAll": return combat.resetAll();
      case "startCombat": return combat.startCombat();
      case "previousRound": return combat.previousRound();
      case "previousTurn": return combat.previousTurn();
      case "nextTurn": return combat.nextTurn();
      case "nextRound": return combat.nextRound();
      case "endCombat": return combat.endCombat();
      case "endTurn": return combat.combatant?.isOwner && combat.nextTurn();
      case "openTracker": return ui.combat.renderPopout();
    }

    // Clic sur un portrait : prendre le contrôle de son token si on le possède, puis centrer la vue.
    if ( !combatant || !tokenVisible(combatant) ) return;
    const token = combatant.token.object;
    if ( combatant.isOwner ) token.control({ releaseOthers: true });
    canvas.animatePan({ x: token.center.x, y: token.center.y });
  }

  #onHover(event, entering) {
    const li = event.target.closest?.(".ddu-frieze__slot");
    const related = event.relatedTarget?.closest?.(".ddu-frieze__slot");
    if ( !entering && li && related === li ) return;
    if ( entering && li && related === li ) return;
    this.highlighted?._onHoverOut?.(event);
    this.highlighted = null;
    this.hoveredId = entering ? li?.dataset.combatantId ?? null : null;
    if ( entering && li ) {
      // Surbrillance du token, comme le tracker natif (combat-tracker.mjs:555-564).
      const combatant = this.combat?.combatants.get(this.hoveredId);
      const token = combatant?.token?.object;
      if ( token && tokenVisible(combatant) && token._canHover(game.user, event) ) {
        token._onHoverIn(event, { hoverOutOthers: true });
        this.highlighted = token;
      }
    }
    this.#updateCaption();
  }

  /** Survol d'un token sur le canevas : surligner son portrait (sens inverse). */
  onTokenHover(token, hovered) {
    if ( this.element.hidden ) return;
    const combatant = this.combat?.getCombatantsByToken?.(token.document)?.[0]
      ?? this.combat?.combatants.find(c => c.tokenId === token.id);
    if ( !combatant ) return;
    if ( hovered ) this.hoveredId = combatant.id;
    else if ( this.hoveredId === combatant.id ) this.hoveredId = null;
    this.#updateCaption();
  }

  #editInitiative(pill, combatant) {
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "decimal";
    input.className = "ddu-frieze__init-input";
    input.value = Number.isFinite(combatant.initiative) ? String(combatant.initiative) : "";
    pill.replaceWith(input);
    input.focus();
    input.select();
    let done = false;
    const commit = async save => {
      if ( done ) return;
      done = true;
      const raw = input.value.trim().replace(",", ".");
      if ( save ) {
        const value = raw === "" ? null : Number(raw);
        if ( value === null || Number.isFinite(value) ) await combatant.update({ initiative: value });
      }
      this.render();
    };
    input.addEventListener("keydown", event => {
      // Entrée / Échap ne remontent pas : le moteur les écoute pour sa visée (SPEC §8.4).
      if ( event.key === "Enter" ) { event.preventDefault(); event.stopPropagation(); commit(true); }
      else if ( event.key === "Escape" ) { event.preventDefault(); event.stopPropagation(); commit(false); }
    });
    input.addEventListener("blur", () => commit(true));
  }

  #dropSide(event, li) {
    const box = li.getBoundingClientRect();
    return event.clientX < box.left + (box.width / 2) ? "before" : "after";
  }

  #clearDropMarks() {
    for ( const li of this.element.querySelectorAll(".ddu-drop--before, .ddu-drop--after") ) {
      li.classList.remove("ddu-drop--before", "ddu-drop--after");
    }
  }

  async #onDrop(event) {
    const id = this.dragId;
    this.dragId = null;
    const li = event.target.closest?.(".ddu-frieze__slot");
    const side = li ? this.#dropSide(event, li) : null;
    this.#clearDropMarks();
    const combat = this.combat;
    if ( !id || !li || !combat || !game.user.isGM ) return;
    event.preventDefault();

    const order = combat.turns.map(c => ({ id: c.id, initiative: c.initiative }));
    const from = order.findIndex(c => c.id === id);
    const target = order.findIndex(c => c.id === li.dataset.combatantId);
    if ( from < 0 || target < 0 ) return;
    let to = side === "before" ? target : target + 1;   // place dans la liste d'origine
    if ( from < to ) to -= 1;                           // … puis sans l'élément déplacé
    const updates = reorder(order, id, to);
    if ( !updates.length ) return;
    // Le cœur garde le combattant actif sur lui-même (Combatant._preUpdateOperation, combatant.mjs:249).
    await combat.updateEmbeddedDocuments("Combatant", updates.map(u => ({ _id: u.id, initiative: u.initiative })));
  }

  #contextMenu() {
    const combatantOf = target => this.#combatantOf(target);
    const gm = () => game.user.isGM;
    new foundry.applications.ux.ContextMenu(this.element, ".ddu-frieze__slot", [
      {
        label: "DDU.Frieze.Menu.Ping", icon: '<i class="fa-solid fa-bullseye"></i>',
        visible: target => tokenVisible(combatantOf(target) ?? {}),
        onClick: (_event, target) => {
          const c = combatantOf(target);
          if ( c && tokenVisible(c) ) canvas.ping(c.token.object.center);
        }
      },
      {
        label: "DDU.Frieze.Menu.Reroll", icon: '<i class="fa-solid fa-dice-d20"></i>',
        visible: target => !!combatantOf(target)?.isOwner,
        onClick: (event, target) => {
          const c = combatantOf(target);
          if ( c ) rollInitiativeFor(this.combat, c, event);
        }
      },
      {
        label: "DDU.Frieze.Menu.ClearInitiative", icon: '<i class="fa-solid fa-eraser"></i>',
        visible: gm,
        onClick: (_event, target) => combatantOf(target)?.update({ initiative: null })
      },
      {
        label: "DDU.Frieze.Menu.SetActive", icon: '<i class="fa-solid fa-play"></i>',
        visible: target => gm() && !!this.combat?.started && !!combatantOf(target),
        onClick: (_event, target) => {
          const index = this.combat.turns.findIndex(t => t.id === combatantOf(target)?.id);
          if ( index >= 0 ) this.combat.update({ turn: index });
        }
      },
      {
        label: "DDU.Frieze.Menu.ToggleHidden", icon: '<i class="fa-solid fa-eye-slash"></i>',
        visible: gm,
        onClick: (_event, target) => {
          const c = combatantOf(target);
          if ( c ) c.update({ hidden: !c.hidden });
        }
      },
      {
        label: "DDU.Frieze.Menu.ToggleDefeated", icon: '<i class="fa-solid fa-skull"></i>',
        visible: gm,
        onClick: (_event, target) => {
          const c = combatantOf(target);
          if ( c ) toggleDefeated(c);
        }
      },
      {
        label: "DDU.Frieze.Menu.Remove", icon: '<i class="fa-solid fa-trash"></i>',
        visible: gm,
        onClick: (_event, target) => combatantOf(target)?.delete()
      }
    ], { jQuery: false, fixed: true });
  }

  /** À l'entrée en combat : la valeur d'initiative au-dessus de chaque tête (BG3), sur ce client. */
  announceInitiative(combat) {
    if ( !setting("friezeInitiativeText") || !canvas.ready ) return;
    for ( const combatant of combat.turns ) {
      if ( !Number.isFinite(combatant.initiative) || !combatant.visible ) continue;
      if ( !initiativeVisible(combatant, this.#initOpts) || !tokenVisible(combatant) ) continue;
      const token = combatant.token.object;
      canvas.interface.createScrollingText(token.center, loc("Frieze.InitiativeText", {
        value: formatInit(combatant.initiative)
      }), {
        anchor: CONST.TEXT_ANCHOR_POINTS.TOP, direction: CONST.TEXT_ANCHOR_POINTS.TOP,
        distance: token.h, duration: 2500, fontSize: 28, fill: "#f2e8d5", stroke: 0x000000, strokeThickness: 4
      });
    }
  }
}

function formatInit(value) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}
