(function () {
  console.log("[DataExporter] Script starting...");

  // ── Template (Shadow DOM) ──────────────────────────────────────────
  var template = document.createElement("template");
  template.innerHTML = '<style>:host{display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}.exporter-container{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;width:100%;height:100%;padding:12px;box-sizing:border-box}.export-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 24px;border:none;border-radius:8px;background-color:#0070F2;color:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:background-color .2s ease,transform .1s ease,box-shadow .2s ease;white-space:nowrap;min-width:120px;box-shadow:0 2px 6px rgba(0,112,242,.25)}.export-btn:hover{background-color:#0058c4;box-shadow:0 4px 12px rgba(0,112,242,.35)}.export-btn:active{transform:scale(.97)}.export-btn:disabled{background-color:#a0c4f1;cursor:not-allowed;box-shadow:none}.export-btn svg{width:18px;height:18px;fill:currentColor}.status-line{font-size:11px;color:#666;text-align:center;display:none}.status-line.visible{display:block}.status-line.error{color:#d9363e}.status-line.success{color:#1a7d36}</style><div class="exporter-container"><button class="export-btn" id="exportBtn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg><span id="btnLabel">Download CSV</span></button><div class="status-line" id="statusLine"></div></div>';

  // ── Custom Element Class ───────────────────────────────────────────
  var DataExporter = (function (_super) {
    // Simple class-like inheritance (avoids class syntax issues)
    function DataExporter() {
      _super.call(this);
      this._shadowRoot = this.attachShadow({ mode: "open" });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
      this._props = {};

      this._shadowRoot
        .getElementById("exportBtn")
        .addEventListener("click", this._handleExport.bind(this));
    }

    DataExporter.prototype = Object.create(_super.prototype);
    DataExporter.prototype.constructor = DataExporter;

    // ── Lifecycle ──────────────────────────────────────────────────
    DataExporter.prototype.onCustomWidgetBeforeUpdate = function (changedProperties) {
      this._props = mergeObjects(this._props, changedProperties);
    };

    DataExporter.prototype.onCustomWidgetAfterUpdate = function (changedProperties) {
      if ("buttonLabel" in changedProperties) {
        this._shadowRoot.getElementById("btnLabel").textContent =
          changedProperties.buttonLabel || "Download CSV";
      }
      if ("buttonColor" in changedProperties) {
        this._shadowRoot.getElementById("exportBtn").style.backgroundColor =
          changedProperties.buttonColor;
      }
    };

    // ── Script API ─────────────────────────────────────────────────
    DataExporter.prototype.exportCSV = function () {
      this._handleExport();
    };

    // ── Export ─────────────────────────────────────────────────────
    DataExporter.prototype._handleExport = function () {
      var self = this;
      var btn = this._shadowRoot.getElementById("exportBtn");

      try {
        if (!this.dataBinding || !this.dataBinding.data) {
          showStatus(this, "No data is linked. Please link a table to this widget first.", "error");
          dispatchWidgetEvent(this, "onExportError");
          return;
        }

        var data = this.dataBinding.data;
        var metadata = this.dataBinding.metadata;

        if (!data || data.length === 0) {
          showStatus(this, "No data rows to export.", "error");
          dispatchWidgetEvent(this, "onExportError");
          return;
        }

        btn.disabled = true;
        showStatus(this, "Generating CSV…", "");

        // Generate CSV
        var csvContent = generateCSV(this, data, metadata);

        // Trigger download
        downloadFile(this, csvContent);

        var rowCount = data.length;
        showStatus(this, "Exported " + rowCount + " row" + (rowCount !== 1 ? "s" : "") + ".", "success");
        dispatchWidgetEvent(this, "onExportComplete");
      } catch (err) {
        console.error("[DataExporter] Error:", err);
        showStatus(this, "Export failed: " + err.message, "error");
        dispatchWidgetEvent(this, "onExportError");
      } finally {
        btn.disabled = false;
      }
    };

    return DataExporter;
  })(HTMLElement);

  // ── Helper: merge objects (replaces object spread) ─────────────────
  function mergeObjects(base, updates) {
    var result = {};
    var key;
    for (key in base) { result[key] = base[key]; }
    for (key in updates) { result[key] = updates[key]; }
    return result;
  }

  // ── Helper: show status message ────────────────────────────────────
  function showStatus(widget, message, type) {
    var line = widget._shadowRoot.getElementById("statusLine");
    line.textContent = message;
    line.className = "status-line visible";
    if (type) { line.classList.add(type); }
    if (type === "success") {
      setTimeout(function () {
        line.classList.remove("visible", "success");
      }, 5000);
    }
  }

  // ── Helper: dispatch widget event ──────────────────────────────────
  function dispatchWidgetEvent(widget, eventName) {
    widget.dispatchEvent(new Event(eventName));
  }

  // ── CSV generation ────────────────────────────────────────────────
  function generateCSV(widget, data, metadata) {
    var p = widget._props;

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
      var headers = [];
      for (var i = 0; i < columns.length; i++) {
        headers.push(getColumnLabel(columns[i].key, metadata));
      }
      var escapedHeaders = [];
      for (var j = 0; j < headers.length; j++) {
        escapedHeaders.push(escapeCSVField(headers[j], delimiter));
      }
      lines.push(escapedHeaders.join(delimiter));
    }

    // Data rows
    for (var r = 0; r < data.length; r++) {
      var row = data[r];
      var fields = [];

      for (var c = 0; c < columns.length; c++) {
        var col = columns[c];
        var raw = row[col.key];
        var value = "";

        if (col.type === "dimension") {
          value = raw && raw.label ? raw.label : raw ? String(raw) : "";
        } else {
          if (p.useRawValues === true && raw && raw.raw !== undefined) {
            value = formatNumber(raw.raw);
          } else if (raw && raw.raw !== undefined && !isNaN(raw.raw)) {
            value = formatNumber(raw.raw);
          } else if (raw && raw.formatted !== undefined) {
            value = raw.formatted;
          } else {
            value = raw ? String(raw) : "";
          }
        }

        value = applyDateFormat(value);
        fields.push(escapeCSVField(value, delimiter));
      }

      lines.push(fields.join(delimiter));
    }

    return "\uFEFF" + lines.join("\r\n");
  }

  // ── Helper: get friendly column label ──────────────────────────────
  function getColumnLabel(key, metadata) {
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

  // ── Helper: format number ──────────────────────────────────────────
  function formatNumber(value) {
    if (value === null || value === undefined || isNaN(value)) {
      return value !== undefined && value !== null ? String(value) : "";
    }

    var parts = String(value).split(".");
    var intPart = parts[0];
    var decPart = parts[1] || "";

    if (decPart.length > 0) {
      // Trim trailing zeros but keep at least 2 decimal places
      while (decPart.length > 2 && decPart.charAt(decPart.length - 1) === "0") {
        decPart = decPart.substring(0, decPart.length - 1);
      }
      return intPart + "." + decPart;
    }
    return intPart;
  }

  // ── Helper: apply date formatting ──────────────────────────────────
  function applyDateFormat(value) {
    if (!value || typeof value !== "string") return value;

    // Try ISO (YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD)
    var isoMatch = value.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
    if (isoMatch) {
      var m = isoMatch[2];
      var d = isoMatch[3];
      if (m.length === 1) m = "0" + m;
      if (d.length === 1) d = "0" + d;
      return isoMatch[1] + "-" + m + "-" + d;
    }

    // Try timestamp with time
    var tsMatch = value.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})[\sT](\d{1,2}):(\d{2})/);
    if (tsMatch) {
      var tm = tsMatch[2], td = tsMatch[3], th = tsMatch[4], tmin = tsMatch[5];
      if (tm.length === 1) tm = "0" + tm;
      if (td.length === 1) td = "0" + td;
      if (th.length === 1) th = "0" + th;
      return tsMatch[1] + "-" + tm + "-" + td + " " + th + ":" + tmin;
    }

    return value;
  }

  // ── Helper: escape CSV field (RFC 4180) ────────────────────────────
  function escapeCSVField(value, delimiter) {
    var str = String(value);
    if (str.indexOf(delimiter) !== -1 || str.indexOf('"') !== -1 ||
        str.indexOf("\n") !== -1 || str.indexOf("\r") !== -1) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  // ── Download ──────────────────────────────────────────────────────
  function downloadFile(widget, csv) {
    var fileName = (widget._props.fileName || "data_export") + ".csv";

    // Try File System Access API first, fall back to blob download
    if (window.showSaveFilePicker) {
      downloadViaFileSystemAPI(csv, fileName)["catch"](function () {
        downloadViaBlob(csv, fileName);
      });
    } else {
      downloadViaBlob(csv, fileName);
    }
  }

  function downloadViaBlob(csv, fileName) {
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function downloadViaFileSystemAPI(csv, fileName) {
    return window.showSaveFilePicker({
      suggestedName: fileName,
      types: [{ description: "CSV File", accept: { "text/csv": [".csv"] } }]
    }).then(function (handle) {
      return handle.createWritable();
    }).then(function (writable) {
      return writable.write(csv).then(function () {
        return writable.close();
      });
    })["catch"](function (err) {
      if (err.name !== "AbortError") {
        throw err;
      }
    });
  }

  // ── Register custom element ────────────────────────────────────────
  console.log("[DataExporter] Registering custom element...");
  customElements.define("com-sac-dataexporter", DataExporter);
  console.log("[DataExporter] Custom element registered successfully.");
})();
