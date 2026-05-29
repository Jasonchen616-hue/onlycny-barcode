(function () {
  "use strict";

  var textEl = document.getElementById("bc-text");
  var formatEl = document.getElementById("bc-format");
  var widthEl = document.getElementById("bc-width");
  var heightEl = document.getElementById("bc-height");
  var marginEl = document.getElementById("bc-margin");
  var displayValueEl = document.getElementById("bc-display-value");
  var fgEl = document.getElementById("bc-fg");
  var fgTextEl = document.getElementById("bc-fg-text");
  var bgEl = document.getElementById("bc-bg");
  var bgTextEl = document.getElementById("bc-bg-text");
  var btnGenerate = document.getElementById("btn-generate");
  var btnPng = document.getElementById("btn-png");
  var btnSvg = document.getElementById("btn-svg");
  var btnClear = document.getElementById("btn-clear");
  var hintEl = document.getElementById("hint");
  var previewEmpty = document.getElementById("preview-empty");
  var previewResult = document.getElementById("preview-result");
  var svgEl = document.getElementById("bc-svg");

  var hasBarcode = false;
  var LIB_MISSING_MSG = "条形码组件未加载，请确认 lib/JsBarcode.all.min.js 文件存在。";

  function showHint(message, kind) {
    if (!message) {
      hintEl.hidden = true;
      hintEl.textContent = "";
      hintEl.className = "hint";
      return;
    }
    hintEl.hidden = false;
    hintEl.textContent = message;
    hintEl.className = "hint hint--" + (kind || "info");
  }

  function syncColorInputs(colorInput, textInput) {
    colorInput.addEventListener("input", function () {
      textInput.value = colorInput.value;
    });
    textInput.addEventListener("input", function () {
      var v = textInput.value.trim();
      if (/^#[0-9A-Fa-f]{6}$/.test(v)) colorInput.value = v;
    });
    textInput.addEventListener("blur", function () {
      var v = textInput.value.trim();
      if (!/^#[0-9A-Fa-f]{6}$/.test(v)) textInput.value = colorInput.value;
    });
  }

  function normalizeHex(input, fallback) {
    var v = String(input || "").trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v;
    if (/^[0-9A-Fa-f]{6}$/.test(v)) return "#" + v;
    return fallback;
  }

  function setPreviewState(has) {
    hasBarcode = has;
    previewEmpty.hidden = has;
    previewResult.hidden = !has;
    btnPng.disabled = !has;
    btnSvg.disabled = !has;
  }

  function ensureLibrary() {
    if (typeof JsBarcode === "undefined") {
      showHint(LIB_MISSING_MSG, "error");
      return false;
    }
    return true;
  }

  function onlyDigits(s) {
    return /^\d+$/.test(s);
  }

  function checkDigitSum(digits, multStartThree) {
    var sum = 0;
    var i;
    for (i = 0; i < digits.length; i++) {
      sum += parseInt(digits.charAt(i), 10) * (multStartThree ? (i % 2 === 0 ? 3 : 1) : i % 2 === 0 ? 1 : 3);
    }
    return String((10 - (sum % 10)) % 10);
  }

  function validateEan13(raw) {
    if (!onlyDigits(raw)) return { ok: false, msg: "EAN13 只能输入数字。" };
    if (raw.length === 12) return { ok: true, value: raw + checkDigitSum(raw, false) };
    if (raw.length === 13) {
      var expected = checkDigitSum(raw.slice(0, 12), false);
      if (raw.charAt(12) !== expected) return { ok: false, msg: "EAN13 校验位不正确。" };
      return { ok: true, value: raw };
    }
    return { ok: false, msg: "EAN13 需要 12 或 13 位数字。" };
  }

  function validateEan8(raw) {
    if (!onlyDigits(raw)) return { ok: false, msg: "EAN8 只能输入数字。" };
    if (raw.length === 7) return { ok: true, value: raw + checkDigitSum(raw, true) };
    if (raw.length === 8) {
      var expected = checkDigitSum(raw.slice(0, 7), true);
      if (raw.charAt(7) !== expected) return { ok: false, msg: "EAN8 校验位不正确。" };
      return { ok: true, value: raw };
    }
    return { ok: false, msg: "EAN8 需要 7 或 8 位数字。" };
  }

  function validateUpc(raw) {
    if (!onlyDigits(raw)) return { ok: false, msg: "UPC 只能输入数字。" };
    if (raw.length === 11) return { ok: true, value: raw + checkDigitSum(raw, true) };
    if (raw.length === 12) {
      var expected = checkDigitSum(raw.slice(0, 11), true);
      if (raw.charAt(11) !== expected) return { ok: false, msg: "UPC 校验位不正确。" };
      return { ok: true, value: raw };
    }
    return { ok: false, msg: "UPC 需要 11 或 12 位数字。" };
  }

  function validateItf14(raw) {
    if (!onlyDigits(raw)) return { ok: false, msg: "ITF14 只能输入数字。" };
    if (raw.length === 13) return { ok: true, value: raw + checkDigitSum(raw, false) };
    if (raw.length === 14) {
      var expected = checkDigitSum(raw.slice(0, 13), false);
      if (raw.charAt(13) !== expected) return { ok: false, msg: "ITF14 校验位不正确。" };
      return { ok: true, value: raw };
    }
    return { ok: false, msg: "ITF14 需要 13 或 14 位数字。" };
  }

  function validateCode39(raw) {
    if (!raw) return { ok: false, msg: "请输入条码内容。" };
    if (!/^[0-9A-Z\s\-\.\$\/\+\%]+$/.test(raw)) {
      return { ok: false, msg: "CODE39 仅支持数字、大写字母及 - . $ / + % 空格。" };
    }
    return { ok: true, value: raw };
  }

  function validateCode128(raw) {
    if (!raw) return { ok: false, msg: "请输入条码内容。" };
    return { ok: true, value: raw };
  }

  function prepareValue(format, raw) {
    var trimmed = String(raw || "").trim();
    if (!trimmed) return { ok: false, msg: "请输入条码内容。" };
    switch (format) {
      case "EAN13":
        return validateEan13(trimmed);
      case "EAN8":
        return validateEan8(trimmed);
      case "UPC":
        return validateUpc(trimmed);
      case "ITF14":
        return validateItf14(trimmed);
      case "CODE39":
        return validateCode39(trimmed.toUpperCase());
      case "CODE128":
      default:
        return validateCode128(trimmed);
    }
  }

  function getOptions() {
    return {
      format: formatEl.value,
      width: Math.max(1, parseInt(widthEl.value, 10) || 2),
      height: Math.max(20, parseInt(heightEl.value, 10) || 80),
      margin: Math.max(0, parseInt(marginEl.value, 10) || 0),
      displayValue: !!displayValueEl.checked,
      lineColor: normalizeHex(fgTextEl.value, "#000000"),
      background: normalizeHex(bgTextEl.value, "#ffffff"),
    };
  }

  function clearSvg() {
    while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
    svgEl.removeAttribute("width");
    svgEl.removeAttribute("height");
    svgEl.removeAttribute("viewBox");
  }

  function renderBarcode(value, opts) {
    clearSvg();
    JsBarcode(svgEl, value, {
      format: opts.format,
      width: opts.width,
      height: opts.height,
      displayValue: opts.displayValue,
      lineColor: opts.lineColor,
      background: opts.background,
      margin: opts.margin,
    });
  }

  function timestampFilename(ext) {
    var d = new Date();
    var pad = function (n) {
      return String(n).padStart(2, "0");
    };
    return (
      "barcode-" +
      d.getFullYear() +
      pad(d.getMonth() + 1) +
      pad(d.getDate()) +
      "-" +
      pad(d.getHours()) +
      pad(d.getMinutes()) +
      pad(d.getSeconds()) +
      "." +
      ext
    );
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function getSvgMarkup() {
    if (svgEl.getAttribute("xmlns") !== "http://www.w3.org/2000/svg") {
      svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }
    return new XMLSerializer().serializeToString(svgEl);
  }

  function svgToPngBlob(callback) {
    var markup = getSvgMarkup();
    var blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var img = new Image();
    img.onload = function () {
      var w = img.naturalWidth || parseInt(svgEl.getAttribute("width"), 10) || 300;
      var h = img.naturalHeight || parseInt(svgEl.getAttribute("height"), 10) || 100;
      var canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = normalizeHex(bgTextEl.value, "#ffffff");
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        function (pngBlob) {
          callback(pngBlob);
        },
        "image/png",
        1
      );
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      callback(null);
    };
    img.src = url;
  }

  function generate() {
    if (!ensureLibrary()) return;

    var prepared = prepareValue(formatEl.value, textEl.value);
    if (!prepared.ok) {
      showHint(prepared.msg, "warn");
      setPreviewState(false);
      clearSvg();
      return;
    }

    try {
      renderBarcode(prepared.value, getOptions());
      if (prepared.value !== String(textEl.value).trim() && /^(EAN|UPC|ITF)/.test(formatEl.value)) {
        textEl.value = prepared.value;
      }
      setPreviewState(true);
      showHint("已生成。", "success");
    } catch (e) {
      setPreviewState(false);
      clearSvg();
      showHint(e.message || "生成失败，请检查内容与参数。", "error");
    }
  }

  function downloadPng() {
    if (!hasBarcode) {
      showHint("请先生成条形码。", "warn");
      return;
    }
    svgToPngBlob(function (blob) {
      if (!blob) {
        showHint("PNG 导出失败。", "error");
        return;
      }
      downloadBlob(blob, timestampFilename("png"));
      showHint("PNG 已下载。", "success");
    });
  }

  function downloadSvgFile() {
    if (!hasBarcode) {
      showHint("请先生成条形码。", "warn");
      return;
    }
    var blob = new Blob([getSvgMarkup()], { type: "image/svg+xml;charset=utf-8" });
    downloadBlob(blob, timestampFilename("svg"));
    showHint("SVG 已下载。", "success");
  }

  function clearAll() {
    textEl.value = "";
    formatEl.value = "CODE128";
    widthEl.value = "2";
    heightEl.value = "80";
    marginEl.value = "10";
    displayValueEl.checked = true;
    fgEl.value = "#000000";
    fgTextEl.value = "#000000";
    bgEl.value = "#ffffff";
    bgTextEl.value = "#ffffff";
    clearSvg();
    setPreviewState(false);
    showHint("", "");
    textEl.focus();
  }

  syncColorInputs(fgEl, fgTextEl);
  syncColorInputs(bgEl, bgTextEl);

  btnGenerate.addEventListener("click", generate);
  btnPng.addEventListener("click", downloadPng);
  btnSvg.addEventListener("click", downloadSvgFile);
  btnClear.addEventListener("click", clearAll);

  textEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      generate();
    }
  });

  setPreviewState(false);
})();
