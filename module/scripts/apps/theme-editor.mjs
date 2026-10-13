/**
 * L'éditeur de couleurs du HUD (SPEC §45), ouvert par le bouton des réglages du module « Couleurs de l'interface ».
 *
 * On part d'un thème (livré, personnel, ou de la table), on règle chaque couleur (teinte + opacité) en voyant le HUD changer
 * aussitôt, puis on l'applique, l'enregistre sous un nom, l'exporte en JSON ou en importe un. Fermer sans appliquer remet le
 * thème en vigueur. Le MJ peut en faire le thème de la table (copié dans la bibliothèque de la table s'il est personnel).
 */
import { MODULE_ID, loc } from "../shared.mjs";
import { GROUPS, PRESETS, PRESET_IDS, TOKENS, exportTheme, fullColors, importTheme, joinColor, splitColor }
  from "../core/themes.mjs";
import { applyTheme, chooseTheme, chooseWorldTheme, currentTheme, deleteCustomTheme, paintColors, saveCustomTheme, themeState }
  from "../adapter/theme.mjs";

const { ApplicationV2 } = foundry.applications.api;
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

export class ThemeEditor extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "ddu-theme-editor",
    classes: ["ddu-theme-editor"],
    window: { title: "DDU.Theme.Title", resizable: true, icon: "fa-solid fa-palette" },
    position: { width: 520, height: 680 }
  };

  /** Le thème de départ (id du sélecteur), les couleurs en cours, et « Avancé ». */
  #source = null;
  #colors = null;
  #advanced = false;

  /** Le thème d'un id du sélecteur : `{ name, colors, custom, world }`. */
  #themeOf(id) {
    const state = themeState();
    if ( !id ) return { name: loc("Theme.FollowTable"), colors: this.#themeOf(state.worldChoice).colors };
    if ( PRESETS[id] ) return { name: loc(`Theme.Preset.${id}`), colors: { ...PRESETS[id] } };
    const [, scope, key] = String(id).match(/^custom:(world:)?(.+)$/) ?? [];
    const lib = scope ? state.worldLibrary : state.library;
    const found = lib.find(t => t.id === key) ?? (scope ? null : state.worldLibrary.find(t => t.id === key));
    return found ? { name: found.name, colors: { ...found.colors }, custom: key, world: !!scope } : { name: "BG3", colors: {} };
  }

  async _renderHTML() {
    const state = themeState();
    if ( this.#source === null ) {
      this.#source = state.choice;
      this.#colors = fullColors(currentTheme().colors);
    }
    const option = (id, label) => `<option value="${esc(id)}" ${(id === this.#source) ? "selected" : ""}>${esc(label)}</option>`;
    const options = [
      option("", loc("Theme.FollowTable")),
      `<optgroup label="${esc(loc("Theme.Builtin"))}">${PRESET_IDS.map(id => option(id, loc(`Theme.Preset.${id}`))).join("")}</optgroup>`,
      state.library.length ? `<optgroup label="${esc(loc("Theme.Mine"))}">${state.library.map(t => option(`custom:${t.id}`, t.name)).join("")}</optgroup>` : "",
      state.worldLibrary.length ? `<optgroup label="${esc(loc("Theme.Table"))}">${state.worldLibrary.map(t => option(`custom:world:${t.id}`, t.name)).join("")}</optgroup>` : ""
    ].join("");
    const groups = GROUPS.map(group => {
      const rows = TOKENS.filter(t => (t.group === group) && (t.main || this.#advanced)).map(t => {
        const { hex, alpha } = splitColor(this.#colors[t.key]);
        return `<div class="ddu-theme__row" data-key="${t.key}">
          <label>${esc(loc(`Theme.Token.${t.key}`))}</label>
          <input type="color" value="${hex}" data-part="hex" aria-label="${esc(loc(`Theme.Token.${t.key}`))}">
          <input type="range" min="0" max="100" step="1" value="${alpha}" data-part="alpha" data-tooltip="${esc(loc("Theme.Opacity"))}">
          <span class="ddu-theme__alpha">${alpha}%</span>
          <button type="button" data-action="resetColor" data-tooltip="${esc(loc("Theme.ResetColor"))}"><i class="fa-solid fa-rotate-left"></i></button>
        </div>`;
      }).join("");
      return rows ? `<fieldset><legend>${esc(loc(`Theme.Group.${group}`))}</legend>${rows}</fieldset>` : "";
    }).join("");
    const source = this.#themeOf(this.#source);
    const gm = game.user.isGM;
    const root = document.createElement("div");
    root.className = "ddu-theme";
    root.innerHTML = `
      <div class="ddu-theme__head">
        <select data-part="source">${options}</select>
        <label class="ddu-theme__advanced"><input type="checkbox" data-part="advanced" ${this.#advanced ? "checked" : ""}> ${esc(loc("Theme.Advanced"))}</label>
      </div>
      <p class="hint">${esc(loc("Theme.Hint"))}</p>
      <div class="ddu-theme__list">${groups}</div>
      <footer class="ddu-theme__actions">
        <button type="button" data-action="apply"><i class="fa-solid fa-check"></i> ${esc(loc("Theme.Apply"))}</button>
        <button type="button" data-action="saveAs"><i class="fa-solid fa-floppy-disk"></i> ${esc(loc("Theme.SaveAs"))}</button>
        ${(source.custom && (!source.world || gm)) ? `<button type="button" data-action="save"><i class="fa-solid fa-floppy-disk"></i> ${esc(loc("Theme.Save"))}</button>
        <button type="button" data-action="delete"><i class="fa-solid fa-trash"></i> ${esc(loc("Theme.Delete"))}</button>` : ""}
        <button type="button" data-action="export"><i class="fa-solid fa-file-export"></i> ${esc(loc("Theme.Export"))}</button>
        <button type="button" data-action="import"><i class="fa-solid fa-file-import"></i> ${esc(loc("Theme.Import"))}</button>
        <button type="button" data-action="reset"><i class="fa-solid fa-rotate-left"></i> ${esc(loc("Theme.Reset"))}</button>
        ${gm ? `<button type="button" data-action="setTable"><i class="fa-solid fa-users"></i> ${esc(loc("Theme.SetTable"))}</button>` : ""}
      </footer>`;
    return root;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  _onRender() {
    const el = this.element;
    el.querySelector("[data-part=source]")?.addEventListener("change", ev => this.#pick(ev.currentTarget.value));
    el.querySelector("[data-part=advanced]")?.addEventListener("change", ev => { this.#advanced = ev.currentTarget.checked; this.render(); });
    for ( const row of el.querySelectorAll(".ddu-theme__row") ) {
      const update = () => {
        const alpha = row.querySelector("[data-part=alpha]").value;
        row.querySelector(".ddu-theme__alpha").textContent = `${alpha}%`;
        this.#colors[row.dataset.key] = joinColor(row.querySelector("[data-part=hex]").value, alpha);
        paintColors(this.#colors);
      };
      row.querySelectorAll("input").forEach(i => i.addEventListener("input", update));
      row.querySelector("[data-action=resetColor]").addEventListener("click", () => {
        this.#colors[row.dataset.key] = fullColors(this.#themeOf(this.#source).colors)[row.dataset.key];
        paintColors(this.#colors);
        this.render();
      });
    }
    const on = (action, fn) => el.querySelector(`[data-action=${action}]`)?.addEventListener("click", () => fn().catch(err => {
      ui.notifications.error(err.message);
      console.error(`${MODULE_ID} | theme`, err);
    }));
    on("apply", () => this.#apply());
    on("saveAs", () => this.#saveAs());
    on("save", () => this.#save());
    on("delete", () => this.#delete());
    on("export", async () => this.#export());
    on("import", () => this.#import());
    on("reset", async () => this.#pick(this.#source));
    on("setTable", () => this.#setTable());
  }

  /** Repartir d'un thème du sélecteur (rien n'est enregistré). */
  #pick(id) {
    this.#source = id;
    this.#colors = fullColors(this.#themeOf(id).colors);
    paintColors(this.#colors);
    this.render();
  }

  /** Les couleurs en cours diffèrent-elles du thème de départ ? */
  #edited() {
    const base = fullColors(this.#themeOf(this.#source).colors);
    return TOKENS.some(t => splitColor(base[t.key]).hex + splitColor(base[t.key]).alpha
      !== splitColor(this.#colors[t.key]).hex + splitColor(this.#colors[t.key]).alpha);
  }

  /** Appliquer : le thème de départ s'il n'a pas été retouché, sinon d'abord l'enregistrer sous un nom. */
  async #apply() {
    if ( this.#edited() ) return this.#saveAs({ andApply: true });
    await chooseTheme(this.#source);
    ui.notifications.info(loc("Theme.Applied", { name: this.#themeOf(this.#source).name }));
  }

  async #ask(title, value) {
    return foundry.applications.api.DialogV2.prompt({
      window: { title },
      content: `<input type="text" name="name" value="${esc(value)}" maxlength="60" autofocus>`,
      ok: { callback: (event, button) => button.form.elements.name.value.trim() },
      rejectClose: false
    });
  }

  async #saveAs({ andApply=false }={}) {
    const name = await this.#ask(loc("Theme.SaveAs"), loc("Theme.CopyOf", { name: this.#themeOf(this.#source).name }));
    if ( !name ) return;
    const id = await saveCustomTheme({ name, colors: this.#colors });
    this.#source = id;
    if ( andApply ) await chooseTheme(id);
    ui.notifications.info(loc(andApply ? "Theme.Applied" : "Theme.Saved", { name }));
    this.render();
  }

  async #save() {
    const theme = this.#themeOf(this.#source);
    await saveCustomTheme({ id: theme.custom, name: theme.name, colors: this.#colors }, { world: theme.world });
    ui.notifications.info(loc("Theme.Saved", { name: theme.name }));
    this.render();
  }

  async #delete() {
    const theme = this.#themeOf(this.#source);
    const yes = await foundry.applications.api.DialogV2.confirm({
      window: { title: loc("Theme.Delete") }, content: `<p>${esc(loc("Theme.DeleteConfirm", { name: theme.name }))}</p>`,
      rejectClose: false
    });
    if ( !yes ) return;
    await deleteCustomTheme(theme.custom, { world: theme.world });
    this.#pick(themeState().choice);
  }

  #export() {
    const theme = this.#themeOf(this.#source);
    const data = exportTheme({ name: theme.name, colors: this.#colors });
    const file = `${MODULE_ID}-theme-${data.name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "theme"}.json`;
    foundry.utils.saveDataToFile(JSON.stringify(data, null, 2), "application/json", file);
  }

  async #import() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    const file = await new Promise(resolve => {
      input.addEventListener("change", () => resolve(input.files?.[0] ?? null), { once: true });
      input.click();
    });
    if ( !file ) return;
    let parsed;
    try { parsed = JSON.parse(await foundry.utils.readTextFromFile(file)); }
    catch { throw new Error(loc("Theme.ImportInvalid")); }
    let theme;
    try { theme = importTheme(parsed); }
    catch { throw new Error(loc("Theme.ImportInvalid")); }
    const id = await saveCustomTheme({ name: theme.name, colors: theme.colors });
    if ( theme.rejected.length ) ui.notifications.warn(loc("Theme.ImportRejected", { keys: theme.rejected.join(", ") }));
    ui.notifications.info(loc("Theme.Imported", { name: theme.name }));
    this.#pick(id);
  }

  /** MJ : ce thème devient celui de la table (un thème personnel ou retouché est d'abord copié dans la bibliothèque de la table). */
  async #setTable() {
    const theme = this.#themeOf(this.#source);
    let id = this.#source;
    if ( !id ) return;   // « suivre la table » : rien à changer
    if ( this.#edited() || (theme.custom && !theme.world) ) {
      const name = this.#edited() ? await this.#ask(loc("Theme.SetTable"), theme.name) : theme.name;
      if ( !name ) return;
      id = (await saveCustomTheme({ name, colors: this.#colors }, { world: true })).replace(/^custom:/, "custom:world:");
    }
    await chooseWorldTheme(id.replace(/^custom:world:/, "custom:"));
    ui.notifications.info(loc("Theme.TableSet", { name: this.#themeOf(id).name }));
    this.#source = id;
    this.render();
  }

  _onClose(options) {
    // Fermer sans appliquer : on revient au thème en vigueur.
    applyTheme();
    this.#source = null;
    super._onClose?.(options);
  }
}
