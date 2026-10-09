/**
 * Portrait commun à la Barre (rond), au Groupe et à la Frise (cartes verticales) : image, voile rouge
 * des PV perdus (SPEC §7.3), PV en chiffres, jets contre la mort, flash au changement de PV.
 *
 * Composant DOM simple (pas une application) : chaque zone crée les siens et les pose où elle veut.
 * Les instances vivantes sont suivies pour être rafraîchies quand leur acteur change (runtime/portraits).
 * Classes stables pour l'habillage de la V2 (SPEC §10 bis) : .ddu-frame, .ddu-frame--portrait, etc.
 */
import { veilFor, changeOf } from "../core/health.mjs";
import { healthOf, deathSavesOf, isDead, portraitImage, healthPolicyFor, sideOf } from "../adapter/actor.mjs";
import { wardsOf } from "../adapter/engine.mjs";
import { loc, setting } from "../shared.mjs";

/** @type {Set<Portrait>} */
const live = new Set();

export class Portrait {
  /**
   * @param {object} options
   * @param {Actor} [options.actor]
   * @param {TokenDocument} [options.token]   Prioritaire : un token non lié a son propre acteur.
   * @param {"round"|"card"} [options.shape]
   * @param {boolean} [options.showSide]      Cadre coloré selon la disposition (Frise).
   * @param {string} [options.policy]         Politique de PV imposée ("exact"…) ; sinon selon les droits.
   * @param {string} [options.label]          Nom à donner à l'image (ex. « ??? » pour une créature au nom
   *                                          masqué) ; sinon celui du token ou de l'acteur.
   */
  constructor({ actor, token, shape = "card", showSide = false, policy = null, label = null } = {}) {
    this.token = token ?? null;
    this.actor = token?.actor ?? actor ?? null;
    this.shape = shape;
    this.showSide = showSide;
    this.policy = policy;
    this.label = label;
    this.element = this.#build();
    this.health = null;
    this.refresh({ flash: false });
    live.add(this);
  }

  /** Acteur réellement affiché (utile aux zones qui filtrent les mises à jour). */
  get subject() {
    return this.token?.actor ?? this.actor;
  }

  #build() {
    const el = document.createElement("div");
    el.className = `ddu-portrait ddu-portrait--${this.shape} ddu-frame ddu-frame--portrait`;
    el.innerHTML = `
      <div class="ddu-portrait__image"><img alt="" draggable="false"></div>
      <div class="ddu-portrait__veil"></div>
      <div class="ddu-portrait__flash"></div>
      <i class="ddu-portrait__skull fa-solid fa-skull"></i>
      <div class="ddu-portrait__hp"></div>
      <div class="ddu-portrait__ward" hidden></div>
      <div class="ddu-portrait__death"></div>`;
    // Le flash joué, sa classe s'en va : sinon le navigateur le rejoue chaque fois que le portrait est remis dans la page
    // (le Groupe se redessine à chaque déplacement en combat — clignotement vert ou rouge, 0.16.1).
    el.addEventListener("animationend", () => el.classList.remove("ddu-flash--damage", "ddu-flash--heal"));
    return el;
  }

  /** Relit l'acteur et met le DOM à jour. `flash` : animer un changement de PV. */
  refresh({ flash = true } = {}) {
    const actor = this.subject;
    const el = this.element;
    if ( !actor ) {
      el.hidden = true;
      return;
    }
    el.hidden = false;

    const img = el.querySelector(".ddu-portrait__image img");
    const src = portraitImage(actor, this.token, setting("portraitImage"));
    if ( img.getAttribute("src") !== src ) img.src = src;
    img.alt = this.label ?? this.token?.name ?? actor.name;

    if ( this.showSide ) el.dataset.side = sideOf(this.token ?? actor.prototypeToken);

    const health = healthOf(actor);
    const view = health
      ? veilFor(health, this.policy ?? healthPolicyFor(actor, setting("enemyHealth")))
      : { tier: "unhurt", veil: 0, numbers: false };
    const dead = isDead(actor);
    el.dataset.tier = dead ? "dead" : view.tier;
    el.style.setProperty("--ddu-veil", String(dead ? 1 : view.veil));

    const hp = el.querySelector(".ddu-portrait__hp");
    hp.hidden = !(health && view.numbers);
    if ( health && view.numbers ) {
      hp.textContent = `${health.value}/${health.max}`;
      hp.classList.toggle("ddu-portrait__hp--temp", health.temp > 0);
      hp.dataset.tooltip = health.temp > 0 ? `+${health.temp}` : "";
    }

    // Égide arcanique (réserve du moteur) : une bulle avec ses points, là où les PV se montrent en chiffres (0.16.3).
    const ward = el.querySelector(".ddu-portrait__ward");
    const wards = (health && view.numbers && !dead) ? wardsOf(actor) : [];
    ward.hidden = !wards.length;
    if ( wards.length ) {
      ward.textContent = String(wards.reduce((n, w) => n + w.value, 0));
      ward.dataset.tooltip = wards.map(w => loc("Portrait.Ward", { name: w.name, value: w.value, max: w.max })).join(" · ");
      ward.classList.toggle("ddu-portrait__ward--empty", wards.every(w => w.value <= 0));
    }

    this.#renderDeath(deathSavesOf(actor));

    if ( flash && health ) {
      const change = changeOf(this.health, health);
      if ( change ) this.#flash(change);
    }
    this.health = health;
  }

  #renderDeath(saves) {
    const box = this.element.querySelector(".ddu-portrait__death");
    box.hidden = !saves;
    if ( !saves ) return;
    const pips = (n, kind) => Array.from({ length: 3 }, (_, i) =>
      `<span class="ddu-pip ddu-pip--${kind}${i < n ? " ddu-pip--on" : ""}"></span>`).join("");
    box.innerHTML = `<span class="ddu-death ddu-death--success">${pips(saves.success, "success")}</span>`
      + `<span class="ddu-death ddu-death--failure">${pips(saves.failure, "failure")}</span>`;
  }

  #flash(kind) {
    const el = this.element;
    el.classList.remove("ddu-flash--damage", "ddu-flash--heal");
    void el.offsetWidth; // relance l'animation
    el.classList.add(`ddu-flash--${kind}`);
  }

  destroy() {
    live.delete(this);
    this.element.remove();
  }

  /** Rafraîchit les portraits d'un acteur (ou de tous). Appelé par les hooks (runtime/portraits). */
  static refreshFor(actor, options) {
    for ( const p of live ) {
      if ( !p.element.isConnected ) { live.delete(p); continue; }
      if ( !actor || p.subject === actor || p.subject?.id === actor.id ) p.refresh(options);
    }
  }

  /** Rafraîchit les portraits d'un token (image, nom, disposition). */
  static refreshToken(tokenDoc) {
    for ( const p of live ) {
      if ( p.token === tokenDoc || (p.token?.id === tokenDoc.id) ) p.refresh({ flash: false });
    }
  }
}
