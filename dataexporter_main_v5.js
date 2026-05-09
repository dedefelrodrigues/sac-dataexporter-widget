(function () {
  console.log("[DataExporter v5] Script starting...");

  let template = document.createElement("template");
  template.innerHTML = '<style>:host{display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}.exporter-container{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;width:100%;height:100%;padding:12px;box-sizing:border-box}.export-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 24px;border:none;border-radius:8px;background-color:#0070F2;color:#fff;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 2px 6px rgba(0,112,242,.25)}.export-btn svg{width:18px;height:18px;fill:currentColor}.status-line{font-size:11px;color:#666;text-align:center;display:none}.status-line.visible{display:block}.status-line.error{color:#d9363e}.status-line.success{color:#1a7d36}</style><div class="exporter-container"><button class="export-btn" id="exportBtn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg><span id="btnLabel">Download CSV</span></button><div class="status-line" id="statusLine"></div></div>';

  class DataExporter extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: "open" });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
      this._props = {};

      this._shadowRoot
        .getElementById("exportBtn")
        .addEventListener("click", this._handleExport.bind(this));

      console.log("[DataExporter v5] Constructor done.");
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

    // ── Export handler ───────────────────────────────────────────────
    _handleExport() {
      var statusLine = this._shadowRoot.getElementById("statusLine");

      if (!this.dataBinding || !this.dataBinding.data) {
        statusLine.textContent = "No data linked.";
        statusLine.className = "status-line visible error";
        return;
      }

      var data = this.dataBinding.data;
      var metadata = this.dataBinding.metadata;

      if (!data || data.length === 0) {
        statusLine.textContent = "No data rows.";
        statusLine.className = "status-line visible error";
        return;
      }

      // Generate CSV
      var csvContent = this._generateCSV(data, metadata);

      // Log first 200 chars for debugging
      console.log("[DataExporter v5] CSV generated (" + csvContent.length + " chars). Preview:", csvContent.substring(0, 200));

      statusLine.textContent = "CSV ready! " + data.length + " rows, " + csvContent.length + " chars.";
      statusLine.className = "status-line visible success";
    }

    // ── CSV generation ───────────────────────────────────────────────
    _generateCSV(data, metadata) {
      var p = this._props;

      // Resolve delimiter
      var delimiterMap = {
        comma: ",",
        semicolon: ";",
        tab: "\t",
        pipe: "|",
        custom: p.customDelimiter || "|"
      };
      var delimiter = delimiterMap[p.delimiter] || ",";

      // Build ordered column list from metadata
      var columns = [];
      if (metadata && metadata.feeds) {
        var dimFeed = metadata.feeds.dimensions;
        var measFeed = metadata.feeds.measures;
        if (dimFeed && dimFeed.values) {
          dimFeed.values.forEach(function (key) {
            columns.push({ key: key, type: "dimension" });
          });
        }
        if (measFeed && measFeed.values) {
          measFeed.values.forEach(function (key) {
            columns.push({ key: key, type: "measure" });
          });
        }
      }

      // Fallback: derive columns from first data row
      if (columns.length === 0 && data.length > 0) {
        var firstRow = data[0];
        Object.keys(firstRow).forEach(function (key) {
          columns.push({
            key: key,
            type: key.indexOf("measures_") === 0 ? "measure" : "dimension"
          });
        });
      }

      // Build CSV lines
      var lines = [];

      // Header row
      if (p.includeHeaders !== false) {
        var headers = columns.map(function (col) {
          return _getColumnLabel(col.key, metadata);
        });
        lines.push(headers.map(function (h) {
          return _escapeCSVField(h, delimiter);
        }).join(delimiter));
      }

      // Data rows
      data.forEach(function (row) {
        var fields = columns.map(function (col) {
          var raw = row[col.key];
          var value = "";

          if (col.type === "dimension") {
            value = raw && raw.label ? raw.label : raw ? String(raw) : "";
          } else {
            if (p.useRawValues === true && raw && raw.raw !== undefined) {
              value = _formatNumber(raw.raw);
            } else if (raw && raw.raw !== undefined && !isNaN(raw.raw)) {
              value = _formatNumber(raw.raw);
            } else if (raw && raw.formatted !== undefined) {
              value = raw.formatted;
            } else {
              value = raw ? String(raw) : "";
            }
          }

          value = _applyDateFormat(value);
          return _escapeCSVField(value, delimiter);
        });

        lines.push(fields.join(delimiter));
      });

      return "\uFEFF" + lines.join("\r\n");
    }
  }

  // ── Helper functions (module-scoped, not class methods) ──────────────

  function _getColumnLabel(key, metadata) {
    if (metadata) {
      if (key.indexOf("dimensions_") === 0 && metadata.dimensions) {
        var dimMeta = metadata.dimensions[key];
        if (dimMeta && dimMeta.description) return dimMeta.description;
        if (dimMeta && dimMeta.id) return dimMeta.id;
      }
      if (key.indexOf("measures_") === 0 && metadata.mainStructureMembers) {
        var measMeta = metadata.mainStructureMembers[key];
        if (measMeta && measMeta.label) return measMeta.label;
        if (measMeta && measMeta.id) return measMeta.id;
      }
    }
    return key;
  }

  function _formatNumber(value) {
    if (value === null || value === undefined || isNaN(value)) {
      return value !== undefined && value !== null ? String(value) : "";
    }

    var parts = String(value).split(".");
    var intPart = parts[0];
    var decPart = parts[1] || "";

    if (decPart.length > 0) {
      while (decPart.length > 2 && decPart.charAt(decPart.length - 1) === "0") {
        decPart = decPart.substring(0, decPart.length - 1);
      }
      return intPart + "." + decPart;
    }
    return intPart;
  }

  function _applyDateFormat(value) {
    if (!value || typeof value !== "string") return value;

    // Try ISO (YYYY-MM-DD)
    var isoMatch = value.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
    if (isoMatch) {
      return isoMatch[1] + "-" +
        (isoMatch[2].length === 1 ? "0" + isoMatch[2] : isoMatch[2]) + "-" +
        (isoMatch[3].length === 1 ? "0" + isoMatch[3] : isoMatch[3]);
    }

    // Try timestamp
    var tsMatch = value.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})[\sT](\d{1,2}):(\d{2})/);
    if (tsMatch) {
      return tsMatch[1] + "-" +
        (tsMatch[2].length === 1 ? "0" + tsMatch[2] : tsMatch[2]) + "-" +
        (tsMatch[3].length === 1 ? "0" + tsMatch[3] : tsMatch[3]) + " " +
        (tsMatch[4].length === 1 ? "0" + tsMatch[4] : tsMatch[4]) + ":" + tsMatch[5];
    }

    return value;
  }

  function _escapeCSVField(value, delimiter) {
    var str = String(value);
    if (str.indexOf(delimiter) !== -1 || str.indexOf('"') !== -1 ||
        str.indexOf("\n") !== -1 || str.indexOf("\r") !== -1) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  // ── Register ──────────────────────────────────────────────────────
  console.log("[DataExporter v5] Registering custom element...");
  customElements.define("com-sac-dataexporter", DataExporter);
  console.log("[DataExporter v5] Custom element registered successfully.");
})();
