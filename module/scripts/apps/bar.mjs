/**
 * La Barre : HUD du bas façon BG3 (SPEC §5).
 *
 *   [d20] (portrait) [armes] | filtres au-dessus | grille à conteneurs + barres rouges | [verrou + −] (Fin du tour)
 *                            | onglets en dessous                                        |
 *
 * Composant DOM posé dans #ui-bottom. Toute action passe par le système : `activity.use()` / `item.use()`
 * (le moteur de combat s'y branche), `combat.nextTurn()`, `actor.shortRest()`… La disposition (cases,
 * largeurs, rangées, jeux d'armes) est un flag de l'acteur, modifié par glisser-déposer.
 */
import { Portrait } from "./portrait.mjs";
import { D20Panel } from "./d20.mjs";
import { shortTooltip, fullTooltip } from "./tooltip.mjs";
import {
  CONTAINERS, TABS, tabContainer, isMove, normalize, columnsOf, place, remove, move, populate, populateTab, cleanup, withdrawRefs, VERSION,
  resize, setRows, setWeapon, setActiveWeapons, seedWeapons
} from "../core/layout.mjs";
import { roman, matchesFilter } from "../core/cells.mjs";
import {
  refOf, resolveRef, validRefs, inactiveRefs, autoEntries, tabRefs, classLabel, slotsOf, hasCantrips, classResources,
  cellView, weaponsOf, equipWeaponSet, enchantmentsOf
} from "../adapter/items.mjs";
import { iconEffectsOf } from "../adapter/actor.mjs";
import { layoutHost, readLayout, writeLayout } from "../adapter/forms.mjs";
import { viewedCombat, nameFor } from "../adapter/combat.mjs";
import { combatantOf, currentActor } from "../adapter/party.mjs";
import { budgetOf, movementOf, multiattackOf, lightOf } from "../adapter/engine.mjs";
import { MODULE_ID, loc, setting } from "../shared.mjs";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** Touches des 12 premières cases de l'onglet Personnalisé (BG3 : 1 – 0, -, =). */
export const CUSTOM_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="];

export class Bar {
  constructor() {
    this.element = document.createElement("section");
    this.element.id = "ddu-bar";
    this.element.className = "ddu-bar";
    this.element.hidden = true;
    this.actor = null;
    this.portrait = null;
    this.tab = "default";
    this.filter = null;
    this.layout = null;
    this.drag = null;          // { kind: "cell"|"weapon", container, index, set, hand, ref }
    this.dropped = false;
    this.d20 = new D20Panel(this);
    this.#listen();
  }

  attach() {
    const host = document.getElementById("ui-bottom") ?? document.getElementById("interface") ?? document.body;
    host.prepend(this.element);
    this.menu ??= this.#contextMenu();
  }

  scheduleRender = foundry.utils.debounce(() => this.render(), 40);

  /* -------------------------------------------- */
  /*  Données                                     */
  /* -------------------------------------------- */

  /** Acteur montré : le token contrôlé (s'il le possède, ou MJ), sinon son personnage. */
  #pickActor() {
    const actor = currentActor();
    if ( !actor ) return null;
    if ( !(game.user.isGM || actor.testUserPermission(game.user, "OBSERVER")) ) return null;
    if ( !["character", "npc"].includes(actor.type) ) return null;
    return actor;
  }

  /** Peut agir et réarranger : propriétaire de l'acteur montré et de celui qui porte la disposition. */
  get canEdit() {
    return !!this.actor?.isOwner && (this.host?.host?.isOwner ?? true);
  }

  get locked() {
    return !!this.layout?.locked || (!game.user.isGM && setting("barLockPlayers"));
  }

  /**
   * Peut changer la disposition des icônes : ni verrou, ni lecture seule. Le verrou fige tout (demande de
   * l'utilisateur, 2026-09-27) : glisser, déposer, retirer, barres rouges. Utiliser les cases, changer de jeu
   * d'armes et le nombre de rangées restent libres.
   */
  get canArrange() {
    return this.canEdit && !this.locked;
  }

  /**
   * Lit la disposition, retire ce qui n'existe plus, place les nouveautés ; enregistre si besoin. Un acteur
   * transformé a la sienne par forme, rangée sur l'acteur d'origine (adapter/forms.mjs).
   */
  #loadLayout(actor) {
    let layout = normalize(readLayout(this.host));
    let dirty = false;
    const c = cleanup(layout, validRefs(actor));
    if ( c.changed ) { layout = c.layout; dirty = true; }
    if ( layout.v < VERSION ) { layout = withdrawRefs(layout, inactiveRefs(actor)); dirty = true; }
    const p = populate(layout, autoEntries(actor));
    if ( p.changed ) { layout = p.layout; dirty = true; }
    for ( const tab of TABS ) {
      const t = populateTab(layout, tab, tabRefs(actor, tab));
      if ( t.changed ) { layout = t.layout; dirty = true; }
    }
    const w = seedWeapons(layout, weaponsOf(actor));
    if ( w.changed ) { layout = w.layout; dirty = true; }
    if ( dirty && this.canEdit ) this.#save(layout);
    return layout;
  }

  /**
   * Écriture groupée de la disposition. Tant qu'elle n'est pas partie et revenue, la disposition locale fait
   * foi : sinon l'`updateActor` d'une écriture précédente relirait un flag plus ancien et annulerait le
   * dernier geste (bogue vu en jeu : verrou, rangée et barre rouge revenaient en arrière).
   */
  #save(layout) {
    this.pending = true;
    this.#flush(this.host, layout);
  }

  #flush = foundry.utils.debounce(async (host, layout) => {
    try {
      await writeLayout(host, layout);
    } finally {
      if ( this.layout === layout ) this.pending = false;
    }
  }, 250);

  /** Change la disposition : affichage immédiat, écriture groupée. */
  #update(layout) {
    if ( !this.canEdit || layout === this.layout ) return;
    this.layout = layout;
    this.#save(layout);
    this.render({ keepLayout: true });
  }

  #context() {
    const actor = this.actor;
    const combat = viewedCombat();
    const combatant = combatantOf(actor, combat);
    const inCombat = !!(combat?.started && combatant);
    const myTurn = inCombat && combat.combatant?.id === combatant.id;
    return {
      combat, combatant, inCombat, myTurn,
      budget: inCombat ? budgetOf(combatant) : null,
      slots: slotsOf(actor),
      multi: inCombat ? multiattackOf(actor) : null
    };
  }

  /* -------------------------------------------- */
  /*  Rendu                                       */
  /* -------------------------------------------- */

  render({ keepLayout = false } = {}) {
    const actor = setting("bar") ? this.#pickActor() : null;
    if ( actor !== this.actor ) {
      this.portrait?.destroy();
      this.portrait = null;
      this.tab = "default";
      this.filter = null;
      this.pending = false;
      this.d20.close();
      // Calculé une fois par acteur montré : un objet ramassé en forme animale ne doit pas changer de clé.
      this.host = actor ? layoutHost(actor) : null;
    } else if ( this.pending ) keepLayout = true;   // une écriture est en route : garder le dernier geste
    this.actor = actor;
    this.element.hidden = !actor;
    this.#closePopup();
    if ( !actor ) {
      this.element.replaceChildren();
      return;
    }
    if ( !keepLayout || !this.layout ) this.layout = this.#loadLayout(actor);
    const ctx = this.#context();
    this.ctx = ctx;

    this.portrait ??= new Portrait({ actor, shape: "round", policy: "exact" });
    this.portrait.refresh({ flash: false });

    this.element.classList.toggle("ddu-bar--locked", this.locked);
    this.element.classList.toggle("ddu-bar--readonly", !this.canEdit);
    // Tour d'un personnage que l'on joue : la Barre ne s'estompe pas (demande de l'utilisateur, 2026-10-01).
    this.element.classList.toggle("ddu-bar--turn", ctx.myTurn && this.canEdit);
    this.element.replaceChildren(
      this.#left(ctx),
      this.#center(ctx),
      this.#rowControls(),
      this.#endButton(ctx)
    );
  }

  #left() {
    const box = document.createElement("div");
    box.className = "ddu-bar__left";

    const d20 = document.createElement("button");
    d20.type = "button";
    d20.className = "ddu-bar__d20 ddu-frame ddu-frame--d20";
    d20.dataset.action = "d20";
    d20.dataset.tooltip = loc("Bar.Checks");
    d20.innerHTML = '<i class="fa-solid fa-dice-d20"></i>';

    const portraitBox = document.createElement("div");
    portraitBox.className = "ddu-bar__portrait";
    portraitBox.dataset.action = "portrait";
    portraitBox.append(this.portrait.element);
    const ac = this.actor.system.attributes?.ac?.value;
    const speed = this.actor.system.attributes?.movement?.walk;
    portraitBox.dataset.tooltip = [this.actor.name, this.host?.key ? loc("Bar.Form", { name: this.host.form }) : null,
      ac ? `${loc("Bar.AC")} ${ac}` : null,
      speed ? `${loc("Bar.Speed")} ${speed}` : null].filter(Boolean).join(" · ");

    const conc = this.#concentration();
    if ( conc ) portraitBox.append(conc);
    const light = document.createElement("div");
    light.className = "ddu-bar__light ddu-frame ddu-frame--light";
    portraitBox.append(light);
    this.#fillLight(light);
    if ( game.user.isGM ) portraitBox.append(...this.#gmButtons());

    box.append(d20, portraitBox, this.#weapons());
    return box;
  }

  /** Boutons du MJ autour du portrait : soigner (PV au maximum) en haut à gauche, tuer (0 PV) en bas à droite. */
  #gmButtons() {
    return [["gmHeal", "heal", "fa-heart-pulse", "Bar.GMHeal"], ["gmKill", "kill", "fa-skull", "Bar.GMKill"]]
      .map(([action, kind, icon, key]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `ddu-bar__gm ddu-bar__gm--${kind} ddu-frame ddu-frame--gm`;
        button.dataset.action = action;
        button.dataset.tooltip = loc(key);
        button.setAttribute("aria-label", loc(key));
        button.innerHTML = `<i class="fa-solid ${icon}"></i>`;
        return button;
      });
  }

  /**
   * Écrit les PV par une simple mise à jour : le moteur réagit au changement de PV (son runtime/death.mjs : à 0, Mort
   * ou Inconscient selon la créature ; au-dessus, il retire ses états Mort et Stabilisé), comme le système
   * (`updateDowned`). PV max effectifs = max + max temporaires (dnd5e data/actor/templates/attributes.mjs:468).
   */
  #setHP(full) {
    const hp = this.actor?.system.attributes?.hp;
    if ( !game.user.isGM || !hp ) return;
    const value = full ? Math.max(0, hp.effectiveMax ?? hp.max ?? 0) : 0;
    if ( hp.value === value ) return;
    return this.actor.update({ "system.attributes.hp.value": value });
  }

  /** Token du personnage de la Barre sur la scène : le contrôlé s'il le porte, sinon le premier. */
  #token() {
    const controlled = canvas.tokens?.controlled.find(t => t.actor === this.actor);
    return controlled ?? this.actor?.getActiveTokens?.(false, false)?.[0] ?? null;
  }

  /**
   * Témoin de luminosité (soleil, demi-lune, lune) : calcul et infobulle du moteur (adapter/engine `lightOf`), affiché
   * si le moteur est là et que son réglage client « Indicateur de lumière » est actif.
   */
  #fillLight(el) {
    const state = lightOf(this.#token());
    el.hidden = !(state?.enabled);
    if ( el.hidden ) return;
    if ( el.dataset.key !== state.key ) {
      el.dataset.key = state.key;
      el.innerHTML = `<i class="fa-solid ${state.icon}"></i>`;
    }
    el.dataset.tooltipHtml = state.tooltip;
    el.dataset.tooltipDirection = "UP";
    el.setAttribute("aria-label", state.name);
  }

  /** Recalcul du seul témoin de lumière (l'éclairage change souvent : pas de redessin complet). */
  refreshLight = foundry.utils.debounce(() => {
    const el = this.element.querySelector(".ddu-bar__light");
    if ( el && this.actor ) this.#fillLight(el);
  }, 150);

  #concentration() {
    const effect = [...(this.actor.concentration?.effects ?? [])][0];
    if ( !effect ) return null;
    const itemData = effect.getFlag?.("dnd5e", "item");
    const item = itemData?.id ? this.actor.items.get(itemData.id) : null;
    const el = document.createElement("div");
    el.className = "ddu-bar__concentration ddu-frame ddu-frame--concentration";
    el.dataset.tooltip = loc("Bar.Concentration", { name: item?.name ?? effect.name });
    el.innerHTML = `<img src="${esc(item?.img ?? effect.img)}" alt="">`
      + (this.canEdit ? `<button type="button" data-action="endConcentration" aria-label="${esc(loc("Bar.EndConcentration"))}">`
        + '<i class="fa-solid fa-xmark"></i></button>' : "");
    return el;
  }

  #weapons() {
    const { sets, active } = this.layout.weapons;
    const box = document.createElement("div");
    box.className = "ddu-bar__weapons ddu-frame ddu-frame--weapons";
    const slot = (set, hand, big) => {
      const ref = sets[set][hand];
      const r = resolveRef(this.actor, ref);
      const item = r?.item;
      const twoHanded = !item && hand === 1 && resolveRef(this.actor, sets[set][0])?.item?.system.properties?.has?.("two");
      const ghost = twoHanded ? resolveRef(this.actor, sets[set][0]).item : null;
      const img = item?.img ?? ghost?.img;
      const enchant = enchantmentsOf(item);
      const tip = item ? (enchant.length ? `${item.name} — ${loc("Bar.Enchanted", { names: enchant.join(", ") })}` : item.name)
        : loc(hand ? "Bar.OffHand" : "Bar.MainHand");
      return `<div class="ddu-weapon ${big ? "ddu-weapon--big" : "ddu-weapon--small"}${ghost ? " ddu-weapon--ghost" : ""}"
        data-weapon-set="${set}" data-weapon-hand="${hand}" ${big ? 'data-action="useWeapon"' : ""}
        ${item && this.canArrange ? 'draggable="true"' : ""} data-tooltip="${esc(tip)}">
        ${img ? `<img src="${esc(img)}" alt="" draggable="false">` : ""}${enchant.length ? '<span class="ddu-enchant"></span>' : ""}</div>`;
    };
    box.innerHTML = `<div class="ddu-weapons__active">${slot(active, 0, true)}${slot(active, 1, true)}</div>`
      + [0, 1].map(s => `<div class="ddu-weapons__set${s === active ? " ddu-weapons__set--active" : ""}"
          data-action="switchWeapons" data-weapon-set="${s}" data-tooltip="${esc(loc("Bar.WeaponSet", { n: s + 1 }))}">
          ${slot(s, 0, false)}${slot(s, 1, false)}</div>`).join("");
    return box;
  }

  #center(ctx) {
    const box = document.createElement("div");
    box.className = "ddu-bar__center";
    const top = document.createElement("div");
    top.className = "ddu-bar__top";
    top.append(this.#filters(ctx), this.#effects());
    box.append(top, this.#grid(ctx), this.#tabs());
    return box;
  }

  #filters(ctx) {
    const box = document.createElement("div");
    box.className = "ddu-bar__filters ddu-frame ddu-frame--filters";
    const f = this.filter;
    const budget = ctx.budget;
    const pip = (kind, on) => `<button type="button" class="ddu-filter${f === kind ? " ddu-filter--on" : ""}"
      data-action="filter" data-filter="${kind}" data-tooltip="${esc(loc(`Bar.Filter.${kind}`))}">
      <span class="ddu-pip ddu-pip--${kind}${on === false ? " ddu-pip--spent" : ""}"></span></button>`;
    let html = pip("action", budget ? budget.action : undefined)
      + pip("bonus", budget ? budget.bonus : undefined)
      + pip("reaction", budget ? budget.reaction : undefined);
    for ( const s of ctx.slots ) {
      const on = typeof f === "object" && f?.level === s.level && !s.pact;
      html += `<button type="button" class="ddu-filter ddu-filter--slot${on ? " ddu-filter--on" : ""}${s.pact ? " ddu-filter--pact" : ""}"
        data-action="filter" data-filter="level" data-level="${s.level}" data-slot="${s.key}"
        data-tooltip="${esc(loc(s.pact ? "Bar.Filter.pact" : "Bar.Filter.level", { level: s.level, value: s.value, max: s.max }))}">
        <span class="ddu-filter__level">${s.pact ? "P" : roman(s.level)}</span>
        <span class="ddu-slots">${Array.from({ length: s.max }, (_, i) =>
          `<span class="ddu-slot${i < s.value ? " ddu-slot--on" : ""}"></span>`).join("")}</span></button>`;
    }
    if ( hasCantrips(this.actor) ) html += pip("cantrip");
    for ( const r of classResources(this.actor).slice(0, 4) ) {
      const shown = Math.min(r.max, 10);
      html += `<div class="ddu-resource" data-tooltip="${esc(`${r.item.name} ${r.value}/${r.max}`)}">
        <img src="${esc(r.item.img)}" alt="">${r.max > 10 ? `<span class="ddu-resource__count">${r.value}</span>`
          : `<span class="ddu-slots">${Array.from({ length: shown }, (_, i) =>
            `<span class="ddu-slot ddu-slot--resource${i < r.value ? " ddu-slot--on" : ""}"></span>`).join("")}</span>`}</div>`;
    }
    box.innerHTML = html;
    return box;
  }

  #effects() {
    const box = document.createElement("div");
    box.className = "ddu-bar__effects ddu-frame ddu-frame--effects";
    const effects = iconEffectsOf(this.actor);
    const none = game.i18n.localize("COMMON.None");
    box.innerHTML = effects.slice(0, 8).map(e => {
      const d = e.duration?.label && e.duration.label !== none ? ` (${e.duration.label})` : "";
      return `<img class="ddu-bar__effect" src="${esc(e.img)}" alt="" data-effect-id="${e.id}"
        data-effect-parent="${esc(e.parent?.uuid ?? "")}"
        data-tooltip="${esc(`${e.name}${d}${this.canEdit ? ` — ${loc("Bar.RemoveEffect")}` : ""}`)}">`;
    }).join("") + (effects.length > 8 ? `<span class="ddu-bar__more">+${effects.length - 8}</span>` : "");
    box.hidden = !effects.length;
    return box;
  }

  #grid(ctx) {
    const grid = document.createElement("div");
    grid.className = "ddu-bar__grid";
    grid.style.setProperty("--ddu-rows", String(this.layout.rows));
    if ( this.tab === "default" ) {
      CONTAINERS.forEach((c, i) => {
        if ( i > 0 ) {
          const sep = document.createElement("div");
          sep.className = "ddu-bar__separator";
          sep.dataset.left = CONTAINERS[i - 1];
          sep.dataset.right = c;
          sep.dataset.tooltip = loc("Bar.Separator");
          grid.append(sep);
        }
        grid.append(this.#container(c, this.layout.cells[c], columnsOf(this.layout, c), ctx, this.layout.rows));
      });
    } else {
      // Personnalisé et les onglets : toute la largeur ; un onglet s'allonge avec ce qu'il contient, en gardant
      // toujours une case libre au bout pour y déposer.
      const key = this.tab === "custom" ? "custom" : tabContainer(this.tab);
      const refs = this.layout.cells[key] ?? [];
      const cols = columnsOf(this.layout, key);
      let last = refs.length - 1;
      while ( last >= 0 && !refs[last] ) last--;
      const rows = Math.max(this.layout.rows, Math.ceil((last + 2) / cols));
      grid.style.setProperty("--ddu-rows", String(Math.min(rows, 4)));
      grid.classList.toggle("ddu-bar__grid--scroll", rows > 4);
      grid.append(this.#container(key, refs, cols, ctx, rows));
    }
    return grid;
  }

  /**
   * @param {string} container   Nom du conteneur ("common", "custom", "tab_class"…).
   * @param {(string|null)[]} refs
   * @param {number} cols
   */
  #container(container, refs, cols, ctx, rows) {
    // Un nombre de rangées entier, sinon celui de la disposition (0.7.0 passait `true` : une seule rangée affichée).
    if ( !Number.isInteger(rows) || rows < 1 ) rows = this.layout.rows;
    const box = document.createElement("div");
    box.className = "ddu-bar__container";
    box.dataset.container = container;
    box.style.setProperty("--ddu-cols", String(cols));
    const html = [];
    for ( let i = 0; i < cols * rows; i++ ) {
      const ref = refs[i] ?? null;
      const view = ref ? cellView(this.actor, ref, ctx) : null;
      html.push(this.#cell(container, i, view));
    }
    box.innerHTML = html.join("");
    return box;
  }

  #cell(container, index, view) {
    const attrs = `data-container="${container}" data-index="${index}"`;
    if ( !view ) return `<div class="ddu-cell ddu-cell--empty" ${attrs}></div>`;
    const cls = ["ddu-cell"];
    if ( view.reasons.length || view.issues.length ) cls.push("ddu-cell--disabled");
    if ( view.multi ) cls.push(`ddu-cell--multi-${view.multi}`);
    if ( !matchesFilter(view, this.filter) ) cls.push("ddu-cell--dim");
    if ( view.cost === "bonus" || view.cost === "reaction" ) cls.push(`ddu-cell--${view.cost}`);
    if ( view.enchantments?.length ) cls.push("ddu-cell--enchanted");
    const draggable = this.canArrange;
    const badges = [];
    if ( view.uses ) badges.push(`<span class="ddu-cell__uses">${view.uses.value}/${view.uses.max}</span>`);
    else if ( view.quantity !== null && view.quantity !== undefined && view.quantity !== 1 ) {
      badges.push(`<span class="ddu-cell__uses">${view.quantity}</span>`);
    }
    if ( view.spellLevel > 0 ) badges.push(`<span class="ddu-cell__level">${roman(view.spellLevel)}</span>`);
    if ( view.canUpcast ) badges.push('<span class="ddu-cell__upcast">+</span>');
    if ( view.concentration ) badges.push('<span class="ddu-cell__conc">C</span>');
    if ( view.enchantments?.length ) badges.push('<span class="ddu-enchant"></span>');
    const key = container === "custom" ? this.#keyLabel(index) : null;
    if ( key ) badges.push(`<span class="ddu-cell__key">${esc(key)}</span>`);
    return `<div class="${cls.join(" ")}" ${attrs} data-ref="${esc(view.ref)}" data-cost="${view.cost ?? ""}"
      data-level="${view.spellLevel ?? ""}" ${draggable ? 'draggable="true"' : ""}
      data-tooltip-html="${esc(shortTooltip(view))}" data-tooltip-direction="UP">
      <img src="${esc(view.img)}" alt="" draggable="false">${badges.join("")}</div>`;
  }

  /** Touche affichée sur une case Personnalisé : celle réellement liée dans les contrôles de Foundry. */
  #keyLabel(index) {
    if ( index >= CUSTOM_KEYS.length ) return null;
    const binding = game.keybindings.get(MODULE_ID, `customSlot${index + 1}`)?.[0];
    if ( !binding?.key ) return null;
    const key = binding.key.replace(/^Digit/, "").replace("Minus", "-").replace("Equal", "=").replace(/^Key/, "");
    const mods = (binding.modifiers ?? []).map(m => `${m}+`).join("");
    return `${mods}${key}`;
  }

  #tabs() {
    const box = document.createElement("div");
    box.className = "ddu-bar__tabs";
    const tab = (id, label) => `<button type="button" class="ddu-tab${this.tab === id ? " ddu-tab--active" : ""}"
      data-action="tab" data-tab="${id}">${esc(label)}</button>`;
    const classes = classLabel(this.actor) || loc("Bar.Tab.class");
    box.innerHTML = `<button type="button" class="ddu-tab ddu-tab--default${this.tab === "default" ? " ddu-tab--active" : ""}"
        data-action="tab" data-tab="default" data-tooltip="${esc(loc("Bar.Tab.default"))}"><i class="fa-solid fa-angles-right"></i></button>`
      + tab("common", loc("Bar.Tab.common")) + tab("class", classes) + tab("items", loc("Bar.Tab.items"))
      + tab("passives", loc("Bar.Tab.passives")) + tab("custom", loc("Bar.Tab.custom"));
    return box;
  }

  #rowControls() {
    const box = document.createElement("div");
    box.className = "ddu-bar__rows";
    const hidden = this.canEdit ? "" : " hidden";
    box.innerHTML = `<button type="button" data-action="lock" class="${this.layout.locked ? "ddu-on" : ""}"${hidden}
        data-tooltip="${esc(loc(this.layout.locked ? "Bar.Unlock" : "Bar.Lock"))}">
        <i class="fa-solid ${this.layout.locked ? "fa-lock" : "fa-lock-open"}"></i></button>
      <button type="button" data-action="addRow"${hidden} data-tooltip="${esc(loc("Bar.AddRow"))}"><i class="fa-solid fa-plus"></i></button>
      <button type="button" data-action="removeRow"${hidden} data-tooltip="${esc(loc("Bar.RemoveRow"))}"><i class="fa-solid fa-minus"></i></button>`;
    return box;
  }

  #endButton(ctx) {
    const box = document.createElement("div");
    box.className = "ddu-bar__end ddu-frame ddu-frame--end";
    if ( ctx.inCombat ) {
      const move = this.#movement(ctx);
      const r = 46;
      const c = 2 * Math.PI * r;
      const ring = move ? `<svg class="ddu-ring" viewBox="0 0 100 100" aria-hidden="true">
          <circle class="ddu-ring__track" cx="50" cy="50" r="${r}"></circle>
          <circle class="ddu-ring__left" cx="50" cy="50" r="${r}" stroke-dasharray="${c * move.ratio} ${c}"></circle>
        </svg>` : "";
      // Nom selon ce que ce client a le droit de voir (« ??? » pour une créature au nom masqué).
      const current = ctx.combat.combatant;
      const label = ctx.myTurn ? loc("Bar.EndTurn") : loc("Bar.TurnOf", { name: current ? nameFor(current) : "" });
      box.innerHTML = `${ring}<button type="button" class="ddu-end${ctx.myTurn ? "" : " ddu-end--waiting"}"
        data-action="endTurn" ${ctx.myTurn && this.canEdit ? "" : "disabled"}
        data-tooltip="${esc(move ? loc("Bar.Movement", { left: round(move.left), allowed: round(move.allowed) }) : label)}">
        <span>${esc(label)}</span></button>`;
    } else {
      box.innerHTML = `<button type="button" class="ddu-end ddu-end--rest" data-action="rest"
        ${this.canEdit ? "" : "disabled"} data-tooltip="${esc(loc("Bar.Rest"))}">
        <i class="fa-solid fa-campground"></i><span>${esc(loc("Bar.Rest"))}</span></button>`;
    }
    return box;
  }

  /** Déplacement restant ce tour (anneau), tel que le moteur le compte ; null sans vitesse, sans token ou sans moteur. */
  #movement(ctx) {
    const move = movementOf(ctx.combatant?.token);
    return (move && (move.allowed > 0)) ? move : null;
  }

  /* -------------------------------------------- */
  /*  Gestes                                      */
  /* -------------------------------------------- */

  #listen() {
    const el = this.element;
    el.addEventListener("click", event => this.#onClick(event));
    el.addEventListener("contextmenu", event => this.#onRightClick(event));
    el.addEventListener("pointerover", event => this.#previewCost(event, true), { passive: true });
    el.addEventListener("pointerout", event => this.#previewCost(event, false), { passive: true });
    el.addEventListener("pointerdown", event => this.#onSeparator(event));
    el.addEventListener("dragstart", event => this.#onDragStart(event));
    el.addEventListener("dragover", event => this.#onDragOver(event));
    el.addEventListener("dragleave", event => {
      if ( !el.contains(event.relatedTarget) ) this.#clearDrop();
    });
    el.addEventListener("drop", event => this.#onDrop(event));
    el.addEventListener("dragend", event => this.#onDragEnd(event));
    // Fermer un tiroir ouvert en cliquant ailleurs (sans rien empêcher : le moteur écoute le canevas).
    // Alt : infobulle complète tant qu'il est maintenu (Échap et Entrée ne sont jamais écoutés, SPEC §8.4).
    document.addEventListener("keydown", event => {
      if ( event.key === "Alt" && !event.repeat ) this.onAltKey(true);
    });
    document.addEventListener("keyup", event => {
      if ( event.key === "Alt" ) this.onAltKey(false);
    });
    document.addEventListener("pointerdown", event => {
      if ( this.popup && !this.popup.contains(event.target) ) this.#closePopup();
      if ( this.d20.element && !this.d20.element.contains(event.target)
        && !event.target.closest?.('[data-action="d20"]') ) this.d20.close();
    });
  }

  async #onClick(event) {
    if ( !this.actor ) return;
    const target = event.target.closest("[data-action], .ddu-cell");
    if ( !target ) return;
    const action = target.dataset.action;
    switch ( action ) {
      case "d20": return this.d20.toggle(target);
      case "portrait": return this.actor.sheet.render(true);
      case "gmHeal": return this.#setHP(true);
      case "gmKill": return this.#setHP(false);
      case "endConcentration": return this.canEdit && this.actor.endConcentration();
      case "filter": return this.#toggleFilter(target);
      case "tab":
        this.tab = target.dataset.tab;
        return this.render({ keepLayout: true });
      case "lock": return this.#update({ ...this.layout, locked: !this.layout.locked });
      case "addRow": return this.#update(setRows(this.layout, this.layout.rows + 1));
      case "removeRow": return this.#update(setRows(this.layout, this.layout.rows - 1));
      case "endTurn": {
        const combat = viewedCombat();
        const mine = combatantOf(this.actor, combat);
        if ( mine && (combat.combatant?.id === mine.id) && mine.isOwner ) return combat.nextTurn();
        return;
      }
      case "rest": return this.#openRestMenu(target);
      case "shortRest": this.#closePopup(); return this.actor.shortRest();
      case "longRest": this.#closePopup(); return this.actor.longRest();
      case "switchWeapons": return this.#switchWeapons(Number(target.dataset.weaponSet));
      case "useWeapon": {
        const { sets, active } = this.layout.weapons;
        const ref = sets[active][Number(target.dataset.weaponHand)];
        const item = resolveRef(this.actor, ref)?.item;
        return item?.use({ event });
      }
      case "upcast": return this.#useCell(this.popupRef, event, target.dataset.slot);
    }
    if ( target.classList.contains("ddu-cell") && target.dataset.ref ) return this.#onCellClick(target, event);
  }

  #toggleFilter(button) {
    const kind = button.dataset.filter;
    const next = kind === "level" ? { level: Number(button.dataset.level) } : kind;
    const same = kind === "level"
      ? (typeof this.filter === "object" && this.filter?.level === next.level)
      : this.filter === kind;
    this.filter = same ? null : next;
    this.render({ keepLayout: true });
  }

  /** Clic sur une case : sort surchargeable → tiroir des niveaux (BG3 P8), sinon utilisation directe. */
  #onCellClick(cell, event) {
    const ref = cell.dataset.ref;
    const view = cellView(this.actor, ref, this.ctx);
    if ( !view ) return;
    if ( view.canUpcast && view.upcast.length > 1 && !event.shiftKey ) return this.#openUpcast(cell, view);
    return this.#useCell(ref, event, view.canUpcast ? view.upcast[0]?.key : null);
  }

  /**
   * Utilise une case par le système. Avec `slot`, le dialogue de dnd5e est sauté et l'emplacement choisi
   * est passé tel quel (`usageConfig.spell.slot`). Alt / Ctrl de l'événement restent lus par le système
   * et le moteur (avantage / désavantage).
   */
  async #useCell(ref, event, slot = null) {
    this.#closePopup();
    const r = resolveRef(this.actor, ref);
    if ( !r ) return;
    if ( r.macro ) return r.macro.execute({ actor: this.actor });
    if ( !this.actor.isOwner ) return;
    const activities = r.item.system.activities;
    let activity = r.activity ?? (activities?.size === 1 ? activities.contents[0] : null);
    // Niveau choisi dans le tiroir : l'activité qui dépense l'emplacement (Marque du chasseur en a trois,
    // dont une seule le consomme), sinon dnd5e ouvrirait son choix d'activité et perdrait le niveau.
    if ( slot && !activity ) activity = activities?.find(a => a.requiresSpellSlot && a.consumption?.spellSlot) ?? null;
    if ( slot && activity ) return activity.use({ event, spell: { slot } }, { configure: false });
    if ( activity ) return activity.use({ event });
    return r.item.use({ event });
  }

  /** Clic droit sur un effet actif : le retirer. Cases et armes ont leur menu (#contextMenu). */
  #onRightClick(event) {
    const effect = event.target.closest(".ddu-bar__effect");
    if ( !effect ) return;
    event.preventDefault();
    if ( !this.canEdit ) return;
    const parent = fromUuidSync(effect.dataset.effectParent, { strict: false });
    return parent?.effects.get(effect.dataset.effectId)?.delete();
  }

  /** Référence d'une case ou d'un emplacement d'arme ciblé par le menu. */
  #refOf(el) {
    if ( el?.classList.contains("ddu-weapon") ) {
      return this.layout.weapons.sets[Number(el.dataset.weaponSet)]?.[Number(el.dataset.weaponHand)] ?? null;
    }
    return el?.dataset.ref ?? null;
  }

  /**
   * Menu du clic droit sur une case ou une arme (demande de l'utilisateur, 2026-09-27) : Détails (infobulle complète
   * épinglée), Ouvrir la fiche, Retirer de la barre — ce dernier absent quand la barre est verrouillée.
   */
  #contextMenu() {
    return new foundry.applications.ux.ContextMenu(this.element, ".ddu-cell[data-ref], .ddu-weapon", [
      {
        label: "DDU.Bar.Menu.Details", icon: '<i class="fa-solid fa-circle-info"></i>',
        visible: t => t.classList.contains("ddu-cell"),
        onClick: (_e, t) => this.#showFull(t, { locked: true })
      },
      {
        label: "DDU.Bar.Menu.Sheet", icon: '<i class="fa-solid fa-book-open"></i>',
        visible: t => {
          const r = resolveRef(this.actor, this.#refOf(t));
          return !!(r?.macro ?? r?.item)?.testUserPermission?.(game.user, "OBSERVER");
        },
        onClick: (_e, t) => {
          const r = resolveRef(this.actor, this.#refOf(t));
          (r?.macro ?? r?.item)?.sheet.render(true);
        }
      },
      {
        label: "DDU.Bar.Menu.Remove", icon: '<i class="fa-solid fa-trash"></i>',
        visible: t => this.canEdit && !this.locked && !!this.#refOf(t),
        onClick: (_e, t) => {
          if ( this.locked ) return;
          if ( t.classList.contains("ddu-weapon") ) {
            return this.#update(setWeapon(this.layout, Number(t.dataset.weaponSet), Number(t.dataset.weaponHand), null));
          }
          this.#update(remove(this.layout, t.dataset.container, Number(t.dataset.index)));
        }
      }
    ], { jQuery: false, fixed: true });
  }

  /** Survol d'une case : les pastilles qu'elle consommerait s'allument (SPEC §5.4). */
  #previewCost(event, on) {
    const cell = event.target.closest?.(".ddu-cell[data-ref]");
    if ( !cell ) return;
    const related = event.relatedTarget?.closest?.(".ddu-cell");
    if ( related === cell ) return;
    for ( const el of this.element.querySelectorAll(".ddu-filter--preview") ) el.classList.remove("ddu-filter--preview");
    this.hoverCell = on ? cell : null;
    if ( !on ) return;
    if ( setting("barFullTooltips") || event.altKey ) this.#showFull(cell, { now: event.altKey });
    const cost = cell.dataset.cost;
    if ( ["action", "bonus", "reaction"].includes(cost) ) {
      this.element.querySelector(`.ddu-filter[data-filter="${cost}"]`)?.classList.add("ddu-filter--preview");
    }
    const level = Number(cell.dataset.level);
    if ( level > 0 ) {
      const view = cellView(this.actor, cell.dataset.ref, this.ctx);
      const slot = view?.upcast?.[0]?.key;
      if ( slot ) this.element.querySelector(`.ddu-filter[data-slot="${slot}"]`)?.classList.add("ddu-filter--preview");
    }
  }

  /* -------------------------------------------- */
  /*  Infobulles complètes, épinglage, clavier    */
  /* -------------------------------------------- */

  /**
   * Remplace l'infobulle courte d'une case par la complète (description enrichie).
   * @param {HTMLElement} cell
   * @param {object} [options]
   * @param {boolean} [options.now]      L'afficher tout de suite (Alt), sinon au délai normal du cœur.
   * @param {boolean} [options.locked]   L'épingler (touche d'épinglage).
   */
  async #showFull(cell, { now = false, locked = false } = {}) {
    if ( this.popup ) return false;                // infobulles tues pendant un tiroir (#muteTooltips)
    const view = cellView(this.actor, cell.dataset.ref, this.ctx);
    if ( !view ) return false;
    cell.dataset.shortTooltip ??= cell.dataset.tooltipHtml;
    const html = await fullTooltip(view);
    if ( !cell.isConnected || this.popup ) return false;
    cell.dataset.tooltipHtml = html;
    if ( now || locked ) game.tooltip.activate(cell, { html, locked, direction: "UP" });
    return true;
  }

  /** Revient à l'infobulle courte (Alt relâché). */
  #showShort(cell) {
    if ( !cell?.dataset.shortTooltip || setting("barFullTooltips") || this.popup ) return;
    cell.dataset.tooltipHtml = cell.dataset.shortTooltip;
    if ( game.tooltip.element === cell ) game.tooltip.activate(cell, { html: cell.dataset.shortTooltip, direction: "UP" });
  }

  /** Alt maintenu sur une case : infobulle complète (BG3 : touche d'infobulle détaillée). */
  onAltKey(down) {
    const cell = this.hoverCell;
    if ( !cell?.isConnected ) return;
    if ( down ) this.#showFull(cell, { now: true });
    else this.#showShort(cell);
  }

  /** Épingle l'infobulle complète de la case survolée. @returns {boolean} true si une case était survolée. */
  pinHovered() {
    const cell = this.hoverCell;
    if ( !cell?.isConnected || this.element.hidden ) return false;
    this.#showFull(cell, { locked: true });
    return true;
  }

  /**
   * Raccourci d'une case de l'onglet Personnalisé.
   * @returns {boolean} true si la case existait (sinon la touche garde son rôle dans le cœur : macro).
   */
  useCustomSlot(index, event) {
    if ( !this.actor || this.element.hidden ) return false;
    const ref = this.layout?.cells.custom?.[index];
    if ( !ref || !resolveRef(this.actor, ref) ) return false;
    this.#useCell(ref, event);
    return true;
  }

  /** Raccourci d'une action de base du moteur (clé `basicAction` : dash, dodge…). */
  useBasicAction(key, event) {
    const item = this.actor?.items.find(i => i.getFlag?.("dnd5e-combat", "basicAction") === key);
    if ( !item ) return false;
    this.#useCell(`Item.${item.id}`, event);
    return true;
  }

  /** Raccourci : passer à l'autre jeu d'armes. */
  swapWeapons() {
    if ( !this.actor || this.element.hidden || !this.canEdit ) return false;
    this.#switchWeapons(1 - this.layout.weapons.active);
    return true;
  }

  async #switchWeapons(set) {
    if ( !this.canEdit ) return;
    const layout = setActiveWeapons(this.layout, set);
    this.#update(layout);
    await equipWeaponSet(this.actor, layout.weapons.sets, layout.weapons.active);
  }

  /* -------------------------------------------- */
  /*  Barres rouges                               */
  /* -------------------------------------------- */

  #onSeparator(event) {
    const sep = event.target.closest?.(".ddu-bar__separator");
    if ( !sep || !this.canArrange || event.button !== 0 ) return;
    event.preventDefault();
    const cellWidth = this.element.querySelector(".ddu-cell")?.getBoundingClientRect().width || 52;
    const startX = event.clientX;
    const start = this.layout;
    let applied = 0;
    this.pending = true;          // pendant le geste, rien ne relit le flag
    const onMove = e => {
      const delta = Math.round((e.clientX - startX) / cellWidth);
      if ( delta === applied ) return;
      const next = resize(start, sep.dataset.left, sep.dataset.right, delta);
      if ( next === start ) return;
      applied = delta;
      this.layout = next;
      this.render({ keepLayout: true });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if ( this.layout !== start ) this.#save(this.layout);
      else this.pending = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  /* -------------------------------------------- */
  /*  Glisser-déposer                             */
  /* -------------------------------------------- */

  #onDragStart(event) {
    const cell = event.target.closest?.(".ddu-cell[data-ref]");
    const weapon = event.target.closest?.(".ddu-weapon");
    this.dropped = false;
    this.drag = null;
    if ( !this.canArrange ) return;
    if ( cell ) {
      this.drag = { kind: "cell", container: cell.dataset.container, index: Number(cell.dataset.index), ref: cell.dataset.ref };
    } else if ( weapon ) {
      const set = Number(weapon.dataset.weaponSet);
      const hand = Number(weapon.dataset.weaponHand);
      this.drag = { kind: "weapon", set, hand, ref: this.layout.weapons.sets[set][hand] };
    } else return;
    // Données Foundry : l'objet se lâche aussi sur une fiche ou sur la barre de macros.
    const r = resolveRef(this.actor, this.drag.ref);
    const doc = r?.activity ?? r?.item ?? r?.macro;
    event.dataTransfer.effectAllowed = "copyMove";
    event.dataTransfer.setData("text/plain", JSON.stringify({ type: doc?.documentName ?? "Item", uuid: doc?.uuid }));
  }

  #dropTarget(event) {
    const cell = event.target.closest?.(".ddu-cell");
    if ( cell ) return { kind: "cell", el: cell, container: cell.dataset.container, index: Number(cell.dataset.index) };
    const weapon = event.target.closest?.(".ddu-weapon");
    if ( weapon ) {
      return { kind: "weapon", el: weapon, set: Number(weapon.dataset.weaponSet), hand: Number(weapon.dataset.weaponHand) };
    }
    return null;
  }

  #onDragOver(event) {
    if ( !this.canArrange ) return;
    const target = this.#dropTarget(event);
    if ( !target ) return;
    event.preventDefault();
    this.#clearDrop();
    target.el.classList.add("ddu-drop");
  }

  #clearDrop() {
    for ( const el of this.element.querySelectorAll(".ddu-drop") ) el.classList.remove("ddu-drop");
  }

  async #onDrop(event) {
    const target = this.#dropTarget(event);
    this.#clearDrop();
    if ( !target || !this.canArrange ) return;
    event.preventDefault();
    event.stopPropagation();
    this.dropped = true;

    // Depuis la Barre elle-même.
    const drag = this.drag;
    if ( drag ) {
      this.drag = null;
      if ( target.kind === "weapon" ) return this.#update(setWeapon(this.layout, target.set, target.hand, drag.ref));
      // Dans la vue par défaut et dans un même conteneur : on déplace (ou on échange) ; d'un onglet vers ailleurs :
      // on copie, l'icône reste dans son onglet (core/layout.mjs#isMove).
      if ( drag.kind === "cell" && isMove(drag.container, target.container) ) {
        return this.#update(move(this.layout, drag, target));
      }
      return this.#update(place(this.layout, target.container, target.index, drag.ref));
    }

    // Depuis une fiche, un compendium, la barre de macros.
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    const doc = data?.uuid ? await fromUuid(data.uuid) : null;
    if ( !doc ) return;
    if ( doc.documentName === "Macro" ) {
      if ( target.kind === "cell" ) this.#update(place(this.layout, target.container, target.index, `Macro.${doc.id}`));
      return;
    }
    const item = doc.documentName === "Item" ? doc : doc.item;
    if ( !item || item.parent?.id !== this.actor.id ) {
      return ui.notifications.warn(loc("Bar.NotOwnedItem"));
    }
    const ref = refOf(doc);
    if ( target.kind === "weapon" ) return this.#update(setWeapon(this.layout, target.set, target.hand, `Item.${item.id}`));
    this.#update(place(this.layout, target.container, target.index, ref));
  }

  /** Lâché hors de la Barre : la case est retirée (BG3), sauf si la barre est verrouillée. */
  #onDragEnd(event) {
    const drag = this.drag;
    this.drag = null;
    this.#clearDrop();
    if ( !drag || this.dropped || !this.canEdit ) return;
    const inside = document.elementFromPoint(event.clientX, event.clientY)?.closest?.("#ddu-bar");
    if ( inside || this.locked ) return;
    if ( drag.kind === "weapon" ) return this.#update(setWeapon(this.layout, drag.set, drag.hand, null));
    this.#update(remove(this.layout, drag.container, drag.index));
  }

  /* -------------------------------------------- */
  /*  Tiroirs                                     */
  /* -------------------------------------------- */

  #openPopup(anchor, html, cls) {
    this.#closePopup();
    const pop = document.createElement("div");
    pop.className = `ddu-bar__popup ${cls}`;
    pop.innerHTML = html;
    this.element.append(pop);
    const a = anchor.getBoundingClientRect();
    const b = this.element.getBoundingClientRect();
    pop.style.left = `${a.left - b.left + (a.width / 2)}px`;
    pop.style.bottom = `${b.bottom - a.top + 6}px`;
    this.popup = pop;
    this.#muteTooltips(true);
    // Les clics dans le tiroir passent par #onClick (data-action) : il est dans la Barre.
  }

  #closePopup() {
    if ( this.popup ) this.#muteTooltips(false);
    this.popup?.remove();
    this.popup = null;
    this.popupRef = null;
  }

  /**
   * Tiroir ouvert : les infobulles du reste de la Barre se taisent. Celle du cœur est un popover, dans la couche
   * supérieure du navigateur (client/helpers/interaction/tooltip-manager.mjs:272, `showPopover`) : aucun z-index ne la
   * passe, et celle de la case cliquée, ouverte vers le haut, couvrait le tiroir (demande de l'utilisateur, 2026-10-03).
   */
  #muteTooltips(mute) {
    const keys = ["tooltip", "tooltipHtml", "tooltipText"];
    if ( mute ) {
      for ( const el of this.element.querySelectorAll("[data-tooltip], [data-tooltip-html], [data-tooltip-text]") ) {
        if ( this.popup?.contains(el) ) continue;
        const saved = Object.fromEntries(keys.filter(k => k in el.dataset).map(k => [k, el.dataset[k]]));
        keys.forEach(k => delete el.dataset[k]);
        el.dataset.dduMuted = JSON.stringify(saved);
      }
      if ( game.tooltip.element && !this.popup?.contains(game.tooltip.element) ) game.tooltip.deactivate();
      else game.tooltip.clearPending();
      return;
    }
    for ( const el of this.element.querySelectorAll("[data-ddu-muted]") ) {
      Object.assign(el.dataset, JSON.parse(el.dataset.dduMuted));
      delete el.dataset.dduMuted;
    }
  }

  #openUpcast(cell, view) {
    this.#openPopup(cell, view.upcast.map(s => `<button type="button" data-action="upcast" data-slot="${s.key}"
      data-tooltip="${esc(loc(s.pact ? "Bar.Filter.pact" : "Bar.Filter.level", { level: s.level, value: s.value, max: s.max }))}">
      <span class="ddu-filter__level">${s.pact ? "P" : ""}${roman(s.level)}</span>
      <span class="ddu-slots">${Array.from({ length: s.max }, (_, i) =>
        `<span class="ddu-slot${i < s.value ? " ddu-slot--on" : ""}"></span>`).join("")}</span></button>`).join(""),
    "ddu-bar__upcast");
    this.popupRef = view.ref;
  }

  #openRestMenu(button) {
    this.#openPopup(button, `<button type="button" data-action="shortRest"><i class="fa-solid fa-hourglass-half"></i>
        ${esc(loc("Bar.ShortRest"))}</button>
      <button type="button" data-action="longRest"><i class="fa-solid fa-bed"></i> ${esc(loc("Bar.LongRest"))}</button>`,
    "ddu-bar__restmenu");
  }
}

function round(n) {
  return Math.round(n * 10) / 10;
}
