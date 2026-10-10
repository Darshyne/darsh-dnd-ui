/**
 * Infobulles des cases de la Barre (SPEC §5.9).
 * - Courte : posée dans `data-tooltip-html` au rendu (nom, coût, niveau, portée, dégâts, raisons).
 * - Complète : la courte + la description enrichie de l'objet (liens, jets en ligne), construite à la
 *   demande (Alt maintenu, réglage « toujours complètes », épinglage) et gardée en cache.
 * L'épinglage est celui du cœur V14 (`TooltipManager#activate(…, {locked: true})`,
 * helpers/interaction/tooltip-manager.mjs:227-281) : clic droit sur l'infobulle épinglée ou éloigner la
 * souris la ferme ; le clic du milieu épingle aussi, nativement.
 */
import { loc } from "../shared.mjs";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const cache = new Map();

/**
 * Infobulle courte (HTML) d'une case.
 * @param {object} view   Retour de cellView (adapter/items.mjs).
 */
/** 0.18.0 : l'état d'une source de lumière portée — « Allumée — reste 5 h 20 », « Éteinte — reste 1 h 00 », « Vide ». */
export function lightLine(light) {
  const left = Number(light.left);
  if ( Number.isFinite(left) && (left <= 0) ) return loc("Bar.Light.Empty");
  const minutes = Number.isFinite(left) ? Math.ceil(left / 60) : null;
  const time = (minutes === null) ? "" : loc("Bar.Light.Left", { h: Math.floor(minutes / 60), m: String(minutes % 60).padStart(2, "0") });
  return `${loc(light.lit ? "Bar.Light.Lit" : "Bar.Light.Out")}${time}`;
}

export function shortTooltip(view) {
  const lines = [`<strong>${esc(view.name)}</strong>`];
  const bits = [];
  if ( view.cost && view.primary ) {
    const label = CONFIG.DND5E.activityActivationTypes?.[view.primary.activation?.type]?.label;
    if ( label ) bits.push(game.i18n.localize(label));
  }
  if ( view.spellLevel === 0 ) bits.push(loc("Bar.Cantrip"));
  else if ( view.spellLevel > 0 ) bits.push(loc("Bar.SpellLevel", { level: view.spellLevel }));
  if ( view.concentration ) bits.push(loc("Bar.ConcentrationTag"));
  if ( view.ritual ) bits.push(loc("Bar.Ritual"));
  const range = view.primary?.labels?.range ?? view.item?.labels?.range;
  if ( range ) bits.push(range);
  if ( view.uses ) bits.push(loc("Bar.Uses", { value: view.uses.value, max: view.uses.max }));
  if ( bits.length ) lines.push(bits.map(esc).join(" · "));
  const damage = view.primary?.labels?.damage?.map?.(d => d.label).filter(Boolean).join(" + ");
  if ( damage ) lines.push(esc(damage));
  if ( view.light ) lines.push(`<span class="ddu-light-state">${esc(lightLine(view.light))}</span>`);
  if ( view.enchantments?.length ) {
    lines.push(`<span class="ddu-enchanted">${esc(loc("Bar.Enchanted", { names: view.enchantments.join(", ") }))}</span>`);
  }
  for ( const r of view.reasons ) lines.push(`<span class="ddu-reason">${esc(loc(`Reason.${r}`))}</span>`);
  // Ce que le moteur juge (tour, budget, états) : ses phrases, déjà traduites.
  for ( const line of view.issues ?? [] ) lines.push(`<span class="ddu-reason">${esc(line)}</span>`);
  if ( view.canUpcast && view.upcast.length > 1 ) lines.push(`<em>${esc(loc("Bar.UpcastHint"))}</em>`);
  lines.push(`<em class="ddu-tooltip__hint">${esc(loc("Bar.TooltipHint"))}</em>`);
  return `<div class="ddu-tooltip">${lines.join("<br>")}</div>`;
}

/**
 * Infobulle complète : la courte, puis cible, durée et description enrichie.
 * @returns {Promise<string>}
 */
export async function fullTooltip(view) {
  const doc = view.item ?? null;
  const key = `${view.ref}|${doc?._stats?.modifiedTime ?? ""}|${view.reasons.join(",")}|${(view.issues ?? []).join(",")}`;
  if ( cache.has(key) ) return cache.get(key);

  const extra = [];
  const labels = view.primary?.labels ?? {};
  for ( const [k, label] of [["target", "Bar.Target"], ["duration", "Bar.Duration"]] ) {
    const value = labels[k];
    if ( value ) extra.push(`<span class="ddu-tooltip__label">${esc(loc(label))}</span> ${esc(value)}`);
  }
  let description = "";
  const raw = doc?.system?.description?.value;
  if ( raw ) {
    description = await foundry.applications.ux.TextEditor.implementation.enrichHTML(raw, {
      rollData: doc.getRollData?.() ?? {}, relativeTo: doc, secrets: doc.isOwner
    });
  }
  const short = shortTooltip(view).replace(/<br><em class="ddu-tooltip__hint">.*?<\/em>/, "");
  const html = `<div class="ddu-tooltip ddu-tooltip--full">${short.replace(/^<div class="ddu-tooltip">|<\/div>$/g, "")}`
    + (extra.length ? `<div class="ddu-tooltip__extra">${extra.join("<br>")}</div>` : "")
    + (description ? `<div class="ddu-tooltip__description">${description}</div>` : "")
    + "</div>";
  if ( cache.size > 200 ) cache.clear();
  cache.set(key, html);
  return html;
}
