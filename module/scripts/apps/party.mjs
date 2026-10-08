/**
 * Le Groupe : colonne de portraits des personnages sur le côté (SPEC §6).
 * Composant DOM en position fixe (voir #place).
 *
 * Par membre : portrait carte (voile, PV), couronne sur le personnage contrôlé, épées croisées s'il est
 * au combat, colonne d'effets à droite (concentration d'abord), main levée, inspiration, liseré du joueur.
 * Ses compagnons et invocations suivent, en petit. Les portraits sont gardés d'un rendu à l'autre.
 */
import { Portrait } from "./portrait.mjs";
import { orderMembers, moveMember, effectColumn } from "../core/party.mjs";
import {
  partyActors, companionsOf, ownerColor, currentActor, tokenOnScene, combatantOf, effectsOf, hasInspiration
} from "../adapter/party.mjs";
import { viewedCombat } from "../adapter/combat.mjs";
import { budgetOf, tokenMenuOf } from "../adapter/engine.mjs";
import { MODULE_ID, loc, setting } from "../shared.mjs";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

export class Party {
  constructor() {
    this.element = document.createElement("section");
    this.element.id = "ddu-party";
    this.element.className = "ddu-party";
    /** @type {Map<string, Portrait>} clé : "a:<actorId>" ou "t:<tokenId>" */
    this.portraits = new Map();
    this.highlighted = null;
    this.dragId = null;
    this.#listen();
  }

  attach() {
    const right = setting("partyPosition") === "right";
    this.element.classList.toggle("ddu-party--right", right);
    (document.getElementById("interface") ?? document.body).append(this.element);
    if ( !this.menu ) this.menu = this.#contextMenu();
    if ( !this.onResize ) {
      this.onResize = foundry.utils.debounce(() => this.#place(), 50);
      window.addEventListener("resize", this.onResize);
    }
    this.#place();
  }

  /**
   * Position fixe, centrée verticalement. À gauche : **collée au bord de l'écran** (demande de l'utilisateur,
   * 2026-09-27), sauf si elle chevaucherait les outils de scène (le MJ en a une longue colonne) : elle se met
   * alors à côté d'eux, sur la 2e colonne de #ui-left. À droite : contre la barre latérale.
   */
  #place() {
    const style = this.element.style;
    if ( this.element.classList.contains("ddu-party--right") ) {
      const sidebar = document.getElementById("sidebar")?.getBoundingClientRect();
      style.left = "";
      style.right = `${Math.round(sidebar ? window.innerWidth - sidebar.left + 8 : 16)}px`;
      return;
    }
    style.right = "";
    const height = this.element.getBoundingClientRect().height;
    const top = (window.innerHeight - height) / 2;
    // Bas réel des outils de scène : le dernier bouton affiché, pas l'élément (qui s'étire).
    let controlsBottom = 0;
    for ( const b of document.querySelectorAll("#scene-controls button") ) {
      const r = b.getBoundingClientRect();
      if ( r.height ) controlsBottom = Math.max(controlsBottom, r.bottom);
    }
    const players = document.getElementById("players")?.getBoundingClientRect();
    // Réglage client « Groupe : placement » : automatique (bord si rien n'est chevauché), toujours au bord,
    // toujours à côté des outils.
    const placement = setting("partyPlacement");
    const clear = placement === "edge" ? true : placement === "beside" ? false
      : (top > controlsBottom + 8) && (!players?.height || (top + height < players.top - 8));
    if ( clear ) style.left = "0px";
    else {
      const column = document.getElementById("ui-left-column-2")?.getBoundingClientRect();
      style.left = `${Math.round(column?.left ?? 104)}px`;
    }
    this.element.classList.toggle("ddu-party--edge", clear);
  }

  /** Changement de côté : on déplace simplement l'élément. */
  reattach() {
    this.element.remove();
    this.attach();
    this.render();
  }

  scheduleRender = foundry.utils.debounce(() => this.render(), 30);

  render() {
    const combat = viewedCombat();
    const show = setting("party") && setting("partyPosition") !== "hidden"
      && !(setting("partyHideInCombat") && combat?.started);
    const actors = show ? partyActors({ mode: setting("partyMembers"), connectedOnly: setting("partyConnectedOnly") }) : [];
    this.element.hidden = !actors.length;

    const members = new Set(actors);
    const mine = game.user.character ?? null;
    const ordered = orderMembers(actors.map(a => ({ id: a.id, name: a.name, actor: a })),
      setting("partyOrder") ?? [], mine?.id ?? null);
    const current = currentActor();

    // Construire la liste des entrées (membres puis leurs compagnons) avant de réutiliser les portraits.
    const entries = [];
    for ( const { actor } of ordered ) {
      entries.push({ key: `a:${actor.id}`, actor, token: null, companion: false });
      if ( setting("partyCompanions") ) {
        for ( const token of companionsOf(actor, members) ) {
          entries.push({ key: `t:${token.id}`, actor: token.actor, token, companion: true, of: actor });
        }
      }
    }
    const keep = new Set(entries.map(e => e.key));
    for ( const [key, p] of this.portraits ) {
      if ( !keep.has(key) ) { p.destroy(); this.portraits.delete(key); }
    }

    this.element.replaceChildren();
    if ( !entries.length ) return;
    // Bouton en tête de colonne : replier le Groupe (seul le bouton reste) ou le déplier. Réglage client.
    const collapsed = !!setting("partyCollapsed");
    this.element.classList.toggle("ddu-party--collapsed", collapsed);
    const left = setting("partyPosition") !== "right";
    const icon = collapsed ? "fa-users" : (left ? "fa-chevron-left" : "fa-chevron-right");
    this.element.insertAdjacentHTML("beforeend", `<button type="button" class="ddu-party__toggle" data-tooltip="${
      esc(loc(collapsed ? "Party.Show" : "Party.Hide"))}"><i class="fa-solid ${icon}"></i></button>`);
    if ( collapsed ) return this.#place();
    const list = document.createElement("ol");
    list.className = "ddu-party__list";
    for ( const entry of entries ) list.append(this.#member(entry, combat, current));
    this.element.append(list);
    this.#place();    // après le dessin : la place dépend de la hauteur de la colonne
  }

  /** Replacer la colonne (outils de scène changés, fenêtre redimensionnée). */
  place() {
    if ( !this.element.hidden ) this.#place();
  }

  /* -------------------------------------------- */

  #member({ key, actor, token, companion }, combat, current) {
    const li = document.createElement("li");
    li.className = "ddu-party__member";
    li.classList.toggle("ddu-party__member--companion", companion);
    li.dataset.key = key;
    li.dataset.actorId = actor.id;
    if ( token ) li.dataset.tokenId = token.id;
    // Glisser : le MJ réordonne le groupe ; un joueur pose le token de son personnage s'il n'est pas déjà sur la scène.
    // Jamais un compagnon ni une invocation : leur token existe déjà, le cœur en poserait un double (Lumière, 0.16.2).
    if ( game.user.isGM && !companion ) li.draggable = true;
    else if ( actor.isOwner && !companion && !tokenOnScene(actor) ) li.draggable = true;

    const color = ownerColor(actor);
    if ( color ) li.style.setProperty("--ddu-player", color);

    // Combat : en combat (épées), son tour (liseré doré), déjà joué ce round.
    const combatant = combatantOf(actor, combat);
    const index = combatant ? combat.turns.indexOf(combatant) : -1;
    li.classList.toggle("ddu-party__member--combat", !!combatant);
    li.classList.toggle("ddu-party__member--turn", !!combatant && combat.started && index === combat.turn);
    li.classList.toggle("ddu-party__member--played", !!combatant && combat.started && index < combat.turn);
    li.classList.toggle("ddu-party__member--current", !companion && current?.id === actor.id);

    let portrait = this.portraits.get(key);
    if ( portrait ) portrait.refresh();
    else {
      portrait = new Portrait({
        actor, token, shape: "card", policy: setting("partyHealthExact") ? "exact" : null
      });
      portrait.element.classList.add("ddu-portrait--party");
      this.portraits.set(key, portrait);
    }

    const frame = document.createElement("div");
    frame.className = "ddu-party__frame";
    frame.append(portrait.element);
    if ( !companion ) {
      frame.insertAdjacentHTML("beforeend", '<i class="ddu-party__crown fa-solid fa-crown"></i>'
        + '<i class="ddu-party__swords fa-solid fa-swords"></i>');
      if ( actor.getFlag(MODULE_ID, "handRaised") ) {
        frame.insertAdjacentHTML("beforeend",
          `<i class="ddu-party__hand fa-solid fa-hand" data-tooltip="${esc(loc("Party.HandRaised"))}"></i>`);
      }
      if ( hasInspiration(actor) ) {
        frame.insertAdjacentHTML("beforeend",
          `<i class="ddu-party__inspiration fa-solid fa-star" data-tooltip="${esc(loc("Party.Inspiration"))}"></i>`);
      }
      const budget = combatant && combat.started ? budgetOf(combatant) : null;
      if ( budget ) {
        const pip = (on, kind) => `<span class="ddu-pip ddu-pip--${kind}${on ? "" : " ddu-pip--spent"}"></span>`;
        frame.insertAdjacentHTML("beforeend", `<span class="ddu-party__budget">${pip(budget.action, "action")}`
          + `${pip(budget.bonus, "bonus")}${pip(budget.reaction, "reaction")}</span>`);
      }
    }
    li.append(frame);

    // Colonne d'effets à droite : concentration d'abord, 3 visibles + « +n ».
    const { shown, rest, more } = effectColumn(effectsOf(actor), companion ? 1 : 3);
    if ( shown.length ) {
      const col = document.createElement("div");
      col.className = "ddu-party__effects";
      const none = game.i18n.localize("COMMON.None");
      col.innerHTML = shown.map(e => {
        const tip = e.duration && e.duration !== none ? `${e.name} (${e.duration})` : e.name;
        return `<img class="ddu-party__effect${e.concentration ? " ddu-party__effect--concentration" : ""}" `
          + `src="${esc(e.img)}" alt="" data-tooltip="${esc(tip)}">`;
      }).join("") + (more ? `<span class="ddu-party__more" data-tooltip="${esc(
        rest.map(e => e.name).join(", "))}">+${more}</span>` : "");
      li.append(col);
    }

    li.dataset.tooltip = token?.name ?? actor.name;
    li.dataset.tooltipDirection = setting("partyPosition") === "right" ? "LEFT" : "RIGHT";
    return li;
  }

  /* -------------------------------------------- */
  /*  Gestes                                      */
  /* -------------------------------------------- */

  #resolve(target) {
    const li = target?.closest?.(".ddu-party__member");
    if ( !li ) return null;
    const token = li.dataset.tokenId ? canvas.scene?.tokens.get(li.dataset.tokenId) : null;
    const actor = token?.actor ?? game.actors.get(li.dataset.actorId);
    // `tokenOnScene` rend déjà un TokenDocument (`getActiveTokens(false, true)`) : avant la 0.9.0 on en lisait `.document`,
    // donc rien — le portrait d'un personnage n'avait ni sélection au clic, ni « Cibler », ni « Signaler ».
    return actor ? { li, actor, token: token ?? tokenOnScene(actor) ?? null } : null;
  }

  #listen() {
    const el = this.element;
    el.addEventListener("click", event => {
      if ( event.target.closest?.(".ddu-party__toggle") ) {
        return game.settings.set(MODULE_ID, "partyCollapsed", !setting("partyCollapsed"));
      }
      const r = this.#resolve(event.target);
      if ( !r ) return;
      const placeable = r.token?.object;
      if ( !placeable || !placeable.visible ) return;
      if ( r.actor.isOwner ) placeable.control({ releaseOthers: !(event.ctrlKey || event.metaKey || event.shiftKey) });
      canvas.animatePan({ x: placeable.center.x, y: placeable.center.y });
    });
    el.addEventListener("dblclick", event => {
      const r = this.#resolve(event.target);
      if ( r?.actor.testUserPermission(game.user, "OBSERVER") ) r.actor.sheet.render(true);
    });
    el.addEventListener("pointerover", event => this.#onHover(event, true), { passive: true });
    el.addEventListener("pointerout", event => this.#onHover(event, false), { passive: true });

    // Glisser : sur le canevas, le cœur pose le token de l'acteur (données Actor) ; dans la colonne,
    // le MJ réordonne le groupe.
    el.addEventListener("dragstart", event => {
      const r = this.#resolve(event.target);
      if ( !r ) return;
      if ( !r.li.draggable ) return event.preventDefault();
      this.dragId = r.li.classList.contains("ddu-party__member--companion") ? null : r.actor.id;
      event.dataTransfer.effectAllowed = "copyMove";
      event.dataTransfer.setData("text/plain", JSON.stringify({ type: "Actor", uuid: r.actor.uuid }));
    });
    el.addEventListener("dragover", event => {
      if ( !this.dragId || !game.user.isGM ) return;
      const li = event.target.closest?.(".ddu-party__member:not(.ddu-party__member--companion)");
      if ( !li ) return;
      event.preventDefault();
      this.#clearDropMarks();
      li.classList.add(this.#dropSide(event, li) === "before" ? "ddu-drop--before" : "ddu-drop--after");
    });
    el.addEventListener("drop", event => this.#onDrop(event));
    el.addEventListener("dragend", () => {
      this.dragId = null;
      this.#clearDropMarks();
    });
  }

  #onHover(event, entering) {
    const li = event.target.closest?.(".ddu-party__member");
    const related = event.relatedTarget?.closest?.(".ddu-party__member");
    if ( li && related === li ) return;
    this.highlighted?._onHoverOut?.(event);
    this.highlighted = null;
    if ( !entering || !li ) return;
    const placeable = this.#resolve(li)?.token?.object;
    if ( placeable?.visible && placeable._canHover(game.user, event) ) {
      placeable._onHoverIn(event, { hoverOutOthers: true });
      this.highlighted = placeable;
    }
  }

  /** Survol d'un token sur le canevas : surligner son portrait. */
  onTokenHover(token, hovered) {
    const actorId = token.actor?.id;
    for ( const li of this.element.querySelectorAll(".ddu-party__member") ) {
      const match = li.dataset.tokenId ? li.dataset.tokenId === token.id : li.dataset.actorId === actorId;
      if ( match ) li.classList.toggle("ddu-party__member--hover", hovered);
    }
  }

  #dropSide(event, li) {
    const box = li.getBoundingClientRect();
    return event.clientY < box.top + (box.height / 2) ? "before" : "after";
  }

  #clearDropMarks() {
    for ( const li of this.element.querySelectorAll(".ddu-drop--before, .ddu-drop--after") ) {
      li.classList.remove("ddu-drop--before", "ddu-drop--after");
    }
  }

  async #onDrop(event) {
    const id = this.dragId;
    this.dragId = null;
    const li = event.target.closest?.(".ddu-party__member:not(.ddu-party__member--companion)");
    const side = li ? this.#dropSide(event, li) : null;
    this.#clearDropMarks();
    if ( !id || !li || !game.user.isGM ) return;
    event.preventDefault();
    event.stopPropagation();
    const visible = [...this.element.querySelectorAll(".ddu-party__member:not(.ddu-party__member--companion)")]
      .map(x => x.dataset.actorId);
    const from = visible.indexOf(id);
    let to = visible.indexOf(li.dataset.actorId) + (side === "after" ? 1 : 0);
    if ( from < to ) to -= 1;
    await game.settings.set(MODULE_ID, "partyOrder", moveMember(visible, id, to));
  }

  #contextMenu() {
    const resolve = target => this.#resolve(target);
    const base = [
      {
        label: "DDU.Party.Menu.Sheet", icon: '<i class="fa-solid fa-user"></i>',
        visible: t => !!resolve(t)?.actor.testUserPermission(game.user, "OBSERVER"),
        onClick: (_e, t) => resolve(t)?.actor.sheet.render(true)
      },
      {
        label: "DDU.Party.Menu.Target", icon: '<i class="fa-solid fa-bullseye"></i>',
        visible: t => !!resolve(t)?.token?.object?.visible,
        onClick: (_e, t) => {
          const placeable = resolve(t)?.token?.object;
          placeable?.setTarget(!placeable.isTargeted, { releaseOthers: false });
        }
      },
      {
        label: "DDU.Party.Menu.RaiseHand", icon: '<i class="fa-solid fa-hand"></i>',
        visible: t => {
          const r = resolve(t);
          return !!r?.actor.isOwner && !r.li.classList.contains("ddu-party__member--companion")
            && !r.actor.getFlag(MODULE_ID, "handRaised");
        },
        onClick: (_e, t) => resolve(t)?.actor.setFlag(MODULE_ID, "handRaised", true)
      },
      {
        label: "DDU.Party.Menu.LowerHand", icon: '<i class="fa-regular fa-hand"></i>',
        visible: t => {
          const r = resolve(t);
          return !!(r?.actor.isOwner || game.user.isGM) && !!r?.actor.getFlag(MODULE_ID, "handRaised");
        },
        onClick: (_e, t) => resolve(t)?.actor.unsetFlag(MODULE_ID, "handRaised")
      },
      {
        label: "DDU.Party.Menu.Ping", icon: '<i class="fa-solid fa-location-crosshairs"></i>',
        visible: t => !!resolve(t)?.token?.object?.visible,
        onClick: (_e, t) => {
          const placeable = resolve(t)?.token?.object;
          if ( placeable ) canvas.ping(placeable.center);
        }
      }
    ];
    const menu = new foundry.applications.ux.ContextMenu(this.element, ".ddu-party__member", base, { jQuery: false, fixed: true });
    // SPEC §6.4 (0.9.0) : sous les entrées du portrait, celles du menu contextuel du moteur pour ce token — ce que le
    // token en main peut en faire (suivre, échanger, observer…), sans avoir à le chercher sur la carte. Relues à
    // chaque ouverture : `onOpen` passe avant le rendu du menu (applications/ux/context-menu.mjs:599).
    menu.onOpen = target => {
      const extra = tokenMenuOf(resolve(target)?.token).map(entry => ({
        label: entry.label, icon: `<i class="${foundry.utils.escapeHTML(entry.icon ?? "")}"></i>`, group: "engine",
        onClick: event => entry.run(event)
      }));
      menu.menuItems = [...base, ...extra];
    };
    return menu;
  }
}
