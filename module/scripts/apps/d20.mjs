/**
 * Panneau du bouton d20 (SPEC §5.3 bis) : tests de caractéristique, sauvegardes, compétences,
 * initiative et concentration, lancés par l'API dnd5e 6 de l'acteur (documents/actor/actor.mjs :
 * rollSkill:1305, rollAbilityCheck:1544, rollSavingThrow:1567, rollConcentration:1764,
 * rollInitiativeDialog:1909). Libellés tirés de CONFIG.DND5E, donc traduits par les modules FR.
 * Maj+clic : sans dialogue ; Alt / Ctrl : avantage / désavantage (lus par le système).
 */
import { loc } from "../shared.mjs";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const signed = n => (n >= 0 ? `+${n}` : String(n));

export class D20Panel {
  constructor(bar) {
    this.bar = bar;
    this.element = null;
  }

  toggle(anchor) {
    if ( this.element ) return this.close();
    this.open(anchor);
  }

  close() {
    this.element?.remove();
    this.element = null;
  }

  open(anchor) {
    const actor = this.bar.actor;
    if ( !actor ) return;
    const abilities = CONFIG.DND5E.abilities;
    const skills = CONFIG.DND5E.skills;
    const sys = actor.system;
    const abilityRows = Object.entries(abilities).map(([id, a]) => {
      const data = sys.abilities?.[id];
      if ( !data ) return "";
      return `<li><button type="button" data-roll="check" data-key="${id}">
          <span>${esc(game.i18n.localize(a.label))}</span><b>${signed(data.mod ?? 0)}</b></button></li>`;
    }).join("");
    const saveRows = Object.entries(abilities).map(([id, a]) => {
      const data = sys.abilities?.[id];
      if ( !data ) return "";
      const prof = data.proficient ? " ddu-d20--prof" : "";
      return `<li><button type="button" class="${prof}" data-roll="save" data-key="${id}">
          <span>${esc(game.i18n.localize(a.label))}</span><b>${signed(data.save?.value ?? data.save ?? data.mod ?? 0)}</b></button></li>`;
    }).join("");
    // Compétences groupées par caractéristique.
    const groups = {};
    for ( const [id, s] of Object.entries(skills) ) {
      const data = sys.skills?.[id];
      if ( !data ) continue;
      (groups[data.ability ?? s.ability] ??= []).push({ id, s, data });
    }
    const skillRows = Object.keys(abilities).filter(a => groups[a]).map(a => groups[a].map(({ id, s, data }) => {
      const prof = data.value >= 2 ? " ddu-d20--expert" : data.value >= 1 ? " ddu-d20--prof" : "";
      return `<li><button type="button" class="${prof}" data-roll="skill" data-key="${id}"
          data-tooltip="${esc(loc("D20.Passive", { value: data.passive ?? "" }))}">
          <span>${esc(game.i18n.localize(s.label))} <small>${esc(abilities[a]?.abbreviation ?? a)}</small></span>
          <b>${signed(data.total ?? data.mod ?? 0)}</b></button></li>`;
    }).join("")).join("");

    const panel = document.createElement("div");
    panel.className = "ddu-d20 ddu-frame ddu-frame--panel";
    const ac = sys.attributes?.ac?.value;
    const dc = sys.attributes?.spell?.dc;
    panel.innerHTML = `<header>${esc(actor.name)}
        ${ac ? `<span>${esc(loc("Bar.AC"))} ${ac}</span>` : ""}${dc ? `<span>${esc(loc("D20.SpellDC"))} ${dc}</span>` : ""}</header>
      <div class="ddu-d20__cols">
        <section><h4>${esc(loc("D20.Checks"))}</h4><ul>${abilityRows}</ul>
          <h4>${esc(loc("D20.Other"))}</h4><ul>
            <li><button type="button" data-roll="initiative"><span>${esc(loc("D20.Initiative"))}</span></button></li>
            ${sys.attributes?.concentration ? `<li><button type="button" data-roll="concentration">
              <span>${esc(loc("D20.Concentration"))}</span></button></li>` : ""}
          </ul></section>
        <section><h4>${esc(loc("D20.Saves"))}</h4><ul>${saveRows}</ul></section>
        <section class="ddu-d20__skills"><h4>${esc(loc("D20.Skills"))}</h4><ul>${skillRows}</ul></section>
      </div>`;
    panel.addEventListener("click", event => this.#roll(event));
    this.bar.element.append(panel);
    const a = anchor.getBoundingClientRect();
    const b = this.bar.element.getBoundingClientRect();
    panel.style.left = `${Math.max(0, a.left - b.left)}px`;
    panel.style.bottom = `${b.bottom - a.top + 8}px`;
    this.element = panel;
  }

  async #roll(event) {
    const button = event.target.closest("[data-roll]");
    const actor = this.bar.actor;
    if ( !button || !actor?.isOwner ) return;
    const key = button.dataset.key;
    const dialog = { configure: !event.shiftKey };
    switch ( button.dataset.roll ) {
      case "check": return actor.rollAbilityCheck({ ability: key, event }, dialog);
      case "save": return actor.rollSavingThrow({ ability: key, event }, dialog);
      case "skill": return actor.rollSkill({ skill: key, event }, dialog);
      case "concentration": return actor.rollConcentration({ event }, dialog);
      case "initiative": return actor.rollInitiativeDialog({ event });
    }
  }
}
