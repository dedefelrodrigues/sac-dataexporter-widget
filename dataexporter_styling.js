(function () {
  let template = document.createElement("template");
  template.innerHTML = `
    <style>
      :host {
        display: block;
        padding: 12px 10px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
          "Helvetica Neue", Arial, sans-serif;
        font-size: 13px;
        color: #1d2d3e;
        box-sizing: border-box;
      }

      form {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      fieldset {
        border: 1px solid #d5dadd;
        border-radius: 6px;
        padding: 10px 12px 12px;
        margin: 0;
      }

      legend {
        font-weight: 600;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #5b738b;
        padding: 0 4px;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 10px;
      }

      .form-group:last-child {
        margin-bottom: 0;
      }

      .form-group label {
        font-weight: 500;
        font-size: 12px;
        color: #475e75;
      }

      .form-group select,
      .form-group input[type="text"],
      .form-group input[type="color"] {
        width: 100%;
        padding: 6px 8px;
        border: 1px solid #d5dadd;
        border-radius: 4px;
        font-size: 13px;
        background: #fff;
        color: #1d2d3e;
        box-sizing: border-box;
        outline: none;
        transition: border-color 0.2s;
      }

      .form-group select:focus,
      .form-group input[type="text"]:focus {
        border-color: #0070F2;
        box-shadow: 0 0 0 2px rgba(0, 112, 242, 0.15);
      }

      .form-group input[type="color"] {
        height: 32px;
        padding: 2px 4px;
        cursor: pointer;
      }

      .form-row {
        display: flex;
        gap: 8px;
      }

      .form-row .form-group {
        flex: 1;
      }

      .checkbox-group {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }

      .checkbox-group input[type="checkbox"] {
        width: 16px;
        height: 16px;
        margin: 0;
        accent-color: #0070F2;
        cursor: pointer;
      }

      .checkbox-group label {
        font-size: 12px;
        font-weight: 500;
        color: #475e75;
        cursor: pointer;
      }

      .hint {
        font-size: 10px;
        color: #8b9eb0;
        margin-top: 2px;
      }

      .custom-delimiter {
        display: none;
      }

      .custom-delimiter.visible {
        display: flex;
      }

      input[type="submit"] {
        display: none;
      }
    </style>

    <form id="form">
      <!-- ── File Settings ─────────────────────────────────────────── -->
      <fieldset>
        <legend>File Settings</legend>

        <div class="form-group">
          <label for="styling_fileName">File Name</label>
          <input
            id="styling_fileName"
            type="text"
            maxlength="100"
            placeholder="data_export"
          />
          <span class="hint">Downloaded as <em>fileName</em>.csv</span>
        </div>
      </fieldset>

      <!-- ── Delimiter Settings ────────────────────────────────────── -->
      <fieldset>
        <legend>Delimiter</legend>

        <div class="form-group">
          <label for="styling_delimiter">Field Delimiter</label>
          <select id="styling_delimiter">
            <option value="comma">Comma (,)</option>
            <option value="semicolon">Semicolon (;)</option>
            <option value="tab">Tab</option>
            <option value="pipe">Pipe (|)</option>
            <option value="custom">Custom…</option>
          </select>
        </div>

        <div class="form-group custom-delimiter" id="customDelimGroup">
          <label for="styling_customDelimiter">Custom Delimiter</label>
          <input
            id="styling_customDelimiter"
            type="text"
            maxlength="5"
            placeholder="|"
          />
          <span class="hint">Enter one or more characters</span>
        </div>
      </fieldset>

      <!-- ── Formatting Settings ──────────────────────────────────── -->
      <fieldset>
        <legend>Formatting</legend>

        <div class="form-group">
          <label for="styling_dateFormat">Date Format</label>
          <select id="styling_dateFormat">
            <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD.MM.YYYY">DD.MM.YYYY</option>
            <option value="YYYY/MM/DD">YYYY/MM/DD</option>
            <option value="MM-DD-YYYY">MM-DD-YYYY</option>
            <option value="DD-MM-YYYY">DD-MM-YYYY</option>
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="styling_decimalSeparator">Decimal Separator</label>
            <select id="styling_decimalSeparator">
              <option value=".">Dot (.)</option>
              <option value=",">Comma (,)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="styling_thousandsSeparator">Thousands Sep.</label>
            <select id="styling_thousandsSeparator">
              <option value="">None</option>
              <option value=",">Comma (,)</option>
              <option value=".">Dot (.)</option>
              <option value=" ">Space</option>
              <option value="'">Apostrophe (')</option>
            </select>
          </div>
        </div>

        <div class="checkbox-group">
          <input type="checkbox" id="styling_useRawValues" />
          <label for="styling_useRawValues">
            Use raw values (apply custom number formatting)
          </label>
        </div>
        <span class="hint" style="margin-top:-2px;">
          When off, SAC-formatted values are used as-is
        </span>

        <div class="checkbox-group" style="margin-top:6px;">
          <input type="checkbox" id="styling_includeHeaders" checked />
          <label for="styling_includeHeaders">
            Include column headers
          </label>
        </div>
      </fieldset>

      <!-- ── Button Settings ──────────────────────────────────────── -->
      <fieldset>
        <legend>Button Appearance</legend>

        <div class="form-group">
          <label for="styling_buttonLabel">Button Label</label>
          <input
            id="styling_buttonLabel"
            type="text"
            maxlength="40"
            placeholder="Download CSV"
          />
        </div>

        <div class="form-group">
          <label for="styling_buttonColor">Button Color</label>
          <input type="color" id="styling_buttonColor" />
        </div>
      </fieldset>

      <input type="submit" />
    </form>
  `;

  class DataExporterStylingPanel extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: "open" });
      this._shadowRoot.appendChild(template.content.cloneNode(true));

      // ── Attach event listeners ─────────────────────────────────────
      this._shadowRoot
        .getElementById("form")
        .addEventListener("submit", this._submit.bind(this));

      // Show/hide custom delimiter field
      this._shadowRoot
        .getElementById("styling_delimiter")
        .addEventListener("change", () => this._updateCustomDelimVisibility());
    }

    // ── Submit handler: dispatch propertiesChanged event ───────────────
    _submit(e) {
      e.preventDefault();

      this.dispatchEvent(
        new CustomEvent("propertiesChanged", {
          detail: {
            properties: {
              fileName: this.fileName,
              delimiter: this.delimiter,
              customDelimiter: this.customDelimiter,
              dateFormat: this.dateFormat,
              decimalSeparator: this.decimalSeparator,
              thousandsSeparator: this.thousandsSeparator,
              includeHeaders: this.includeHeaders,
              buttonLabel: this.buttonLabel,
              buttonColor: this.buttonColor,
              useRawValues: this.useRawValues,
            },
          },
        })
      );
    }

    // ── Show/hide custom delimiter input ──────────────────────────────
    _updateCustomDelimVisibility() {
      const group = this._shadowRoot.getElementById("customDelimGroup");
      const delimiterValue = this._shadowRoot.getElementById("styling_delimiter").value;
      if (delimiterValue === "custom") {
        group.classList.add("visible");
      } else {
        group.classList.remove("visible");
      }
    }

    // ── Property setters (called by framework to initialize values) ───
    set fileName(val) {
      this._shadowRoot.getElementById("styling_fileName").value = val || "";
    }
    get fileName() {
      return this._shadowRoot.getElementById("styling_fileName").value;
    }

    set delimiter(val) {
      this._shadowRoot.getElementById("styling_delimiter").value = val || "comma";
      this._updateCustomDelimVisibility();
    }
    get delimiter() {
      return this._shadowRoot.getElementById("styling_delimiter").value;
    }

    set customDelimiter(val) {
      this._shadowRoot.getElementById("styling_customDelimiter").value = val || "";
    }
    get customDelimiter() {
      return this._shadowRoot.getElementById("styling_customDelimiter").value;
    }

    set dateFormat(val) {
      this._shadowRoot.getElementById("styling_dateFormat").value = val || "YYYY-MM-DD";
    }
    get dateFormat() {
      return this._shadowRoot.getElementById("styling_dateFormat").value;
    }

    set decimalSeparator(val) {
      this._shadowRoot.getElementById("styling_decimalSeparator").value = val || ".";
    }
    get decimalSeparator() {
      return this._shadowRoot.getElementById("styling_decimalSeparator").value;
    }

    set thousandsSeparator(val) {
      this._shadowRoot.getElementById("styling_thousandsSeparator").value = val || "";
    }
    get thousandsSeparator() {
      return this._shadowRoot.getElementById("styling_thousandsSeparator").value;
    }

    set includeHeaders(val) {
      this._shadowRoot.getElementById("styling_includeHeaders").checked =
        val !== false;
    }
    get includeHeaders() {
      return this._shadowRoot.getElementById("styling_includeHeaders").checked;
    }

    set buttonLabel(val) {
      this._shadowRoot.getElementById("styling_buttonLabel").value = val || "";
    }
    get buttonLabel() {
      return this._shadowRoot.getElementById("styling_buttonLabel").value;
    }

    set buttonColor(val) {
      this._shadowRoot.getElementById("styling_buttonColor").value = val || "#0070F2";
    }
    get buttonColor() {
      return this._shadowRoot.getElementById("styling_buttonColor").value;
    }

    set useRawValues(val) {
      this._shadowRoot.getElementById("styling_useRawValues").checked = val === true;
    }
    get useRawValues() {
      return this._shadowRoot.getElementById("styling_useRawValues").checked;
    }
  }

  customElements.define("com-sac-dataexporter-styling", DataExporterStylingPanel);
})();
