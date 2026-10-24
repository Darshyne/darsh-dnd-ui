/**
 * §54 (issue #6) : la fenêtre de jet à la manière de BG3, quand le MJ demande un jet (moteur, son SPEC §242). Plein écran, assombri :
 * le libellé du MJ, la compétence et le test, le médaillon (DD — « ? » quand il est caché —, un ou deux d20 à cliquer, le mode du jet),
 * une tuile par bonus (caractéristique, maîtrise, bonus de la fiche, dés d'un effet comme l'Assistance, modificateur du MJ), une tuile
 * par aide possible (Assistance, Inspiration bardique, Soutien : un clic la demande à l'aidant, par le moteur — une seule de chaque sorte),
 * le bonus total (« +7~10 »), forcer l'Avantage ou le Désavantage, Annuler.
 *
 * Le mode du jet : celui de la demande du MJ, du Soutien et du système (fiche, états, dons, sorts : `prompt.mode`, lu par le moteur comme
 * dnd5e le lira) — sauf si le joueur force l'Avantage ou le Désavantage (`prompt.roll({ mode })`).
 *
 * Le jet est celui de dnd5e, lancé par le moteur. Avec Dice So Nice, ses dés roulent comme d'habitude (plein écran, sa configuration) pendant
 * que le d20 du médaillon tourne ; quand Dice So Nice a rendu son résultat, le d20 s'arrête sur le chiffre sorti, puis chaque bonus s'ajoute
 * (comme dans BG3 : la tuile s'allume, le chiffre grossit), puis le total final, puis le verdict (bandeau Réussite / Échec, quand le DD est
 * visible). Sans Dice So Nice, seul le d20 du médaillon tourne. Chaque joueur ne voit les dés de Dice So Nice que de son propre jet
 * (runtime/roll-window.mjs).
 *
 * Habillage : tout passe par des variables `--ddu-roll-*` ; si les images du cadre sont posées dans `assets/roll/` (gabarit dans
 * `docs/gabarit-cadre-jet.md`), la fenêtre les prend (attribut `data-skin` sur la racine), sinon elle se dessine en CSS.
 */
import { loc } from "../shared.mjs";
import { bonusRange, rangeText, diceShown, effectiveMode } from "../core/roll-window.mjs";
import { rollBreakdown, rollMode } from "../adapter/engine.mjs";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const ASSETS = "modules/darsh-dnd-ui/assets/roll";
/** Les images du cadre, une par emplacement (WebP, double résolution) ; `d20` : la face du d20 du médaillon. */
export const SKIN_SLOTS = Object.freeze(["medallion", "tile", "tile-active", "banner", "button", "d20"]);
const ABILITY_ICONS = { str: "fa-hand-fist", dex: "fa-feather", con: "fa-heart-pulse", int: "fa-brain", wis: "fa-eye", cha: "fa-masks-theater" };
const KIND_ICONS = { proficiency: "fa-medal", bonus: "fa-plus", dice: "fa-dice", exhaustion: "fa-face-tired", request: "fa-crown",
  inspiration: "fa-music" };
const AID_LABELS = { guidance: "Roll.Aid.Guidance", inspiration: "Roll.Aid.Inspiration", help: "Roll.Aid.Help" };
const RESULT_MS = 8000;   // le résultat reste affiché (le bouton Fermer, ou un clic, ferme plus tôt)
const STEP_MS = 380;   // une tuile qui s'ajoute au total
const SPIN_MS = 900;   // sans Dice So Nice : le d20 tourne au moins ce temps
const DSN_MAX_MS = 12000;   // on n'attend jamais Dice So Nice plus longtemps
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Les images présentes, cherchées une fois par session (une requête HEAD par emplacement). */
let skins = null;
function findSkins() {
  skins ??= Promise.all(SKIN_SLOTS.map(slot => fetch(`${ASSETS}/${slot}.webp`, { method: "HEAD" })
    .then(r => (r.ok ? slot : null), () => null))).then(found => new Set(found.filter(Boolean)));
  return skins;
}

/** Dice So Nice montrera-t-il ce jet en 3D sur ce poste ? */
const dice3dShown = () => !!(game.dice3d?.box && (game.dice3d.isEnabled?.() ?? true));

/** Un d20 vu de face : hexagone, triangle central relié aux sommets voisins ; la valeur au centre (`counting` : elle porte le décompte). */
function d20Svg(value, state="", counting=false) {
  const hex = "50,4 90,27 90,73 50,96 10,73 10,27";
  const tri = "50,24 78,68 22,68";
  const edges = [[50, 24, 50, 4], [50, 24, 10, 27], [50, 24, 90, 27], [22, 68, 10, 27], [22, 68, 10, 73], [22, 68, 50, 96],
    [78, 68, 90, 27], [78, 68, 90, 73], [78, 68, 50, 96]].map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`).join("");
  return `<svg class="ddu-roll__d20 ${state}" viewBox="0 0 100 100" aria-hidden="true">
    <polygon class="face" points="${hex}"/><g class="edges">${edges}</g><polygon class="inner" points="${tri}"/>
    <text x="50" y="58"${counting ? ` class="ddu-roll__count"` : ""}>${esc(value)}</text></svg>`;
}

/** Le même, en image (emplacement `d20` du thème) : la face du dé, la valeur écrite par-dessus. */
function d20Image(value, state="", counting=false) {
  return `<span class="ddu-roll__d20 ddu-roll__d20--image ${state}"><img src="${ASSETS}/d20.webp" alt="" draggable="false">
    <span${counting ? ` class="ddu-roll__count"` : ""}>${esc(value)}</span></span>`;
}

/** Les fenêtres ouvertes sur ce poste (runtime/roll-window.mjs les rafraîchit quand un effet change sur leur personnage). */
export const OPEN_WINDOWS = new Set();

export class RollWindow {
  /** @param {object} prompt  Ce que le moteur donne (son runtime/group-roll.mjs). */
  constructor(prompt) {
    this.prompt = prompt;
    this.actor = prompt.actor;
    this.request = prompt.request;
    this.tiles = prompt.breakdown ?? [];
    /** L'état de chaque aide : `pending`, `granted`, `refused`. */
    this.aidState = new Map();
    this.helped = false;   // Soutien accordé : l'Avantage
    this.forced = null;    // "advantage" | "disadvantage" : forcé par le joueur
    this.phase = "ready";   // ready → rolling → result
    this.result = null;
    this.skins = new Set();
    this.element = null;
  }

  /** Ouvre la fenêtre ; la promesse se résout quand elle se ferme (jet lancé ou annulé). */
  run() {
    const { promise, resolve } = Promise.withResolvers();
    this.resolve = resolve;
    OPEN_WINDOWS.add(this);
    this.prompt.signal?.addEventListener("abort", () => this.close(), { once: true });
    findSkins().then(found => {
      this.skins = found;
      if ( !this.element ) return;
      this.element.dataset.skin = [...found].join(" ");
      if ( (this.phase === "ready") && found.has("d20") ) this.render();
    });
    this.render();
    if ( this.prompt.deadline ) this.timer = setInterval(() => this.#tick(), 1000);
    return promise;
  }

  /** Le mode du jet et d'où il vient (core/roll-window.mjs `effectiveMode`). */
  get mode() {
    return effectiveMode({ request: this.request, system: this.prompt.mode ?? {}, helped: this.helped, forced: this.forced });
  }

  /** Titre et sous-titre à la manière de BG3 : la compétence, puis « Test de Dextérité ». */
  #titles() {
    const { type, key } = this.request;
    const abilities = CONFIG.DND5E.abilities ?? {};
    const abilityKey = (type === "check" || type === "save") ? key
      : (this.request.ability ?? (type === "skill" ? this.actor.system.skills?.[key]?.ability : this.actor.system.tools?.[key]?.ability)
        ?? CONFIG.DND5E.skills?.[key]?.ability ?? "int");
    const ability = game.i18n.localize(abilities[abilityKey]?.label ?? abilityKey);
    if ( type === "skill" ) return [game.i18n.localize(CONFIG.DND5E.skills?.[key]?.label ?? key), loc("Roll.CheckOf", { ability })];
    if ( type === "tool" ) {
      const tool = globalThis.dnd5e?.documents?.Trait?.keyLabel?.(key, { trait: "tool" }) ?? key;
      return [tool, loc("Roll.CheckOf", { ability })];
    }
    return [ability, loc(type === "save" ? "Roll.Save" : "Roll.Check")];
  }

  #tileHtml(tile, index) {
    const icon = tile.kind === "ability" ? (ABILITY_ICONS[tile.key] ?? "fa-dice-d20") : KIND_ICONS[tile.kind] ?? "fa-plus";
    const label = tile.kind === "request" ? loc("Roll.GMModifier") : tile.kind === "proficiency" ? loc("Roll.Proficiency", { name: tile.label })
      : tile.kind === "inspiration" ? loc("Roll.Inspired", { name: tile.label }) : tile.label;
    // Un dé en réserve (Inspiration bardique déjà reçue) : il ne s'ajoute qu'après un échec, si le joueur le veut.
    const reserve = tile.reserve ? ` data-tooltip="${esc(loc("Roll.ReserveHint"))}"` : "";
    const art = tile.img ? `<img src="${esc(tile.img)}" alt="" draggable="false">` : `<i class="fa-solid ${icon}"></i>`;
    const used = tile.reserve && this.reserveUsed ? " applied" : "";   // le dé en réserve a servi : sa tuile reste allumée
    return `<div class="ddu-roll__tile ddu-frame--roll-tile${tile.reserve ? " reserve" : ""}${used}" data-kind="${esc(tile.kind)}" data-tile="${index}"${reserve}>
      <b class="value">${esc(tile.value)}</b><span class="art">${art}</span><span class="label">${esc(label)}</span>
      ${tile.reserve ? `<small class="ddu-roll__reserve">${esc(loc("Roll.Reserve"))}</small>` : ""}</div>`;
  }

  /** Une aide de cette sorte est-elle déjà demandée ou accordée ? Une seule de chaque sorte par jet. */
  #kindTaken(kind) {
    return [...this.aidState].some(([i, st]) => (this.prompt.aids[i]?.kind === kind) && (st !== "refused"));
  }

  #aidHtml(aid, index) {
    const own = this.aidState.get(index) ?? "";
    const status = own || (this.#kindTaken(aid.kind) ? "taken" : "");
    const value = aid.kind === "help" ? "" : aid.kind === "inspiration" ? `+${aid.formula ?? "d6"}` : "+1d4";
    const label = loc(AID_LABELS[aid.kind], { name: aid.helper.name });
    const art = aid.token?.texture?.src ?? aid.helper.img;
    const tip = status ? loc(`Roll.AidState.${status}`) : loc(`Roll.AidHint.${aid.kind}`);
    const advantage = aid.kind === "help" ? `<i class="fa-solid fa-angles-up adv"></i>` : "";
    return `<button type="button" class="ddu-roll__tile ddu-roll__aid ddu-frame--roll-tile" data-aid="${index}" data-status="${status}"
      data-tooltip="${esc(tip)}" ${status || (this.phase !== "ready") ? "disabled" : ""}>
      <b class="value">${esc(value)}${advantage}</b><span class="art"><img src="${esc(art)}" alt="" draggable="false"></span>
      <span class="label">${esc(label)}</span></button>`;
  }

  /** Le mode dans le médaillon : flèche verte vers le haut (Avantage) ou rouge vers le bas (Désavantage), et d'où il vient. */
  #modeHtml() {
    const { mode, sources } = this.mode;
    if ( mode === "normal" ) return "";
    const from = sources[mode].map(s => loc(`Roll.Source.${s}`)).join(", ");
    const icon = mode === "advantage" ? "fa-arrow-up" : "fa-arrow-down";
    return `<p class="ddu-roll__mode ${mode === "advantage" ? "adv" : "dis"}" data-tooltip="${esc(from)}">
      <i class="fa-solid ${icon}"></i> ${esc(loc(mode === "advantage" ? "Roll.Advantage" : "Roll.Disadvantage"))}
      <small>${esc(from)}</small></p>`;
  }

  /** Forcer l'Avantage ou le Désavantage (un second clic rend la main au MJ et au système). */
  #forceHtml() {
    if ( this.phase !== "ready" ) return "";
    const button = (mode, icon) => `<button type="button" class="ddu-roll__force ${mode}${this.forced === mode ? " on" : ""}" data-force="${mode}"
      data-tooltip="${esc(loc(`Roll.ForceHint.${mode}`))}"><i class="fa-solid ${icon}"></i> ${esc(loc(`Roll.Force.${mode}`))}</button>`;
    return `<div class="ddu-roll__forces">${button("advantage", "fa-arrow-up")}${button("disadvantage", "fa-arrow-down")}</div>`;
  }

  #diceHtml() {
    const { mode } = this.mode;
    const count = diceShown({ advantage: mode === "advantage", disadvantage: mode === "disadvantage" });
    const draw = this.skins.has("d20") ? d20Image : d20Svg;
    if ( this.phase !== "result" ) return Array.from({ length: count }, () => draw(20)).join("");
    const values = this.result?.d20s?.length ? this.result.d20s : [this.result?.kept ?? 20];
    const keptIndex = Math.max(0, values.indexOf(this.result?.kept));
    return values.map((v, i) => {
      const state = (values.length === 1) ? "kept" : (i === keptIndex ? "kept" : "dropped");
      const counting = i === keptIndex;
      return draw(counting ? (this.result?.shown ?? v) : v, state, counting);
    }).join("");
  }

  render() {
    const r = this.request;
    const [title, subtitle] = this.#titles();
    const pending = [...this.aidState.values()].includes("pending");
    // L'Inspiration bardique n'y entre pas : son dé se lance après le test, s'il est raté (moteur, runtime/roll-bonus.mjs).
    const range = rangeText(bonusRange(this.tiles.filter(t => !t.reserve).map(t => t.value)));
    const dc = r.hideDc && (r.dc === null) ? "?" : r.dc;
    // Sans DD, la place reste : les dés ne bougent pas dans le cadre (le gabarit du médaillon la prévoit).
    const dcBlock = (dc === null) || (dc === undefined) ? `<div class="ddu-roll__dc"></div>`
      : `<div class="ddu-roll__dc"><small>${esc(loc("Roll.DC"))}</small><b>${esc(dc)}</b></div>`;
    let banner = `<button type="button" class="ddu-roll__banner" data-act="roll" ${pending ? "disabled" : ""}>${esc(loc(pending ? "Roll.Waiting" : "Roll.Click"))}</button>`;
    if ( this.phase === "rolling" ) banner = `<p class="ddu-roll__banner">${esc(loc("Roll.Rolling"))}</p>`;
    let ribbon = "";
    if ( this.phase === "result" ) {
      banner = `<p class="ddu-roll__banner ddu-roll__result"></p>`;   // la place reste ; le bandeau Réussite / Échec s'y pose
      const outcome = this.result?.success === true ? "success" : this.result?.success === false ? "failure" : "";
      if ( outcome && this.result?.final ) {
        ribbon = `<p class="ddu-roll__ribbon ${outcome}">${esc(loc(outcome === "success" ? "Roll.Success" : "Roll.Failure"))}</p>`;
      }
    }
    const left = this.prompt.deadline ? Math.max(0, Math.ceil((this.prompt.deadline - Date.now()) / 1000)) : null;
    const html = `
      <div class="ddu-roll__stage">
        ${r.label ? `<p class="ddu-roll__label">${esc(r.label)}</p>` : ""}
        <h2 class="ddu-roll__title">${esc(title)}</h2>
        <p class="ddu-roll__subtitle">${esc(subtitle)} · ${esc(this.actor.name)}</p>
        <div class="ddu-roll__medallion ddu-frame--roll-medallion">
          ${dcBlock}
          <div class="ddu-roll__dice ${this.phase}" data-act="roll">${this.#diceHtml()}</div>
          ${banner}
          ${this.#modeHtml()}
          ${ribbon}
        </div>
        <div class="ddu-roll__tiles">${this.tiles.map((t, i) => this.#tileHtml(t, i)).join("")}${this.prompt.aids.map((a, i) => this.#aidHtml(a, i)).join("")}</div>
        <p class="ddu-roll__total">${esc(loc("Roll.Total"))} <b>${esc(range)}</b></p>
        ${this.#forceHtml()}
        ${left !== null && this.phase === "ready" ? `<p class="ddu-roll__clock"><i class="fa-regular fa-hourglass-half"></i> ${left}</p>` : ""}
        ${this.phase === "ready" ? `<button type="button" class="ddu-roll__cancel" data-act="cancel">${esc(loc("Roll.Cancel"))}</button>` : ""}
        ${(this.phase === "result") && this.result?.final ? `<button type="button" class="ddu-roll__cancel" data-act="cancel">${esc(loc("Roll.Close"))}</button>` : ""}
      </div>`;
    if ( !this.element ) {
      this.element = document.createElement("div");
      this.element.className = "ddu-roll";
      // Le rang d'une fenêtre qui s'ouvre (ApplicationV2._maxZ, client/applications/api/application.mjs:131) : au-dessus de ce qui est
      // déjà ouvert, sous ce qui s'ouvrira — le choix d'Inspiration bardique après un échec restait caché dessous (vu par l'utilisateur).
      const Api = foundry.applications.api.ApplicationV2;
      if ( Number.isFinite(Api._maxZ) ) this.element.style.zIndex = String(++Api._maxZ);
      this.element.addEventListener("click", event => this.#onClick(event));
      document.body.append(this.element);
    }
    this.element.dataset.phase = this.phase;
    this.element.innerHTML = html;
    // Sur un petit écran, la fenêtre se réduit pour tenir en hauteur (vu en 1440 × 900 : le titre et Annuler dépassaient).
    const stage = this.element.querySelector(".ddu-roll__stage");
    const fit = Math.min(1, (window.innerHeight * 0.92) / (stage?.offsetHeight || 1));
    if ( stage && (fit < 1) ) stage.style.transform = `scale(${fit.toFixed(3)})`;
  }

  #tick() {
    const clock = this.element?.querySelector(".ddu-roll__clock");
    if ( !clock || !this.prompt.deadline ) return;
    clock.lastChild.textContent = ` ${Math.max(0, Math.ceil((this.prompt.deadline - Date.now()) / 1000))}`;
  }

  #onClick(event) {
    const act = event.target.closest("[data-act]")?.dataset.act;
    const aid = event.target.closest("[data-aid]");
    const force = event.target.closest("[data-force]");
    if ( aid && !aid.disabled ) return this.#askAid(Number(aid.dataset.aid));
    if ( force && (this.phase === "ready") ) {
      this.forced = (this.forced === force.dataset.force) ? null : force.dataset.force;
      return this.render();
    }
    if ( act === "cancel" ) return this.close();
    if ( (act === "roll") && (this.phase === "ready") && ![...this.aidState.values()].includes("pending") ) return this.#roll();
    if ( this.phase === "result" ) return this.close();
  }

  async #askAid(index) {
    const aid = this.prompt.aids[index];
    if ( !aid || this.aidState.has(index) || this.#kindTaken(aid.kind) ) return;
    this.aidState.set(index, "pending");
    this.render();
    let granted = false;
    try { granted = await this.prompt.askAid(aid); }
    catch ( err ) { console.error(err); }
    this.aidState.set(index, granted ? "granted" : "refused");
    if ( granted && (aid.kind === "help") ) this.helped = true;
    // L'Assistance accordée ajoute son 1d4 à la fiche : les tuiles se relisent.
    if ( granted && (aid.kind === "guidance") ) this.tiles = rollBreakdown(this.actor, this.request) ?? this.tiles;
    if ( this.element ) this.render();
  }

  /**
   * Dice So Nice lance plein écran, au-dessus de tout : en mode « sous l'interface » de son réglage, son canevas passerait sous la fenêtre —
   * on le monte juste au-dessus le temps du jet. Rend la fonction qui le remet.
   */
  #liftDice() {
    const canvas = game.dice3d?.canvas;
    const ours = Number(this.element?.style.zIndex) || 0;
    if ( !canvas || ((Number(getComputedStyle(canvas).zIndex) || 0) > ours) ) return () => {};
    const before = canvas.style.zIndex;
    canvas.style.zIndex = String(ours + 1);
    return () => { canvas.style.zIndex = before; };
  }

  async #roll() {
    this.phase = "rolling";
    this.render();
    const started = Date.now();
    const dsn = dice3dShown();
    const lower = dsn ? this.#liftDice() : () => {};
    let message = null;
    // `deferBonus` : les dés d'après le jet (Inspiration bardique…) attendent que le joueur ait vu son résultat (`afterRoll`, plus bas).
    try { message = await this.prompt.roll({ advantage: this.helped, mode: this.forced, deferBonus: true }); }
    catch ( err ) { console.error(err); }
    if ( !(message instanceof ChatMessage) || !this.element ) {
      lower();
      return this.close();
    }
    // Le d20 du médaillon tourne tant que Dice So Nice roule (sinon un instant), puis s'arrête sur le chiffre sorti.
    if ( dsn ) {
      const wait = game.dice3d.waitFor3DAnimationByMessageID?.(message.id) ?? Promise.resolve();
      await Promise.race([wait.catch(() => null), sleep(DSN_MAX_MS)]);
    }
    else await sleep(Math.max(0, SPIN_MS - (Date.now() - started)));
    lower();
    if ( !this.element ) return;
    const roll = message.rolls?.[0];
    const d20 = roll?.dice?.[0];
    const results = (d20?.results ?? []).filter(x => !x.rerolled);
    const d20s = results.map(x => x.result);
    const dc = this.request.dc;
    const kept = d20?.total ?? null;
    this.result = { total: roll?.total ?? null, d20s, kept, shown: kept ?? roll?.total ?? "", final: false,
      success: (dc === null || dc === undefined || !roll) ? null : (roll.total >= dc) };
    this.phase = "result";
    this.render();
    await sleep(350);
    await this.#countUp(roll);
    if ( !this.element ) return;
    await this.#afterRoll();
    if ( !this.element ) return;
    this.result.shown = this.result.total;
    this.result.final = true;
    this.render();
    await sleep(RESULT_MS);
    this.close();
  }

  /**
   * Comme dans BG3 : chaque tuile s'allume à son tour et s'ajoute au chiffre du d20 — un bonus fixe de sa valeur, un dé (Assistance) de
   * ce qu'il a donné dans le jet. Le total affiché à la fin est celui de dnd5e.
   */
  async #countUp(roll) {
    const extraDice = (roll?.dice ?? []).slice(1).map(d => d.total);
    let shown = Number(this.result.kept ?? 0);
    for ( const [i, tile] of this.tiles.entries() ) {
      if ( !this.element ) return;
      if ( tile.reserve ) continue;   // après le jet, s'il est raté (#afterRoll)
      const value = String(tile.value);
      const sign = value.startsWith("-") ? -1 : 1;
      let add = 0;
      if ( /^[+-]?\d+$/.test(value) ) add = Number(value);
      else if ( /d\d/i.test(value) ) add = sign * Number(extraDice.shift() ?? 0);
      if ( !add ) continue;
      shown += add;
      this.result.shown = shown;
      this.element.querySelector(`[data-tile="${i}"]`)?.classList.add("applied");
      const count = this.element.querySelector(".ddu-roll__count");
      if ( count ) {
        count.textContent = String(shown);
        count.classList.remove("bump");
        void count.getBoundingClientRect();   // relance l'animation
        count.classList.add("bump");
      }
      await sleep(STEP_MS);
    }
  }

  /**
   * Après le décompte : le moteur propose les dés d'après le jet (Inspiration bardique sur un échec, dé d'aptitude) — la question s'ouvre
   * au-dessus de la fenêtre ; accepté, le dé s'ajoute au chiffre du d20 (sa tuile s'allume) et le verdict suit le nouveau total.
   */
  async #afterRoll() {
    const extra = await this.prompt.afterRoll?.().catch(err => { console.error(err); return null; });
    if ( !extra?.added || !this.element ) return;
    const dc = this.request.dc;
    let shown = Number(this.result.shown) || 0;
    for ( const part of extra.parts ?? [] ) {
      shown += Number(part.value) || 0;
      this.result.shown = shown;
      if ( part.kind === "inspiration" ) {
        this.reserveUsed = true;
        this.element.querySelector('[data-kind="inspiration"]')?.classList.add("applied");
      }
      const count = this.element.querySelector(".ddu-roll__count");
      if ( count ) {
        count.textContent = String(shown);
        count.classList.remove("bump");
        void count.getBoundingClientRect();
        count.classList.add("bump");
      }
      await sleep(STEP_MS);
    }
    this.result.total = (Number(this.result.total) || 0) + extra.added;
    if ( (dc !== null) && (dc !== undefined) ) this.result.success = this.result.total >= dc;
  }

  /**
   * Un effet a changé sur le personnage (une Assistance lancée depuis une fiche, un état posé par le MJ) : les tuiles et le mode du système
   * se relisent, tant que le jet n'est pas parti.
   */
  refreshFromActor() {
    if ( !this.element || (this.phase !== "ready") ) return;
    this.tiles = rollBreakdown(this.actor, this.request) ?? this.tiles;
    const mode = rollMode(this.actor, this.request);
    if ( mode ) this.prompt.mode = mode;
    this.render();
  }

  close() {
    if ( !this.element ) return;
    OPEN_WINDOWS.delete(this);
    clearInterval(this.timer);
    this.element.classList.add("closing");
    const el = this.element;
    this.element = null;
    setTimeout(() => el.remove(), 250);
    this.resolve?.();
  }
}
