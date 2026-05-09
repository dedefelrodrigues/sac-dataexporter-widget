(function () {
  // Minimal test - just a colored box to verify the pipeline works
  let template = document.createElement("template");
  template.innerHTML = '<div style="background:#0070F2;color:#fff;padding:20px;text-align:center;border-radius:8px;font-family:sans-serif;width:100%;height:100%;box-sizing:border-box;display:flex;align-items:center;justify-content:center;"><span>Data Exporter Ready</span></div>';

  class DataExporter extends HTMLElement {
    constructor() {
      super();
      let shadowRoot = this.attachShadow({ mode: "open" });
      shadowRoot.appendChild(template.content.cloneNode(true));
      this._props = {};
    }

    onCustomWidgetBeforeUpdate(changedProperties) {
      this._props = { ...this._props, ...changedProperties };
    }

    onCustomWidgetAfterUpdate(changedProperties) {
      // no-op for now
    }
  }

  customElements.define("com-sac-dataexporter", DataExporter);
})();
