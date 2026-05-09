# SAC Data Exporter — Custom Widget

A **SAP Analytics Cloud (SAC) custom widget** that exports linked table data to a **CSV file** with fully customizable formatting options.

## Files

| File | Description |
|---|---|
| `dataexporter.json` | Custom widget JSON definition (metadata, properties, data binding, methods, events) |
| `dataexporter_main.js` | Main Web Component — renders the download button & handles CSV generation/download |
| `dataexporter_styling.js` | Styling Panel Web Component — provides the configuration UI in SAC designer |

> **Note:** A custom Builder Panel is **not needed** — SAC auto-generates the data binding UI when you define a `dataBindings` object in the JSON file.

---

## Features

- **🔗 Data Binding** — Link any SAC table/chart to the widget via drag-and-drop dimension/measure feeds
- **📥 One-Click Export** — Clean download button triggers CSV generation and saves the file locally
- **🎨 Customizable CSV Format** — Full control over delimiters, date formatting, and number formatting
- **📝 Configurable** — All options adjustable via the SAC Styling Panel (no coding needed)
- **📜 Script API** — Trigger exports programmatically with `DataExporter_1.exportCSV()`
- **📡 Events** — `onExportComplete` and `onExportError` events for script integration

### Customizable Options

| Option | Choices | Default |
|---|---|---|
| **Delimiter** | Comma, Semicolon, Tab, Pipe, Custom | Comma |
| **Date Format** | YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, DD.MM.YYYY, YYYY/MM/DD, etc. | YYYY-MM-DD |
| **Decimal Separator** | Dot (.) or Comma (,) | Dot (.) |
| **Thousands Separator** | None, Comma, Dot, Space, Apostrophe | None |
| **Include Headers** | Yes / No | Yes |
| **Use Raw Values** | Yes / No | No |
| **File Name** | Custom name (saved as `name.csv`) | `data_export` |
| **Button Label** | Custom text | `Download CSV` |
| **Button Color** | Any CSS color | `#0070F2` |

---

## How It Works

### Data Flow

```
SAC Table / Chart
       │
       ▼
  [Data Binding Feed]  ◄── dimensions + measures drag-dropped by user
       │
       ▼
  Data Exporter Widget
       │
       ├── Reads this.dataBinding.data (result set rows)
       ├── Reads this.dataBinding.metadata (column info)
       │
       ├── Applies CSV formatting (delimiter, date format, number separators)
       ├── Applies field quoting (RFC 4180 compliant)
       │
       ▼
  Browser Download  (.csv file)
```

### CSV Generation Logic

1. **Headers**: Column labels are resolved from metadata (friendly names like "Product", "Discount") or fall back to internal keys
2. **Dimensions**: Uses the `label` property from SAC's dimension values
3. **Measures**: Uses SAC's `formatted` value by default, or `raw` value with custom decimal/thousands separators when `useRawValues` is enabled
4. **Date formatting**: Detects common date patterns (ISO, DMY, MDY) and reformats to the chosen format
5. **Field escaping**: Fields containing the delimiter, double quotes, or newlines are properly quoted per RFC 4180

---

## Deployment

### Step 1: Host the JavaScript Files

Upload the three widget files to a publicly accessible web server (HTTPS required by SAC):

```
https://your-server.com/customwidgets/dataexporter/
├── dataexporter.json
├── dataexporter_main.js
└── dataexporter_styling.js
```

### Step 2: Update URLs in the JSON

Edit `dataexporter.json` and replace the placeholder URLs:

```json
"url": "https://www.example.com/customwidgets/dataexporter/dataexporter_main.js",
"url": "https://www.example.com/customwidgets/dataexporter/dataexporter_styling.js",
```

→ Change to your actual server URLs.

### Step 3: Upload to SAC

1. In SAC, go to the **Analytic Applications** or **Stories** start page
2. Select the **Custom Widgets** tab
3. Click **+ (Create)**
4. Choose **Browse…** under JSON File and select `dataexporter.json`
5. Click **Create**

> **Prerequisites:** You must have the **Create** permission for **Custom Widget** in your SAC role.

### Step 4: Use in a Story

1. Open or create an **Optimized Story** or **Analytic Application**
2. In the widget toolbar, find **Custom Widgets** → **Data Exporter**
3. Drag it onto the canvas
4. With the widget selected, open the **Builder** tab in the right panel
5. Click **Add Data** and select dimensions/measures from your model or from another table's data selection
6. Switch to the **Styling** tab to customize CSV format options
7. In **View** mode, click the **Download CSV** button

---

## Script API

### Methods

```javascript
// Trigger CSV export programmatically
DataExporter_1.exportCSV();
```

### Events

```javascript
// React to export completion
DataExporter_1.onExportComplete = function() {
  console.log("CSV was exported successfully!");
};

// Handle export errors  
DataExporter_1.onExportError = function() {
  console.log("CSV export failed.");
};
```

---

## Versioning

The widget follows semantic versioning (`major.minor.patch`, currently `1.0.0`).

- Uploading a new **minor** or **patch** version replaces the existing widget
- Uploading a new **major** version adds it **side-by-side** (both remain available)

---

## Technical Notes

- **Export via Blob URL**: The CSV is generated in-memory as a Blob, then downloaded via a temporary anchor element click
- **File System Access API**: On supported browsers (Chromium-based), the modern `showSaveFilePicker()` API is tried first, with Blob fallback
- **UTF-8 BOM**: Optionally includes a BOM for better Excel compatibility
- **No server-side processing**: All CSV generation happens client-side in the browser
- **Mobile support**: Set `"supportsMobile": true` in the JSON if you want the widget on mobile devices (note: download behavior depends on the mobile browser)

---

## Customization Examples

### European CSV Format
```
Delimiter: Semicolon
Decimal Separator: Comma
Thousands Separator: Dot
Date Format: DD.MM.YYYY
```

### US Financial Format
```
Delimiter: Comma
Decimal Separator: Dot
Thousands Separator: Comma
Date Format: MM/DD/YYYY
```

### Tab-Separated for Excel Paste
```
Delimiter: Tab
Date Format: YYYY-MM-DD
```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| **"No data is linked"** | Make sure you've added dimensions/measures to the widget's data binding in the Builder panel |
| **No download occurs** | Check browser pop-up blocker; the download uses a temporary link click |
| **CSV opens garbled in Excel** | Try enabling `useRawValues` or switch to Semicolon delimiter + UTF-8 BOM |
| **Styling Panel changes don't persist** | Click outside the input field or press Enter to submit changes (triggers `propertiesChanged`) |
| **Wrong column names in CSV** | Column labels come from SAC model metadata; verify your model's dimension/measure names |

---

Built for **SAP Analytics Cloud** using the [Custom Widget Developer Guide](https://help.sap.com/doc/c813a28922b54e50bd2a307b099787dc/release/en-US/CustomWidgetDevGuide_en.pdf).
