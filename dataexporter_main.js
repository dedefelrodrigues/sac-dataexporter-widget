(function () {
  var template = document.createElement("template");
  template.innerHTML = '<style>:host{display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}.exporter-container{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;width:100%;height:100%;padding:12px;box-sizing:border-box}.export-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 24px;border:none;border-radius:8px;background-color:#0070F2;color:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:background-color .2s ease,transform .1s ease,box-shadow .2s ease;white-space:nowrap;min-width:120px;box-shadow:0 2px 6px rgba(0,112,242,.25)}.export-btn:hover{background-color:#0058c4;box-shadow:0 4px 12px rgba(0,112,242,.35)}.export-btn:active{transform:scale(.97)}.export-btn:disabled{background-color:#a0c4f1;cursor:not-allowed;box-shadow:none}.export-btn svg{width:18px;height:18px;fill:currentColor}.status-line{font-size:11px;color:#666;text-align:center;display:none}.status-line.visible{display:block}.status-line.error{color:#d9363e}.status-line.success{color:#1a7d36}</style><div class="exporter-container"><button class="export-btn" id="exportBtn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg><span id="btnLabel">Download CSV</span></button><div class="status-line" id="statusLine"></div></div>';

  // ── Constructor (prototypal, flat — no nested IIFE) ────────────────
  function DataExporter() {
    HTMLElement.call(this);
    this._shadowRoot = this.attachShadow({ mode: "open" });
    this._shadowRoot.appendChild(template.content.cloneNode(true));
    this._props = {};
    var self = this;
    this._shadowRoot.getElementById("exportBtn")
      .addEventListener("click", function () { self._handleExport(); });
  }

  DataExporter.prototype = Object.create(HTMLElement.prototype);
  DataExporter.prototype.constructor = DataExporter;

  DataExporter.prototype.onCustomWidgetBeforeUpdate = function (changed) {
    for (var k in changed) { this._props[k] = changed[k]; }
  };

  DataExporter.prototype.onCustomWidgetAfterUpdate = function (changed) {
    if ("buttonLabel" in changed) {
      this._shadowRoot.getElementById("btnLabel").textContent =
        changed.buttonLabel || "Download CSV";
    }
    if ("buttonColor" in changed) {
      this._shadowRoot.getElementById("exportBtn").style.backgroundColor =
        changed.buttonColor;
    }
  };

  DataExporter.prototype.exportCSV = function () { this._handleExport(); };

  DataExporter.prototype._handleExport = function () {
    var btn = this._shadowRoot.getElementById("exportBtn");
    var line = this._shadowRoot.getElementById("statusLine");
    try {
      if (!this.dataBinding || !this.dataBinding.data) {
        line.textContent = "No data is linked. Please link a table to this widget first.";
        line.className = "status-line visible error";
        this.dispatchEvent(new Event("onExportError"));
        return;
      }
      var data = this.dataBinding.data;
      var meta = this.dataBinding.metadata;
      if (!data || !data.length) {
        line.textContent = "No data rows to export.";
        line.className = "status-line visible error";
        this.dispatchEvent(new Event("onExportError"));
        return;
      }
      btn.disabled = true;
      line.textContent = "Generating CSV...";
      line.className = "status-line visible";

      var csv = buildCSV(this, data, meta);
      downloadFile(this, csv);

      line.textContent = "Exported " + data.length + " row" + (data.length !== 1 ? "s" : "") + ".";
      line.className = "status-line visible success";
      this.dispatchEvent(new Event("onExportComplete"));
      setTimeout(function () { line.classList.remove("visible", "success"); }, 5000);
    } catch (e) {
      line.textContent = "Export failed: " + e.message;
      line.className = "status-line visible error";
      this.dispatchEvent(new Event("onExportError"));
    } finally {
      btn.disabled = false;
    }
  };

  // ── CSV generation ──────────────────────────────────────────────────
  function buildCSV(w, data, meta) {
    var p = w._props;
    var dMap = { comma: ",", semicolon: ";", tab: "\t", pipe: "|", custom: p.customDelimiter || "|" };
    var delim = dMap[p.delimiter] || ",";

    var cols = [];
    if (meta && meta.feeds) {
      if (meta.feeds.dimensions && meta.feeds.dimensions.values) {
        meta.feeds.dimensions.values.forEach(function (k) { cols.push({ k: k, t: "dim" }); });
      }
      if (meta.feeds.measures && meta.feeds.measures.values) {
        meta.feeds.measures.values.forEach(function (k) { cols.push({ k: k, t: "meas" }); });
      }
    }
    if (!cols.length && data.length) {
      Object.keys(data[0]).forEach(function (k) {
        cols.push({ k: k, t: k.indexOf("measures_") === 0 ? "meas" : "dim" });
      });
    }

    var lines = [];
    if (p.includeHeaders !== false) {
      var hdrs = [];
      for (var i = 0; i < cols.length; i++) { hdrs.push(colLabel(cols[i].k, meta)); }
      for (var j = 0; j < hdrs.length; j++) { hdrs[j] = esc(hdrs[j], delim); }
      lines.push(hdrs.join(delim));
    }

    for (var r = 0; r < data.length; r++) {
      var row = data[r], fields = [];
      for (var c = 0; c < cols.length; c++) {
        var col = cols[c], raw = row[col.k], val = "";
        if (col.t === "dim") {
          val = raw && raw.label ? raw.label : raw ? String(raw) : "";
        } else {
          if (p.useRawValues === true && raw && raw.raw !== undefined) {
            val = fmtNum(raw.raw);
          } else if (raw && raw.raw !== undefined && !isNaN(raw.raw)) {
            val = fmtNum(raw.raw);
          } else if (raw && raw.formatted !== undefined) {
            val = raw.formatted;
          } else {
            val = raw ? String(raw) : "";
          }
        }
        fields.push(esc(fmtDate(val), delim));
      }
      lines.push(fields.join(delim));
    }
    return "\uFEFF" + lines.join("\r\n");
  }

  function colLabel(key, meta) {
    if (meta) {
      if (key.indexOf("dimensions_") === 0 && meta.dimensions) {
        var dm = meta.dimensions[key];
        if (dm && dm.description) return dm.description;
        if (dm && dm.id) return dm.id;
      }
      if (key.indexOf("measures_") === 0 && meta.mainStructureMembers) {
        var mm = meta.mainStructureMembers[key];
        if (mm && mm.label) return mm.label;
        if (mm && mm.id) return mm.id;
      }
    }
    return key;
  }

  function fmtNum(v) {
    if (v === null || v === undefined || isNaN(v)) return v != null ? String(v) : "";
    var p = String(v).split("."), ip = p[0], dp = p[1] || "";
    while (dp.length > 2 && dp.charAt(dp.length - 1) === "0") dp = dp.substring(0, dp.length - 1);
    return dp.length ? ip + "." + dp : ip;
  }

  function fmtDate(v) {
    if (!v || typeof v !== "string") return v;
    var m = v.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
    if (m) return m[1] + "-" + pad(m[2]) + "-" + pad(m[3]);
    m = v.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})[\sT](\d{1,2}):(\d{2})/);
    if (m) return m[1] + "-" + pad(m[2]) + "-" + pad(m[3]) + " " + pad(m[4]) + ":" + m[5];
    return v;
  }

  function pad(n) { return n.length === 1 ? "0" + n : n; }

  function esc(v, d) {
    var s = String(v);
    if (s.indexOf(d) !== -1 || s.indexOf('"') !== -1 || s.indexOf("\n") !== -1 || s.indexOf("\r") !== -1) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function downloadFile(w, csv) {
    var fn = (w._props.fileName || "data_export") + ".csv";
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = fn; a.style.display = "none";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // ── Register (must be last — SAC times out if this isn't reached quickly) ──
  customElements.define("com-sac-dataexporter", DataExporter);
})();
