(function () {
  var t = document.createElement("template");
  t.innerHTML = '<style>:host{display:block;padding:12px 10px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-size:13px;color:#1d2d3e;box-sizing:border-box}form{display:flex;flex-direction:column;gap:14px}fieldset{border:1px solid #d5dadd;border-radius:6px;padding:10px 12px 12px;margin:0}legend{font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#5b738b;padding:0 4px}.fg{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}.fg:last-child{margin-bottom:0}.fg label{font-weight:500;font-size:12px;color:#475e75}.fg select,.fg input[type="text"],.fg input[type="color"]{width:100%;padding:6px 8px;border:1px solid #d5dadd;border-radius:4px;font-size:13px;background:#fff;color:#1d2d3e;box-sizing:border-box;outline:none}.fg select:focus,.fg input[type="text"]:focus{border-color:#0070F2;box-shadow:0 0 0 2px rgba(0,112,242,.15)}.fg input[type="color"]{height:32px;padding:2px 4px;cursor:pointer}.fr{display:flex;gap:8px}.fr .fg{flex:1}.cb{display:flex;align-items:center;gap:8px;margin-bottom:6px}.cb input[type="checkbox"]{width:16px;height:16px;margin:0;accent-color:#0070F2;cursor:pointer}.cb label{font-size:12px;font-weight:500;color:#475e75;cursor:pointer}.hint{font-size:10px;color:#8b9eb0;margin-top:2px}.cd{display:none}.cd.v{display:flex}input[type="submit"]{display:none}</style><form id="f"><fieldset><legend>File Settings</legend><div class="fg"><label for="s_fn">File Name</label><input id="s_fn" type="text" maxlength="100" placeholder="data_export"/><span class="hint">Downloaded as <em>fileName</em>.csv</span></div></fieldset><fieldset><legend>Delimiter</legend><div class="fg"><label for="s_dl">Field Delimiter</label><select id="s_dl"><option value="comma">Comma (,)</option><option value="semicolon">Semicolon (;)</option><option value="tab">Tab</option><option value="pipe">Pipe (|)</option><option value="custom">Custom…</option></select></div><div class="fg cd" id="cdg"><label for="s_cd">Custom Delimiter</label><input id="s_cd" type="text" maxlength="5" placeholder="|"/><span class="hint">Enter one or more characters</span></div></fieldset><fieldset><legend>Formatting</legend><div class="fg"><label for="s_df">Date Format</label><select id="s_df"><option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option><option value="DD/MM/YYYY">DD/MM/YYYY</option><option value="MM/DD/YYYY">MM/DD/YYYY</option><option value="DD.MM.YYYY">DD.MM.YYYY</option><option value="YYYY/MM/DD">YYYY/MM/DD</option><option value="MM-DD-YYYY">MM-DD-YYYY</option><option value="DD-MM-YYYY">DD-MM-YYYY</option></select></div><div class="fr"><div class="fg"><label for="s_ds">Decimal Separator</label><select id="s_ds"><option value=".">Dot (.)</option><option value=",">Comma (,)</option></select></div><div class="fg"><label for="s_ts">Thousands Sep.</label><select id="s_ts"><option value="">None</option><option value=",">Comma (,)</option><option value=".">Dot (.)</option><option value=" ">Space</option><option value="\'">Apostrophe</option></select></div></div><div class="cb"><input type="checkbox" id="s_rv"/><label for="s_rv">Use raw values (custom number formatting)</label></div><span class="hint" style="margin-top:-2px">When off, SAC-formatted values are used as-is</span><div class="cb" style="margin-top:6px"><input type="checkbox" id="s_ih" checked/><label for="s_ih">Include column headers</label></div></fieldset><fieldset><legend>Button Appearance</legend><div class="fg"><label for="s_bl">Button Label</label><input id="s_bl" type="text" maxlength="40" placeholder="Download CSV"/></div><div class="fg"><label for="s_bc">Button Color</label><input type="color" id="s_bc"/></div></fieldset><input type="submit"/></form>';

  function StylingPanel() {
    HTMLElement.call(this);
    this._sr = this.attachShadow({ mode: "open" });
    this._sr.appendChild(t.content.cloneNode(true));
    var s = this;
    this._sr.getElementById("f").addEventListener("submit", function (e) { s._submit(e); });
    this._sr.getElementById("s_dl").addEventListener("change", function () { s._vis(); });
  }

  StylingPanel.prototype = Object.create(HTMLElement.prototype);
  StylingPanel.prototype.constructor = StylingPanel;

  StylingPanel.prototype._submit = function (e) {
    e.preventDefault();
    this.dispatchEvent(new CustomEvent("propertiesChanged", { detail: { properties: {
      fileName: this.fileName, delimiter: this.delimiter, customDelimiter: this.customDelimiter,
      dateFormat: this.dateFormat, decimalSeparator: this.decimalSeparator,
      thousandsSeparator: this.thousandsSeparator, includeHeaders: this.includeHeaders,
      buttonLabel: this.buttonLabel, buttonColor: this.buttonColor, useRawValues: this.useRawValues
    }}}));
  };

  StylingPanel.prototype._vis = function () {
    var g = this._sr.getElementById("cdg");
    g.className = this._sr.getElementById("s_dl").value === "custom" ? "fg cd v" : "fg cd";
  };

  function prop(id, dv) {
    return {
      get: function () { return this._sr.getElementById(id).value; },
      set: function (v) { this._sr.getElementById(id).value = v != null ? v : dv; }
    };
  }

  function bprop(id) {
    return {
      get: function () { return this._sr.getElementById(id).checked; },
      set: function (v) { this._sr.getElementById(id).checked = !!v; }
    };
  }

  Object.defineProperty(StylingPanel.prototype, "fileName", prop("s_fn", ""));
  Object.defineProperty(StylingPanel.prototype, "delimiter", {
    get: function () { return this._sr.getElementById("s_dl").value; },
    set: function (v) { this._sr.getElementById("s_dl").value = v || "comma"; this._vis(); }
  });
  Object.defineProperty(StylingPanel.prototype, "customDelimiter", prop("s_cd", ""));
  Object.defineProperty(StylingPanel.prototype, "dateFormat", prop("s_df", "YYYY-MM-DD"));
  Object.defineProperty(StylingPanel.prototype, "decimalSeparator", prop("s_ds", "."));
  Object.defineProperty(StylingPanel.prototype, "thousandsSeparator", prop("s_ts", ""));
  Object.defineProperty(StylingPanel.prototype, "includeHeaders", bprop("s_ih"));
  Object.defineProperty(StylingPanel.prototype, "buttonLabel", prop("s_bl", ""));
  Object.defineProperty(StylingPanel.prototype, "buttonColor", prop("s_bc", "#0070F2"));
  Object.defineProperty(StylingPanel.prototype, "useRawValues", bprop("s_rv"));

  customElements.define("com-sac-dataexporter-styling", StylingPanel);
})();
