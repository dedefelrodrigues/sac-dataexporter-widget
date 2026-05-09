(function () {
  // ── Template (Shadow DOM) ────────────────────────────────────────────
  let template = document.createElement("template");
  template.innerHTML = `
    <style>
      :host {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
          "Helvetica Neue", Arial, sans-serif;
      }

      .exporter-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        height: 100%;
        padding: 12px;
        box-sizing: border-box;
      }

      .export-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 24px;
        border: none;
        border-radius: 8px;
        background-color: #0070F2;
        color: #fff;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s ease, transform 0.1s ease,
          box-shadow 0.2s ease;
        white-space: nowrap;
        min-width: 120px;
        box-shadow: 0 2px 6px rgba(0, 112, 242, 0.25);
      }

      .export-btn:hover {
        background-color: #0058c4;
        box-shadow: 0 4px 12px rgba(0, 112, 242, 0.35);
      }

      .export-btn:active {
        transform: scale(0.97);
      }

      .export-btn:disabled {
        background-color: #a0c4f1;
        cursor: not-allowed;
        box-shadow: none;
      }

      .export-btn svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }

      .status-line {
        font-size: 11px;
        color: #666;
        text-align: center;
        display: none;
      }

      .status-line.visible {
        display: block;
      }

      .status-line.error {
        color: #d9363e;
      }

      .status-line.success {
        color: #1a7d36;
      }
    </style>

    <div class="exporter-container">
      <button class="export-btn" id="exportBtn">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
        </svg>
        <span id="btnLabel">Download CSV</span>
      </button>
      <div class="status-line" id="statusLine"></div>
    </div>
  `;

  // ── Custom Element Class ─────────────────────────────────────────────
  class DataExporter extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: "open" });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
      this._props = {};

      this._shadowRoot
        .getElementById("exportBtn")
        .addEventListener("click", this._handleExport.bind(this));
    }

    // ── Lifecycle: before update ───────────────────────────────────────
    onCustomWidgetBeforeUpdate(changedProperties) {
      this._props = { ...this._props, ...changedProperties };
    }

    // ── Lifecycle: after update ────────────────────────────────────────
    onCustomWidgetAfterUpdate(changedProperties) {
      // Update button label
      if ("buttonLabel" in changedProperties) {
        this._shadowRoot.getElementById("btnLabel").textContent =
          changedProperties.buttonLabel || "Download CSV";
      }

      // Update button color
      if ("buttonColor" in changedProperties) {
        this._shadowRoot.getElementById("exportBtn").style.backgroundColor =
          changedProperties.buttonColor;
      }

      }
    }

    // ── CSV export handler ─────────────────────────────────────────────
    _handleExport() {
      const btn = this._shadowRoot.getElementById("exportBtn");
      const statusLine = this._shadowRoot.getElementById("statusLine");

      try {
        // Validate data binding
        if (!this.dataBinding || !this.dataBinding.data) {
          this._showStatus(
            "No data is linked. Please link a table to this widget first.",
            "error"
          );
          this._dispatchEvent("onExportError");
          return;
        }

        const data = this.dataBinding.data;
        const metadata = this.dataBinding.metadata;

        if (!data || data.length === 0) {
          this._showStatus("No data rows to export.", "error");
          this._dispatchEvent("onExportError");
          return;
        }

        btn.disabled = true;
        this._showStatus("Generating CSV…", "");

        // Generate CSV
        const csvContent = this._generateCSV(data, metadata);

        // Trigger download
        this._downloadFile(csvContent);

        const rowCount = data.length;
        this._showStatus(
          "Exported " + rowCount + " row" + (rowCount !== 1 ? "s" : "") + ".",
          "success"
        );
        this._dispatchEvent("onExportComplete");
      } catch (err) {
        console.error("Data Exporter error:", err);
        this._showStatus("Export failed: " + err.message, "error");
        this._dispatchEvent("onExportError");
      } finally {
        btn.disabled = false;
      }
    }

    // ── CSV generation ─────────────────────────────────────────────────
    _generateCSV(data, metadata) {
      const p = this._props;

      // ── Resolve delimiter ────────────────────────────────────────────
      const delimiterMap = {
        comma: ",",
        semicolon: ";",
        tab: "\t",
        pipe: "|",
        custom: p.customDelimiter || "|",
      };
      const delimiter = delimiterMap[p.delimiter] || ",";

      // ── Build ordered column list from metadata ──────────────────────
      const columns = [];
      if (metadata && metadata.feeds) {
        // Dimensions first, then measures (matching typical table layout)
        const dimFeed = metadata.feeds.dimensions;
        const measFeed = metadata.feeds.measures;

        if (dimFeed && dimFeed.values) {
          dimFeed.values.forEach((key) => columns.push({ key, type: "dimension" }));
        }
        if (measFeed && measFeed.values) {
          measFeed.values.forEach((key) => columns.push({ key, type: "measure" }));
        }
      }

      // Fallback: derive columns from first data row
      if (columns.length === 0 && data.length > 0) {
        const firstRow = data[0];
        Object.keys(firstRow).forEach((key) => {
          const isMeasure = key.startsWith("measures_");
          columns.push({ key, type: isMeasure ? "measure" : "dimension" });
        });
      }

      // ── Build CSV lines ──────────────────────────────────────────────
      const lines = [];

      // Header row (optional)
      if (p.includeHeaders !== false) {
        const headers = columns.map((col) => this._getColumnLabel(col.key, metadata));
        lines.push(headers.map((h) => this._escapeCSVField(h, delimiter)).join(delimiter));
      }

      // Data rows
      data.forEach((row) => {
        const fields = columns.map((col) => {
          const raw = row[col.key];
          let value = "";

          if (col.type === "dimension") {
            // Use the dimension label
            value = raw && raw.label ? raw.label : raw ? String(raw) : "";
          } else {
            // Measure: use raw or formatted value based on settings
            if (p.useRawValues === true && raw && raw.raw !== undefined) {
              value = this._formatNumber(raw.raw);
            } else if (raw && raw.formatted !== undefined) {
              // Apply custom number formatting to the formatted value
              if (p.useRawValues !== true && raw.raw !== undefined && !isNaN(raw.raw)) {
                // Re-format the raw number with custom decimal/thousands separators
                value = this._formatNumber(raw.raw);
              } else {
                value = raw.formatted;
              }
            } else if (raw && raw.raw !== undefined) {
              value = this._formatNumber(raw.raw);
            } else {
              value = raw ? String(raw) : "";
            }
          }

          // Apply date formatting if the value looks like a date
          value = this._applyDateFormat(value);

          return this._escapeCSVField(value, delimiter);
        });

        lines.push(fields.join(delimiter));
      });
      // ── Return CSV with UTF-8 BOM for Excel compatibility ──────────
      return "\uFEFF" + lines.join("\r\n");
      return csv;
    }

    // ── Helpers ────────────────────────────────────────────────────────
    _getColumnLabel(key, metadata) {
      // Try to resolve a friendly label from metadata
      if (metadata) {
        if (key.startsWith("dimensions_") && metadata.dimensions) {
          const dimMeta = metadata.dimensions[key];
          if (dimMeta && dimMeta.description) return dimMeta.description;
          if (dimMeta && dimMeta.id) return dimMeta.id;
        }
        if (key.startsWith("measures_") && metadata.mainStructureMembers) {
          const measMeta = metadata.mainStructureMembers[key];
          if (measMeta && measMeta.label) return measMeta.label;
          if (measMeta && measMeta.id) return measMeta.id;
        }
      }
      return key;
    }

    _formatNumber(value) {
      if (value === null || value === undefined || isNaN(value)) {
        return value !== undefined && value !== null ? String(value) : "";
      }

      const p = this._props;
      const decimalSep = p.decimalSeparator || ".";
      const thousandsSep = p.thousandsSeparator || "";

      // Split integer and decimal parts
      const parts = String(value).split(".");
      let intPart = parts[0];
      let decPart = parts[1] || "";

      // Apply thousands separator
      if (thousandsSep) {
        // Handle negative numbers
        const isNegative = intPart.startsWith("-");
        const absInt = isNegative ? intPart.slice(1) : intPart;

        // Add thousands separators
        const withSeparators = absInt.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);
        intPart = isNegative ? "-" + withSeparators : withSeparators;
      }

      // Combine with decimal separator
      if (decPart.length > 0) {
        // Trim trailing zeros from decimal part for cleaner output
        // but keep at least 2 decimal places by default
        while (decPart.length > 2 && decPart.endsWith("0")) {
          decPart = decPart.slice(0, -1);
        }
        return intPart + decimalSep + decPart;
      }

      return intPart;
    }

    _applyDateFormat(value) {
      if (!value || typeof value !== "string") return value;

      const dateFormat = this._props.dateFormat || "YYYY-MM-DD";

      let year, month, day;

      // Try ISO (YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD)
      const isoMatch = value.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
      if (isoMatch) {
        year = isoMatch[1];
        month = isoMatch[2].padStart(2, "0");
        day = isoMatch[3].padStart(2, "0");
        return this._formatDate(year, month, day, dateFormat);
      }

      // Try DD/MM/YYYY or DD.MM.YYYY or MM/DD/YYYY
      const dmyMatch = value.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/);
      if (dmyMatch) {
        // Heuristic: if first number > 12, it must be DD/MM/YYYY
        const a = parseInt(dmyMatch[1], 10);
        const b = parseInt(dmyMatch[2], 10);
        if (a > 12) {
          day = dmyMatch[1].padStart(2, "0");
          month = dmyMatch[2].padStart(2, "0");
        } else if (b > 12) {
          month = dmyMatch[1].padStart(2, "0");
          day = dmyMatch[2].padStart(2, "0");
        } else {
          // Ambiguous; assume DD/MM/YYYY (common in SAC)
          day = dmyMatch[1].padStart(2, "0");
          month = dmyMatch[2].padStart(2, "0");
        }
        year = dmyMatch[3];
        return this._formatDate(year, month, day, dateFormat);
      }

      // If it looks like a timestamp with time component
      const tsMatch = value.match(
        /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})[\sT](\d{1,2}):(\d{2})/
      );
      if (tsMatch) {
        year = tsMatch[1];
        month = tsMatch[2].padStart(2, "0");
        day = tsMatch[3].padStart(2, "0");
        const hours = tsMatch[4].padStart(2, "0");
        const minutes = tsMatch[5].padStart(2, "0");
        return this._formatDate(year, month, day, dateFormat) + " " + hours + ":" + minutes;
      }

      return value;
    }

    _formatDate(year, month, day, format) {
      switch (format) {
        case "DD/MM/YYYY":
          return day + "/" + month + "/" + year;
        case "MM/DD/YYYY":
          return month + "/" + day + "/" + year;
        case "DD.MM.YYYY":
          return day + "." + month + "." + year;
        case "YYYY/MM/DD":
          return year + "/" + month + "/" + day;
        case "MM-DD-YYYY":
          return month + "-" + day + "-" + year;
        case "DD-MM-YYYY":
          return day + "-" + month + "-" + year;
        case "YYYY-MM-DD":
        default:
          return year + "-" + month + "-" + day;
      }
    }

    _escapeCSVField(value, delimiter) {
      const str = String(value);
      // RFC 4180: fields containing comma, double-quote, or newline must be quoted
      if (
        str.includes(delimiter) ||
        str.includes('"') ||
        str.includes("\n") ||
        str.includes("\r")
      ) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }

    // ── Script API: programmatic export ────────────────────────────────
    exportCSV() {
      this._handleExport();
    }

    // ── File download ──────────────────────────────────────────────────
    _downloadFile(csv) {
      const fileName = (this._props.fileName || "data_export") + ".csv";

      // Try the modern File System Access API first
      if (window.showSaveFilePicker) {
        this._downloadViaFileSystemAPI(csv, fileName).catch(() => {
          // Fallback to blob download
          this._downloadViaBlob(csv, fileName);
        });
      } else {
        this._downloadViaBlob(csv, fileName);
      }
    }

    _downloadViaBlob(csv, fileName) {
      const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Defer revoke to ensure download starts
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async _downloadViaFileSystemAPI(csv, fileName) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: "CSV File",
              accept: { "text/csv": [".csv"] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(csv);
        await writable.close();
      } catch (err) {
        // User cancelled or API not available
        if (err.name !== "AbortError") {
          throw err;
        }
      }
    }

    // ── Status display ─────────────────────────────────────────────────
    _showStatus(message, type) {
      const statusLine = this._shadowRoot.getElementById("statusLine");
      statusLine.textContent = message;
      statusLine.className = "status-line visible";
      if (type) {
        statusLine.classList.add(type);
      }
      // Auto-hide success messages after 5 seconds
      if (type === "success") {
        setTimeout(() => {
          statusLine.classList.remove("visible", "success");
        }, 5000);
      }
    }

    // ── Dispatch custom event ──────────────────────────────────────────
    _dispatchEvent(eventName) {
      this.dispatchEvent(new Event(eventName));
    }
  }

  // ── Register custom element ──────────────────────────────────────────
  customElements.define("com-sac-dataexporter", DataExporter);
})();
