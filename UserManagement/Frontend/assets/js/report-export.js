// Shared authenticated downloads and browser-only PDF printing (US7).
function reportExportConfig(kind, id) {
  let path,
    query = new URLSearchParams(),
    errorId,
    fallback;
  if (kind === "final") {
    if (!Number.isSafeInteger(Number(id)) || Number(id) < 1)
      throw new Error("Mã báo cáo không hợp lệ.");
    path = `/final-reports/${Number(id)}`;
    errorId = "finalReportError";
    fallback = `bao-cao-cuoi-ky-${Number(id)}`;
  } else if (kind === "attendance") {
    const filters = attendanceReportQuery();
    if (!filters) return null;
    query = filters;
    path = "/attendance/report";
    errorId = "attendanceReportError";
    fallback = "bao-cao-chuyen-can";
  } else if (kind === "completion") {
    if (!crAppliedFilters)
      throw new Error("Vui lòng xem báo cáo trước khi xuất.");
    query = new URLSearchParams(crAppliedFilters);
    path = "/reports/completion-rate";
    errorId = "crError";
    fallback = "ty-le-hoan-thanh-chuong-trinh";
  } else if (kind === "origin") {
    for (const [key, input] of [
      ["status", "iorStatus"],
      ["from", "iorFrom"],
      ["to", "iorTo"],
      ["q", "iorQ"],
      ["groupBy", "iorGroupBy"],
    ]) {
      const value = document.getElementById(input).value.trim();
      if (value) query.set(key, value);
    }
    path = "/reports/interns-by-origin";
    errorId = "iorError";
    fallback = "thuc-tap-sinh-theo-truong-nganh";
  } else throw new Error("Báo cáo không hợp lệ.");
  return { path, query, errorId, fallback };
}
async function reportExportResponse(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (res.status === 401) {
    forceLogout("Phiên đăng nhập đã hết hạn!");
    throw new Error("Phiên đăng nhập đã hết hạn.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      res.status >= 500
        ? "Không thể xuất báo cáo. Vui lòng thử lại sau."
        : body.message || body.error || "Không có quyền xuất báo cáo.",
    );
  }
  return res;
}
function exportFilename(disposition, fallback) {
  let name = fallback;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition || "");
  const ascii = /filename=(?:"([^"]+)"|([^;]+))/i.exec(disposition || "");
  try {
    name = utf8
      ? decodeURIComponent(utf8[1])
      : ascii
        ? (ascii[1] || ascii[2]).trim()
        : fallback;
  } catch {
    name = fallback;
  }
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 180);
}
async function downloadReportFile(path, fallback) {
  const res = await reportExportResponse(path);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = exportFilename(
      res.headers.get("Content-Disposition"),
      fallback,
    );
    document.body.append(link);
    link.click();
    link.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
function printReport(model) {
  if (!model?.tables?.length) throw new Error("Không có dữ liệu để in.");
  const rows = model.tables.reduce(
    (n, t) => n + t.rows.length + (t.totals ? 1 : 0),
    0,
  );
  const cells = model.tables.reduce(
    (n, t) => n + (t.rows.length + 1) * t.columns.length,
    0,
  );
  if (
    rows > 10000 ||
    cells > 250000 ||
    model.tables.length > 20 ||
    model.tables.some((t) => t.columns.length > 100)
  )
    throw new Error("Báo cáo quá lớn. Vui lòng thu hẹp bộ lọc trước khi xuất!");
  if (document.querySelector("iframe.report-print-frame"))
    throw new Error("Một trang in đang mở. Vui lòng đóng trang in trước.");
  const landscape = model.tables.some((t) => t.columns.length > 6);
  const cellText = (value, column) => {
    if (value == null || value === "") return "—";
    if (column.type === "percent")
      return `${(Number(value) * 100).toFixed(1)}%`;
    if (column.type === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value))
      return value.split("-").reverse().join("/");
    return String(value);
  };
  const tables = model.tables
    .map((t) => {
      const row = (values, tag = "td") =>
        `<tr>${t.columns.map((c, i) => `<${tag}>${escapeHtml(cellText(values[i], c))}</${tag}>`).join("")}</tr>`;
      return `<section><h2>${escapeHtml(t.name)}</h2><table class="${t.columns.length > 12 ? "wide-table" : ""}"><thead><tr>${t.columns.map((c) => `<th scope="col">${escapeHtml(c.label)}</th>`).join("")}</tr></thead><tbody>${t.rows.length ? t.rows.map((r) => row(r)).join("") : `<tr><td colspan="${t.columns.length}">Không có dữ liệu phù hợp.</td></tr>`}</tbody>${t.totals ? `<tfoot>${row(t.totals)}</tfoot>` : ""}</table></section>`;
    })
    .join("");
  const filename = `${model.fileBase}_${model.exportedDate}`;
  const html = `<!doctype html><html lang="vi"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escapeHtml(filename)}</title><style>
          @page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 12mm; @bottom-right { content: "Trang " counter(page) " / " counter(pages); font: 8pt Arial; } }
          * { box-sizing: border-box; } body { margin: 0; color: #111827; font: 10pt Arial, sans-serif; } h1 { font-size: 18pt; color: #2563eb; } h2 { font-size: 12pt; break-after: avoid; } p { white-space: pre-wrap; overflow-wrap: anywhere; } table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 8mm; } th, td { border: 0.2mm solid #cbd5e1; padding: 2mm; text-align: left; overflow-wrap: anywhere; white-space: pre-wrap; vertical-align: top; } th { background: #eff6ff; font-weight: bold; } thead { display: table-header-group; } tfoot { display: table-row-group; font-weight: bold; } tr { break-inside: avoid; page-break-inside: avoid; } .wide-table { font-size: 7pt; } .wide-table th, .wide-table td { padding: 1mm; } section { break-inside: auto; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        </style></head><body><h1>${escapeHtml(model.title)}</h1><p>Thời điểm xuất (giờ Việt Nam): ${escapeHtml(model.exportedAt)}</p>${(model.info || []).map((line) => `<p>${escapeHtml(line)}</p>`).join("")}${tables}</body></html>`;
  return new Promise((resolve, reject) => {
    const previousTitle = document.title;
    document.title = filename;
    const frame = document.createElement("iframe");
    frame.className = "report-print-frame";
    frame.title = "Trang in báo cáo";
    frame.setAttribute("sandbox", "allow-same-origin allow-modals");
    frame.style.cssText =
      "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;pointer-events:none;";
    let fallbackTimer,
      focusTimer,
      printed = false;
    const clean = (error) => {
      clearTimeout(fallbackTimer);
      clearTimeout(focusTimer);
      window.removeEventListener("focus", onFocus);
      frame.remove();
      document.title = previousTitle;
      if (error instanceof Error) reject(error);
      else resolve();
    };
    const onFocus = () => {
      if (printed) focusTimer = setTimeout(clean, 500);
    };
    frame.onload = () => {
      try {
        frame.contentWindow.addEventListener("afterprint", clean, {
          once: true,
        });
        window.addEventListener("focus", onFocus);
        printed = true;
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } catch {
        clean(new Error("Không mở được hộp thoại in. Vui lòng thử lại."));
      }
    };
    frame.srcdoc = html;
    document.body.append(frame);
    // Fallback for browsers that omit afterprint/focus after cancelling the dialog.
    fallbackTimer = setTimeout(clean, 120000);
  });
}
async function exportReport(kind, format, button, id) {
  const errorIds = {
    final: "finalReportError",
    attendance: "attendanceReportError",
    completion: "crError",
    origin: "iorError",
  };
  const error = document.getElementById(errorIds[kind]);
  if (error) error.textContent = "";
  const previousContent = button ? [...button.childNodes] : [];
  const wasDisabled = Boolean(button?.disabled);
  if (button) {
    button.disabled = true;
    button.textContent =
      format === "pdf" ? "Đang chuẩn bị in..." : "Đang xuất...";
  }
  try {
    const cfg = reportExportConfig(kind, id);
    if (!cfg) return;
    const query = cfg.query.size ? `?${cfg.query}` : "";
    if (format === "pdf") {
      const res = await reportExportResponse(`${cfg.path}${query}`);
      const body = await res.json();
      await printReport(body.data.exportModel);
    } else {
      await downloadReportFile(
        `${cfg.path}/export.${format}${query}`,
        `${cfg.fallback}_${getVietnamToday()}.${format}`,
      );
    }
  } catch (err) {
    if (error)
      error.textContent =
        err instanceof TypeError
          ? "Không thể kết nối để xuất báo cáo. Vui lòng thử lại."
          : err.message;
  } finally {
    if (button?.isConnected) {
      button.disabled =
        wasDisabled ||
        (kind === "completion" && format === "csv" && !crAppliedFilters);
      button.replaceChildren(...previousContent);
    }
  }
}
