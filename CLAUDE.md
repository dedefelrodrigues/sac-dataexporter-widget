# CLAUDE.md

## Project: SAC Data Exporter Custom Widget

A SAP Analytics Cloud custom widget that exports linked table/chart data to a CSV file with customizable formatting (delimiter, date format, number separators).

### File Structure

```
sac-dataexporter-widget/
├── dataexporter.json          # Widget definition (metadata, properties, dataBindings, methods, events)
├── dataexporter_main.js       # Main Web Component — button UI, CSV generation, file download
├── dataexporter_styling.js    # Styling Panel Web Component — config form for CSV options
├── dataexporter_test.json     # Minimal test JSON (no dataBindings, no styling panel)
├── dataexporter_main_minimal.js  # Ultra-minimal blue-box widget (pipeline verification)
├── dataexporter_main_v2.js    # Incremental test: full template, plain string, basic class
├── dataexporter_main_v3.js    # Incremental test: backtick template, basic class
├── dataexporter_main_v4.js    # Incremental test: + click handler + dataBinding access
├── dataexporter_main_v5.js    # Incremental test: + CSV generation (module-scoped, ES5)
└── README.md                  # Deployment guide and documentation
```

### Deployment

The JS files are hosted via **jsDelivr CDN** from this GitHub repo:

| File | CDN URL |
|---|---|
| `dataexporter_main.js` | `https://cdn.jsdelivr.net/gh/dedefelrodrigues/sac-dataexporter-widget@main/dataexporter_main.js` |
| `dataexporter_styling.js` | `https://cdn.jsdelivr.net/gh/dedefelrodrigues/sac-dataexporter-widget@main/dataexporter_styling.js` |

To use: upload `dataexporter.json` to SAC via **Custom Widgets → Create**.

---

## Critical Finding: SAC Requires ES5 JavaScript

### The Problem

After uploading the widget to SAC, it fails with:

```
Something went wrong. The system couldn't load the custom widget
com.sac.dataexporter_1.x (kind: main) for this reason:
'The system took too long to define the custom widget'.

Failed to retrieve constructor for custom widget
'com.sac.dataexporter_1.x' (kind: main)
```

This means **`customElements.define()` was never called**, because the JavaScript threw an error before reaching that line. SAC waits for `customElements.define()` and times out if it never happens.

### Root Cause

**SAC's embedded Chromium browser silently rejects ES6+ JavaScript syntax.** Any of the following in the Web Component JS file will cause the entire script to fail before `customElements.define()` is reached:

| Feature | ❌ Fails in SAC | ✅ Safe replacement (ES5) |
|---|---|---|
| Class syntax | `class X extends HTMLElement {}` | Prototypal inheritance: `function X() { HTMLElement.call(this); }; X.prototype = Object.create(HTMLElement.prototype);` |
| Block-scoped vars | `const x = ...` / `let x = ...` | `var x = ...` |
| Arrow functions | `(x) => { ... }` / `x => x` | `function(x) { ... }` |
| String.includes() | `str.includes(sub)` | `str.indexOf(sub) !== -1` |
| String.endsWith() | `str.endsWith(sub)` | `str.charAt(str.length - 1) === sub` |
| String.startsWith() | `str.startsWith(sub)` | `str.indexOf(sub) === 0` |
| Object spread | `{...a, ...b}` | Manual loop: `for (key in b) { result[key] = b[key]; }` |
| async/await | `async function() { await ... }` | Promise chains: `.then(...).catch(...)` |
| Template literals with `${}` | `` `Hello ${name}` `` | String concat: `'Hello ' + name` |

### Discovery Process (Incremental Testing Methodology)

Since SAC provides **no error messages** (only a timeout), debugging required binary-search-style incremental testing. Each version isolated one variable:

1. **v_minimal**: Blue box with plain string template, basic class → ✅ **WORKS**
   - Proves: Pipeline (CDN → SAC) is functioning

2. **v2**: Full button/SVG/CSS template, plain string, basic class → ✅ **WORKS**
   - Proves: Template HTML/CSS is not the issue

3. **v3**: Full button/SVG/CSS template, **backtick template literal**, basic class → ✅ **WORKS**
   - Proves: Template literals without `${}` interpolation are safe

4. **v4**: + click handler, event listener, `this.dataBinding` access → ✅ **WORKS**
   - Proves: Event handling and data binding references are safe

5. **v5**: + full CSV generation (`_generateCSV` + helpers), **module-scoped functions, ES5 style** → ✅ **WORKS**
   - Proves: CSV logic is correct when written in ES5

6. **Final**: Full widget, **ES5 prototypal inheritance, var, function()** → ✅ **WORKS**
   - All features functional: CSV download, date/number formatting, styling panel, data bindings

The key differentiator was ES5 vs ES6+ syntax. The v5 test used module-scoped `function`s with `var`, which worked; the original used `class` methods with `const`/`let`/arrow functions, which failed.

### SAC Custom Widget ES5 Template

```javascript
(function () {
  // Template: use regular strings, not backtick literals
  var template = document.createElement("template");
  template.innerHTML = '<div>...</div>';

  // Class: use prototypal inheritance, not ES6 class syntax
  var MyWidget = (function (_super) {
    function MyWidget() {
      _super.call(this);
      this._shadowRoot = this.attachShadow({ mode: "open" });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
      this._props = {};
    }

    MyWidget.prototype = Object.create(_super.prototype);
    MyWidget.prototype.constructor = MyWidget;

    // Lifecycle methods
    MyWidget.prototype.onCustomWidgetBeforeUpdate = function (changedProps) {
      // Use manual merge instead of spread
      var key;
      for (key in changedProps) {
        this._props[key] = changedProps[key];
      }
    };

    MyWidget.prototype.onCustomWidgetAfterUpdate = function (changedProps) {
      // Handle property updates
    };

    // Script API methods (no 'body' in JSON → native JS)
    MyWidget.prototype.myMethod = function () {
      // ...
    };

    return MyWidget;
  })(HTMLElement);

  customElements.define("com-example-mywidget", MyWidget);
})();
```

### Getters/Setters (Styling Panel)

Use `Object.defineProperty` instead of `get`/`set` syntax:

```javascript
Object.defineProperty(MyPanel.prototype, "myProp", {
  get: function () { return this._shadowRoot.getElementById("my_input").value; },
  set: function (v) { this._shadowRoot.getElementById("my_input").value = v || ""; }
});
```

### Validated ES5 Replacements Quick Reference

| ES6+ (broken) | ES5 (working) |
|---|---|
| `const x = 1` | `var x = 1` |
| `let y = 2` | `var y = 2` |
| `[1,2].forEach(x => f(x))` | `[1,2].forEach(function(x) { f(x); })` |
| `arr.map(x => x.name)` | `arr.map(function(x) { return x.name; })` |
| `str.includes(",")` | `str.indexOf(",") !== -1` |
| `str.startsWith("m_")` | `str.indexOf("m_") === 0` |
| `str.endsWith("0")` | `str.charAt(str.length - 1) === "0"` |
| `{...a, ...b}` | Manual `for (k in b) a[k]=b[k]` |
| `` `text ${v}` `` | `"text " + v` |
| `class X extends Y {}` | `function X() { Y.call(this); }; X.prototype = Object.create(Y.prototype)` |

### Debugging Tips

1. **Always test with a minimal widget first** — a colored box that just registers the element
2. **Use `console.log()`** at script start and before `customElements.define()` to verify execution reaches those points
3. **Open browser DevTools (F12)** in the SAC web app (Chrome/Edge) — the Console tab will show any log messages
4. **SAC errors are unhelpful** — "took too long to define" means the script threw an error before `define()`; "Failed to retrieve constructor" means the same thing
5. **jsDelivr caches for 12 hours** — after pushing fixes, purge at [jsdelivr.com/tools/purge](https://www.jsdelivr.com/tools/purge) to test immediately
6. **Delete and re-upload** the widget JSON in SAC after every JS file change (uploading with same version replaces the old one)

### Widget Features (Final Working Version)

- **Data binding feed** — dimensions + measures drag-dropped from tables/charts
- **CSV delimiter** — comma, semicolon, tab, pipe, custom character
- **Date formatting** — 7 patterns (ISO, DMY, MDY, etc.) with auto-detection
- **Number formatting** — custom decimal & thousands separators
- **Raw/formatted toggle** — use SAC-formatted values or reformat raw numbers
- **RFC 4180 compliant** — proper field quoting for delimiters/quotes/newlines
- **UTF-8 BOM** — Excel-compatible encoding
- **Script API** — `DataExporter_1.exportCSV()` triggers export programmatically
- **Events** — `onExportComplete`, `onExportError`
- **Styling Panel** — in-SAC UI to configure file name, delimiter, date format, number format, button appearance
- **Auto-generated Builder Panel** — SAC provides data binding UI from `dataBindings` JSON definition
- **Dual download API** — tries File System Access API first, falls back to Blob/anchor click

### Script Examples

```javascript
// Trigger export from SAC script
DataExporter_1.exportCSV();

// React to completion
DataExporter_1.onExportComplete = function() {
  Application.showMessage("Export complete!");
};
```

### European CSV Configuration Example

In the Styling Panel:
- Delimiter: **Semicolon**
- Date Format: **DD.MM.YYYY**
- Decimal Separator: **Comma**
- Thousands Separator: **Dot**
