(function () {
  console.log("[DataExporter] Script starting...");

  // Same full template as the real widget
  let template = document.createElement("template");
  template.innerHTML = '<style>:host{display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}.exporter-container{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;width:100%;height:100%;padding:12px;box-sizing:border-box}.export-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 24px;border:none;border-radius:8px;background-color:#0070F2;color:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:background-color .2s ease,transform .1s ease,box-shadow .2s ease;white-space:nowrap;min-width:120px;box-shadow:0 2px 6px rgba(0,112,242,.25)}.export-btn:hover{background-color:#0058c4;box-shadow:0 4px 12px rgba(0,112,242,.35)}.export-btn:active{transform:scale(.97)}.export-btn:disabled{background-color:#a0c4f1;cursor:not-allowed;box-shadow:none}.export-btn svg{width:18px;height:18px;fill:currentColor}.status-line{font-size:11px;color:#666;text-align:center;display:none}.status-line.visible{display:block}.status-line.error{color:#d9363e}.status-line.success{color:#1a7d36}</style><div class="exporter-container"><button class="export-btn" id="exportBtn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg><span id="btnLabel">Download CSV</span></button><div class="status-line" id="statusLine"></div></div>';

  class DataExporter extends HTMLElement {
    constructor() {
      super();
      let shadowRoot = this.attachShadow({ mode: "open" });
      shadowRoot.appendChild(template.content.cloneNode(true));
      this._props = {};
      console.log("[DataExporter] Constructor done.");
    }

    onCustomWidgetBeforeUpdate(changedProperties) {
      this._props = { ...this._props, ...changedProperties };
    }

    onCustomWidgetAfterUpdate(changedProperties) {
      if ("buttonLabel" in changedProperties) {
        this._shadowRoot.getElementById("btnLabel").textContent =
          changedProperties.buttonLabel || "Download CSV";
      }
      if ("buttonColor" in changedProperties) {
        this._shadowRoot.getElementById("exportBtn").style.backgroundColor =
          changedProperties.buttonColor;
      }
    }
  }

  console.log("[DataExporter] Registering custom element...");
  customElements.define("com-sac-dataexporter", DataExporter);
  console.log("[DataExporter] Custom element registered successfully.");
})();
