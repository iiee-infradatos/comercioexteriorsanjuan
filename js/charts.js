const Charts = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const colors = ["#123a63", "#4aa3c7", "#c9972b", "#5d7c8f", "#177245", "#a33a3a", "#788596"];

  function clear(el) {
    el.innerHTML = "";
  }

  function svg(width, height) {
    const node = document.createElementNS(NS, "svg");
    node.setAttribute("viewBox", `0 0 ${width} ${height}`);
    node.setAttribute("width", width);
    node.setAttribute("height", height);
    node.setAttribute("role", "img");
    return node;
  }

  function el(name, attrs = {}, text = "") {
    const node = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    if (text) node.textContent = text;
    return node;
  }

  function scale(value, d0, d1, r0, r1) {
    if (d1 === d0) return (r0 + r1) / 2;
    return r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
  }

  function empty(container, msg = "Sin datos para la selección actual.") {
    clear(container);
    const p = document.createElement("p");
    p.className = "warning";
    p.textContent = msg;
    container.appendChild(p);
  }

  function ensureTooltip(container) {
    let tip = container.querySelector(".chart-tooltip");
    if (!tip) {
      tip = document.createElement("div");
      tip.className = "chart-tooltip";
      tip.hidden = true;
      container.appendChild(tip);
    }
    return tip;
  }

  function showTooltip(container, event, html, pinned = false) {
    const tip = ensureTooltip(container);
    const box = container.getBoundingClientRect();
    tip.innerHTML = html;
    tip.hidden = false;
    tip.dataset.pinned = pinned ? "true" : "false";
    tip.style.left = `${Math.min(Math.max(event.clientX - box.left + 12, 8), Math.max(8, box.width - 270))}px`;
    tip.style.top = `${Math.max(event.clientY - box.top - 44, 8)}px`;
  }

  function hideTooltip(container, force = false) {
    const tip = container.querySelector(".chart-tooltip");
    if (!tip) return;
    if (force || tip.dataset.pinned !== "true") tip.hidden = true;
  }

  function tooltipHtml(title, rows) {
    return `<strong>${title}</strong>${rows.filter(Boolean).map((row) => `<div>${row}</div>`).join("")}`;
  }

  function attachTooltip(container, node, html) {
    node.setAttribute("data-tooltip", "true");
    node.setAttribute("tabindex", "0");
    node.appendChild(el("title", {}, html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()));
    node.addEventListener("mouseenter", (event) => showTooltip(container, event, html));
    node.addEventListener("mousemove", (event) => showTooltip(container, event, html));
    node.addEventListener("mouseleave", () => hideTooltip(container));
    node.addEventListener("focus", (event) => showTooltip(container, event, html, true));
    node.addEventListener("blur", () => hideTooltip(container, true));
    node.addEventListener("click", (event) => {
      event.stopPropagation();
      showTooltip(container, event, html, true);
    });
  }

  function lineLegend(s, x, y, items) {
    let cursor = x;
    items.forEach((item) => {
      if (item.kind === "line") {
        s.appendChild(el("line", {
          x1: cursor,
          y1: y,
          x2: cursor + 28,
          y2: y,
          stroke: item.color,
          "stroke-width": item.width || 3,
          "stroke-dasharray": item.dash || "",
          "stroke-linecap": item.cap || "butt",
        }));
      } else if (item.kind === "marker") {
        s.appendChild(el("circle", {
          cx: cursor + 8,
          cy: y,
          r: item.r || 5,
          fill: item.color,
          stroke: item.stroke || "none",
          "stroke-width": item.strokeWidth || 0,
        }));
      } else {
        s.appendChild(el("rect", { x: cursor, y: y - 6, width: 16, height: 12, rx: 3, fill: item.color }));
      }
      const textX = cursor + (item.kind === "line" ? 34 : 22);
      s.appendChild(el("text", { x: textX, y: y + 4, class: "label" }, item.label));
      cursor = textX + Math.max(76, item.label.length * 6.6);
    });
  }

  function lineChart(container, series, options = {}) {
    if (!series.length) return empty(container);
    clear(container);
    const width = 760;
    const height = 330;
    const pad = { l: 64, r: 34, t: 64, b: 48 };
    const s = svg(width, height);
    const max = Math.max(...series.map((d) => d.value), 1);
    const minYear = Math.min(...series.map((d) => d.year));
    const maxYear = Math.max(...series.map((d) => d.year));
    const yTicks = 5;
    const legendItems = [{ kind: "line", label: "Valor anual", color: "#77c9ec", width: 3 }];
    if (options.average) legendItems.push({ kind: "line", label: "Tendencia", color: "#c084fc", width: 2.4, dash: "1 7 10 7", cap: "round" });
    if (options.secondary && options.secondary.length) legendItems.push({ kind: "marker", label: "% PGB", color: "#f59e0b", stroke: "#0b1220", strokeWidth: 1.4 });
    lineLegend(s, 150, 18, legendItems);
    s.appendChild(el("text", { x: pad.l, y: 42, class: "label", "text-anchor": "start" }, "US$ millones"));
    if (options.secondary && options.secondary.length) {
      s.appendChild(el("text", { x: width - pad.r, y: 42, class: "label", "text-anchor": "end", fill: "#f59e0b" }, "% PGB"));
    }

    for (let i = 0; i <= yTicks; i += 1) {
      const val = (max / yTicks) * i;
      const y = scale(val, 0, max, height - pad.b, pad.t);
      s.appendChild(el("line", { x1: pad.l, y1: y, x2: width - pad.r, y2: y, stroke: "#d8e0ea" }));
      s.appendChild(el("text", { x: pad.l - 8, y: y + 4, "text-anchor": "end", class: "label" }, Indicators.fmtNumber.format(val / 1_000_000)));
    }

    const path = series.map((d, i) => {
      const x = scale(d.year, minYear, maxYear, pad.l, width - pad.r);
      const y = scale(d.value, 0, max, height - pad.b, pad.t);
      return `${i ? "L" : "M"} ${x} ${y}`;
    }).join(" ");
    s.appendChild(el("path", { d: path, class: "line-main" }));

    if (options.average) {
      const avgPath = options.average.map((d, i) => {
        const x = scale(d.year, minYear, maxYear, pad.l, width - pad.r);
        const y = scale(d.average, 0, max, height - pad.b, pad.t);
        return `${i ? "L" : "M"} ${x} ${y}`;
      }).join(" ");
      s.appendChild(el("path", { d: avgPath, class: "line-average" }));
    }

    if (options.secondary && options.secondary.length) {
      const maxPct = Math.max(...options.secondary.map((d) => d.value || 0), 1);
      for (let i = 0; i <= yTicks; i += 1) {
        const val = (maxPct / yTicks) * i;
        const y = scale(val, 0, maxPct, height - pad.b, pad.t);
        s.appendChild(el("text", { x: width - 4, y: y + 4, "text-anchor": "end", class: "label" }, Indicators.pct(val)));
      }
      options.secondary.forEach((d) => {
        const x = scale(d.year, minYear, maxYear, pad.l, width - pad.r);
        const y = scale(d.value || 0, 0, maxPct, height - pad.b, pad.t);
        const marker = el("circle", { cx: x, cy: y, r: 5, fill: "#f59e0b", stroke: "#0b1220", "stroke-width": 1.4 });
        attachTooltip(container, marker, tooltipHtml(`Año ${d.year}`, [`% PGB: ${Indicators.pct(d.value)}`]));
        s.appendChild(marker);
      });
    }

    series.forEach((d) => {
      const x = scale(d.year, minYear, maxYear, pad.l, width - pad.r);
      const y = scale(d.value, 0, max, height - pad.b, pad.t);
      s.appendChild(el("circle", { cx: x, cy: y, r: 4, fill: "#123a63" }));
      const avg = options.average ? options.average.find((a) => a.year === d.year) : null;
      const hit = el("circle", { cx: x, cy: y, r: 12, fill: "transparent", stroke: "transparent" });
      attachTooltip(container, hit, tooltipHtml(`Año ${d.year}`, [
        `Valor: ${Indicators.money(d.value)}`,
        d.pgb_share != null ? `% PGB: ${Indicators.pct(d.pgb_share)}` : "PGB: s/d",
        avg ? `Promedio móvil: ${Indicators.money(avg.average)}` : "",
      ]));
      s.appendChild(hit);
    });

    const step = Math.max(1, Math.ceil(series.length / 8));
    series.forEach((d, i) => {
      if (i % step === 0 || i === series.length - 1) {
        const x = scale(d.year, minYear, maxYear, pad.l, width - pad.r);
        s.appendChild(el("text", { x, y: height - 18, "text-anchor": "middle", class: "label" }, d.year));
      }
    });
    container.appendChild(s);
  }

  function barChart(container, data, options = {}) {
    if (!data.length) return empty(container);
    clear(container);
    const width = 760;
    const rowH = options.rowHeight || 30;
    const height = Math.max(260, 70 + data.length * rowH);
    const hasPgb = data.some((d) => d.pgbShare != null);
    const pad = { l: options.left || 210, r: 90, t: hasPgb ? 42 : 30, b: 28 };
    const s = svg(width, height);
    const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
    lineLegend(s, pad.l, 18, [
      { kind: "box", label: options.format ? "Valor seleccionado" : "US$ millones", color: options.color || "#123a63" },
      ...(hasPgb ? [{ kind: "marker", label: "% PGB en etiqueta", color: "#f59e0b", stroke: "#0b1220", strokeWidth: 1.2, r: 5 }] : []),
    ]);
    data.forEach((d, i) => {
      const y = pad.t + i * rowH;
      const w = scale(Math.abs(d.value), 0, max, 0, width - pad.l - pad.r);
      const color = options.signed ? (d.value >= 0 ? "#177245" : "#a33a3a") : (options.color || "#123a63");
      s.appendChild(el("text", { x: pad.l - 10, y: y + 18, "text-anchor": "end", class: "label" }, truncate(d.name, 28)));
      const label = options.format ? options.format(d.value, d) : Indicators.money(d.value);
      const rect = el("rect", { x: pad.l, y: y + 4, width: Math.max(1, w), height: 18, rx: 3, fill: color });
      const pgbLabel = d.pgbShare != null ? `% PGB: ${Indicators.pct(d.pgbShare)}` : "";
      attachTooltip(container, rect, tooltipHtml(d.name, [`Valor: ${label}`, pgbLabel]));
      s.appendChild(rect);
      s.appendChild(el("text", { x: pad.l + w + 8, y: y + 18, class: "label" }, pgbLabel ? `${label} | ${Indicators.pct(d.pgbShare)} PGB` : label));
    });
    container.appendChild(s);
  }

  function verticalBars(container, data) {
    if (!data.length) return empty(container);
    clear(container);
    const width = 760;
    const height = 330;
    const pad = { l: 55, r: 20, t: 42, b: 58 };
    const s = svg(width, height);
    const maxAbs = Math.max(...data.map((d) => Math.abs(d.value)), 1);
    const zero = scale(0, -maxAbs, maxAbs, height - pad.b, pad.t);
    lineLegend(s, 125, 18, [
      { kind: "box", label: "Variación positiva", color: "#2dd4bf" },
      { kind: "box", label: "Variación negativa", color: "#fb7185" },
    ]);
    s.appendChild(el("line", { x1: pad.l, y1: zero, x2: width - pad.r, y2: zero, stroke: "#64748b", "stroke-dasharray": "4 5" }));
    const barW = (width - pad.l - pad.r) / data.length * 0.72;
    data.forEach((d, i) => {
      const x = pad.l + i * ((width - pad.l - pad.r) / data.length) + barW * 0.2;
      const y = scale(d.value, -maxAbs, maxAbs, height - pad.b, pad.t);
      const h = Math.abs(zero - y);
      const rect = el("rect", {
        x,
        y: Math.min(y, zero),
        width: barW,
        height: Math.max(1, h),
        rx: 4,
        fill: d.value >= 0 ? "#2dd4bf" : "#fb7185",
        stroke: d.value >= 0 ? "#5eead4" : "#fda4af",
        "stroke-width": 0.8,
      });
      attachTooltip(container, rect, tooltipHtml(d.comparison || `Año ${d.name}`, [`Variación interanual: ${Indicators.pct(d.value)}`]));
      s.appendChild(rect);
      if (i % Math.ceil(data.length / 8) === 0 || i === data.length - 1) {
        const labelX = x + barW / 2;
        const labelY = height - 18;
        s.appendChild(el("text", { x: labelX, y: labelY, "text-anchor": "end", class: "label", transform: `rotate(-35 ${labelX} ${labelY})` }, d.name));
      }
    });
    s.appendChild(el("text", { x: 10, y: 16, class: "label" }, "Variación %"));
    container.appendChild(s);
  }

  function treemap(container, items) {
    if (!items.length) return empty(container);
    clear(container);
    const width = 760;
    const height = 360;
    const s = svg(width, height);
    const total = items.reduce((a, d) => a + d.value, 0);
    lineLegend(s, 12, 18, [{ kind: "box", label: "Cada color representa una cadena/rubro", color: colors[0] }]);
    let x = 0;
    items.slice(0, 12).forEach((d, i) => {
      const w = Math.max(6, (d.value / total) * width);
      const rect = el("rect", { x, y: 34, width: w, height: height - 34, fill: colors[i % colors.length], opacity: 0.9 });
      attachTooltip(container, rect, tooltipHtml(d.name, [
        `Valor: ${Indicators.money(d.value)}`,
        `Participación: ${Indicators.pct((d.value / total) * 100)}`,
      ]));
      s.appendChild(rect);
      if (w > 70) {
        s.appendChild(el("text", { x: x + 8, y: 58, fill: "#fff", "font-size": 13, "font-weight": 700 }, truncate(d.name, Math.floor(w / 9))));
        s.appendChild(el("text", { x: x + 8, y: 78, fill: "#fff", "font-size": 12 }, Indicators.pct((d.value / total) * 100)));
      }
      x += w;
    });
    container.appendChild(s);
  }

  function heatmap(container, matrix, products, countries) {
    if (!matrix.length) return empty(container);
    clear(container);
    const cell = 34;
    const left = 210;
    const top = 138;
    const width = left + countries.length * cell + 30;
    const height = top + products.length * cell + 40;
    const s = svg(width, height);
    const max = Math.max(...matrix.map((d) => d.value), 1);
    const lookup = new Map(matrix.map((d) => [`${d.product}|||${d.country}`, d.value]));
    drawHeatmapLegend(s, left, 20);
    countries.forEach((c, i) => {
      const t = el("text", { x: left + i * cell + 18, y: top - 8, class: "label", transform: `rotate(-55 ${left + i * cell + 18} ${top - 8})` }, truncate(c, 16));
      s.appendChild(t);
    });
    products.forEach((p, r) => {
      s.appendChild(el("text", { x: left - 8, y: top + r * cell + 22, "text-anchor": "end", class: "label" }, truncate(p, 30)));
      countries.forEach((c, col) => {
        const value = lookup.get(`${p}|||${c}`) || 0;
        const intensity = value ? Math.sqrt(value / max) : 0;
        const rect = el("rect", {
          x: left + col * cell,
          y: top + r * cell,
          width: cell - 2,
          height: cell - 2,
          fill: heatmapColor(intensity),
          opacity: 1,
          stroke: value ? "#f8fafc" : "#4b5563",
          "stroke-width": value ? 0.45 : 0.35,
        });
        attachTooltip(container, rect, tooltipHtml(`${p} / ${c}`, [`Valor: ${Indicators.money(value)}`]));
        s.appendChild(rect);
      });
    });
    container.appendChild(s);
  }

  function heatmapColor(t) {
    if (!t) return "#1f2937";
    const stops = [
      [0, [71, 85, 105]],
      [0.35, [148, 163, 184]],
      [0.7, [226, 232, 240]],
      [1, [255, 255, 255]],
    ];
    for (let i = 1; i < stops.length; i += 1) {
      if (t <= stops[i][0]) {
        const [p0, c0] = stops[i - 1];
        const [p1, c1] = stops[i];
        const f = (t - p0) / (p1 - p0);
        const rgb = c0.map((v, idx) => Math.round(v + (c1[idx] - v) * f));
        return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      }
    }
    return "rgb(255, 255, 255)";
  }

  function drawHeatmapLegend(s, x, y) {
    s.appendChild(el("text", { x, y, class: "label" }, "Intensidad: valor exportado/importado"));
    const labels = ["Bajo", "Medio", "Alto"];
    [0.18, 0.55, 1].forEach((t, i) => {
      const lx = x + i * 92;
      const ly = y + 24;
      s.appendChild(el("rect", { x: lx, y: ly - 10, width: 24, height: 13, rx: 3, fill: heatmapColor(t), stroke: "#f8fafc", "stroke-width": 0.35 }));
      s.appendChild(el("text", { x: lx + 32, y: ly, class: "label" }, labels[i]));
    });
  }

  function projectionScenarioChart(container, rows, label = "Exportaciones") {
    if (!rows.length) return empty(container, "No hay proyecciones para graficar.");
    clear(container);
    const data = rows.filter((d) => Number(d.year) >= 2026 && Number(d.year) <= 2035);
    if (!data.length) return empty(container, "No hay horizonte 2026-2035 disponible.");
    const width = 760;
    const height = 360;
    const pad = { l: 72, r: 36, t: 64, b: 48 };
    const s = svg(width, height);
    const series = [
      { key: "conservative", name: "Conservador", color: "#60a5fa", dash: "4 5" },
      { key: "base", name: "Base", color: "#f8fafc", dash: "" },
      { key: "optimistic", name: "Optimista", color: "#fbbf24", dash: "8 4" },
    ];
    const max = Math.max(...data.flatMap((d) => series.map((item) => Number(d[item.key] || 0))), 1);
    const minYear = Math.min(...data.map((d) => Number(d.year)));
    const maxYear = Math.max(...data.map((d) => Number(d.year)));
    lineLegend(s, 164, 18, series.map((item) => ({ kind: "line", label: item.name, color: item.color, width: item.key === "base" ? 3.4 : 2.3, dash: item.dash })));
    s.appendChild(el("text", { x: pad.l, y: 42, class: "label", "text-anchor": "start" }, `${label} - US$ millones`));
    for (let i = 0; i <= 5; i += 1) {
      const val = (max / 5) * i;
      const y = scale(val, 0, max, height - pad.b, pad.t);
      s.appendChild(el("line", { x1: pad.l, y1: y, x2: width - pad.r, y2: y, stroke: "#d8e0ea" }));
      s.appendChild(el("text", { x: pad.l - 10, y: y + 4, "text-anchor": "end", class: "label" }, Indicators.fmtNumber.format(val / 1_000_000)));
    }
    series.forEach((item) => {
      const path = data.map((d, i) => {
        const x = scale(Number(d.year), minYear, maxYear, pad.l, width - pad.r);
        const y = scale(Number(d[item.key] || 0), 0, max, height - pad.b, pad.t);
        return `${i ? "L" : "M"} ${x} ${y}`;
      }).join(" ");
      s.appendChild(el("path", { d: path, fill: "none", stroke: item.color, "stroke-width": item.key === "base" ? 3.4 : 2.3, "stroke-dasharray": item.dash }));
      data.forEach((d) => {
        const x = scale(Number(d.year), minYear, maxYear, pad.l, width - pad.r);
        const y = scale(Number(d[item.key] || 0), 0, max, height - pad.b, pad.t);
        const mark = el("circle", { cx: x, cy: y, r: item.key === "base" ? 4.5 : 3.6, fill: item.color, stroke: "#0b1220", "stroke-width": 1.2 });
        attachTooltip(container, mark, tooltipHtml(`${item.name} ${d.year}`, [
          `${label}: ${Indicators.money(d[item.key])}`,
          `Escenario base: ${Indicators.money(d.base)}`,
          `Rango: ${Indicators.money(d.conservative)} a ${Indicators.money(d.optimistic)}`,
        ]));
        s.appendChild(mark);
      });
    });
    data.forEach((d, i) => {
      const x = scale(Number(d.year), minYear, maxYear, pad.l, width - pad.r);
      if (i % 2 === 0 || i === data.length - 1) s.appendChild(el("text", { x, y: height - 18, "text-anchor": "middle", class: "label" }, d.year));
    });
    container.appendChild(s);
  }

  function projectionChainBars(container, chains, label = "Exportaciones") {
    const rows = chains
      .map((chain) => {
        const model = chain.model || {};
        const forecast = (model.forecast || []).find((d) => Number(d.year) === 2035);
        return forecast ? { ...chain, ...model, forecast } : null;
      })
      .filter(Boolean)
      .sort((a, b) => Number(b.forecast.base || 0) - Number(a.forecast.base || 0))
      .slice(0, 10);
    if (!rows.length) return empty(container, "No hay proyecciones por cadena para graficar.");
    clear(container);
    const width = 760;
    const rowH = 36;
    const height = 72 + rows.length * rowH;
    const pad = { l: 250, r: 150, t: 42, b: 28 };
    const s = svg(width, height);
    const values = rows.flatMap((d) => [d.forecast.conservative, d.forecast.base, d.forecast.optimistic].map((v) => Number(v || 0)).filter((v) => v > 0));
    const min = Math.max(Math.min(...values), 1);
    const max = Math.max(...values, min * 10);
    const logScale = (value) => {
      const v = Math.max(Number(value || 0), min);
      return scale(Math.log(v), Math.log(min), Math.log(max), pad.l, width - pad.r);
    };
    lineLegend(s, pad.l, 18, [
      { kind: "line", label: "Rango conservador-optimista", color: "#94a3b8", width: 5 },
      { kind: "box", label: "Base 2035", color: "#fbbf24" },
    ]);
    s.appendChild(el("text", { x: width - pad.r, y: 40, "text-anchor": "end", class: "label" }, "Escala logarítmica"));
    rows.forEach((d, i) => {
      const cy = pad.t + i * rowH + 16;
      const xCons = logScale(d.forecast.conservative);
      const xBase = logScale(d.forecast.base);
      const xOpt = logScale(d.forecast.optimistic);
      s.appendChild(el("text", { x: pad.l - 18, y: cy + 4, "text-anchor": "end", class: "label" }, truncate(d.chain, 31)));
      const range = el("line", { x1: xCons, y1: cy, x2: xOpt, y2: cy, stroke: "#94a3b8", "stroke-width": 7, "stroke-linecap": "round", opacity: 0.75 });
      attachTooltip(container, range, tooltipHtml(d.chain, [
        `Conservador 2035: ${Indicators.money(d.forecast.conservative)}`,
        `Base 2035: ${Indicators.money(d.forecast.base)}`,
        `Optimista 2035: ${Indicators.money(d.forecast.optimistic)}`,
        `Modelo: ${d.model_type || "s/d"}`,
      ]));
      s.appendChild(range);
      const base = el("circle", { cx: xBase, cy, r: 6, fill: "#fbbf24", stroke: "#0b1220", "stroke-width": 1.4 });
      attachTooltip(container, base, tooltipHtml(`${d.chain} - base`, [
        `${label}: ${Indicators.money(d.forecast.base)}`,
        `Ultimo dato ${d.last_observed_year}: ${Indicators.money(d.last_observed_value)}`,
        `Modelo: ${d.model_type || "s/d"}`,
      ]));
      s.appendChild(base);
      s.appendChild(el("text", { x: width - 12, y: cy + 4, "text-anchor": "end", class: "label" }, Indicators.money(d.forecast.base).replace("US$ ", "")));
    });
    container.appendChild(s);
  }

  function tradeItcrbChart(container, rows, marketLabel) {
    if (!rows.length) return empty(container, "No hay datos de comercio e índice para la selección.");
    clear(container);
    const data = rows.filter((d) => d.index != null && (d.exports > 0 || d.imports > 0)).sort((a, b) => a.year - b.year);
    if (!data.length) return empty(container, "No hay años coincidentes entre comercio e índice.");
    const width = 760;
    const height = 390;
    const pad = { l: 72, r: 72, t: 64, b: 52 };
    const s = svg(width, height);
    const minYear = Math.min(...data.map((d) => d.year));
    const maxYear = Math.max(...data.map((d) => d.year));
    const maxTrade = Math.max(...data.flatMap((d) => [d.exports || 0, d.imports || 0]), 1);
    const minIndex = Math.min(...data.map((d) => d.index));
    const maxIndex = Math.max(...data.map((d) => d.index));
    const idxPad = Math.max(5, (maxIndex - minIndex) * 0.08);
    const idxMin = Math.max(0, minIndex - idxPad);
    const idxMax = maxIndex + idxPad;
    lineLegend(s, 112, 18, [
      { kind: "line", label: "Exportaciones", color: "#77c9ec", width: 3 },
      { kind: "line", label: "Importaciones", color: "#2dd4bf", width: 3, dash: "5 4" },
      { kind: "line", label: "ITCRM/ITCRB", color: "#fbbf24", width: 2.5, dash: "8 4" },
    ]);
    s.appendChild(el("text", { x: pad.l, y: 44, class: "label", "text-anchor": "start" }, "US$ millones"));
    s.appendChild(el("text", { x: width - pad.r, y: 44, class: "label", "text-anchor": "end", fill: "#fbbf24" }, "Índice"));
    for (let i = 0; i <= 5; i += 1) {
      const val = (maxTrade / 5) * i;
      const y = scale(val, 0, maxTrade, height - pad.b, pad.t);
      s.appendChild(el("line", { x1: pad.l, y1: y, x2: width - pad.r, y2: y, stroke: "#d8e0ea" }));
      s.appendChild(el("text", { x: pad.l - 9, y: y + 4, "text-anchor": "end", class: "label" }, Indicators.fmtNumber.format(val / 1_000_000)));
      const idxVal = idxMin + ((idxMax - idxMin) / 5) * i;
      const idxY = scale(idxVal, idxMin, idxMax, height - pad.b, pad.t);
      s.appendChild(el("text", { x: width - 7, y: idxY + 4, "text-anchor": "end", class: "label" }, Indicators.fmtNumber.format(idxVal)));
    }
    const pathFor = (key, min, max) => data.map((d, i) => {
      const x = scale(d.year, minYear, maxYear, pad.l, width - pad.r);
      const y = scale(Number(d[key] || 0), min, max, height - pad.b, pad.t);
      return `${i ? "L" : "M"} ${x} ${y}`;
    }).join(" ");
    s.appendChild(el("path", { d: pathFor("exports", 0, maxTrade), fill: "none", stroke: "#77c9ec", "stroke-width": 3 }));
    s.appendChild(el("path", { d: pathFor("imports", 0, maxTrade), fill: "none", stroke: "#2dd4bf", "stroke-width": 3, "stroke-dasharray": "5 4" }));
    s.appendChild(el("path", { d: pathFor("index", idxMin, idxMax), fill: "none", stroke: "#fbbf24", "stroke-width": 2.5, "stroke-dasharray": "8 4" }));
    data.forEach((d) => {
      const x = scale(d.year, minYear, maxYear, pad.l, width - pad.r);
      const yExport = scale(d.exports || 0, 0, maxTrade, height - pad.b, pad.t);
      const yImport = scale(d.imports || 0, 0, maxTrade, height - pad.b, pad.t);
      const yIndex = scale(d.index, idxMin, idxMax, height - pad.b, pad.t);
      const html = tooltipHtml(`${marketLabel} - ${d.year}`, [
        `Exportaciones: ${Indicators.money(d.exports || 0)}`,
        `Importaciones: ${Indicators.money(d.imports || 0)}`,
        `Índice: ${Indicators.fmtNumber.format(d.index)}`,
      ]);
      [
        el("circle", { cx: x, cy: yExport, r: 4, fill: "#77c9ec", stroke: "#0b1220", "stroke-width": 1 }),
        el("circle", { cx: x, cy: yImport, r: 4, fill: "#2dd4bf", stroke: "#0b1220", "stroke-width": 1 }),
        el("circle", { cx: x, cy: yIndex, r: 4, fill: "#fbbf24", stroke: "#0b1220", "stroke-width": 1 }),
      ].forEach((node) => {
        attachTooltip(container, node, html);
        s.appendChild(node);
      });
    });
    const step = Math.max(1, Math.ceil(data.length / 8));
    data.forEach((d, i) => {
      if (i % step === 0 || i === data.length - 1) {
        const x = scale(d.year, minYear, maxYear, pad.l, width - pad.r);
        s.appendChild(el("text", { x, y: height - 20, "text-anchor": "middle", class: "label" }, d.year));
      }
    });
    container.appendChild(s);
  }

  function tradeIndexChart(container, rows, marketLabel, operationLabel, valueKey, color) {
    if (!rows.length) return empty(container, "No hay datos de comercio e índice para la selección.");
    clear(container);
    const availableKey = `${valueKey}Available`;
    const data = rows.filter((d) => d.index != null && d[availableKey] !== false).sort((a, b) => a.year - b.year);
    if (!data.length) return empty(container, "No hay años coincidentes entre comercio e índice.");
    const width = 760;
    const height = 350;
    const pad = { l: 72, r: 72, t: 62, b: 50 };
    const s = svg(width, height);
    const minYear = Math.min(...data.map((d) => d.year));
    const maxYear = Math.max(...data.map((d) => d.year));
    const maxTrade = Math.max(...data.map((d) => Number(d[valueKey] || 0)), 1);
    const maxIndex = Math.max(...data.map((d) => Number(d.index || 0)), 1);
    const idxMax = maxIndex * 1.08;
    lineLegend(s, 132, 18, [
      { kind: "box", label: operationLabel, color },
      { kind: "line", label: "ITCRM/ITCRB", color: "#fbbf24", width: 2.5, dash: "8 4" },
    ]);
    s.appendChild(el("text", { x: pad.l, y: 42, class: "label", "text-anchor": "start" }, "US$ millones"));
    s.appendChild(el("text", { x: width - pad.r, y: 42, class: "label", "text-anchor": "end", fill: "#fbbf24" }, "Índice"));
    for (let i = 0; i <= 5; i += 1) {
      const val = (maxTrade / 5) * i;
      const y = scale(val, 0, maxTrade, height - pad.b, pad.t);
      s.appendChild(el("line", { x1: pad.l, y1: y, x2: width - pad.r, y2: y, stroke: "#d8e0ea" }));
      s.appendChild(el("text", { x: pad.l - 9, y: y + 4, "text-anchor": "end", class: "label" }, Indicators.fmtNumber.format(val / 1_000_000)));
      const idxVal = (idxMax / 5) * i;
      const idxY = scale(idxVal, 0, idxMax, height - pad.b, pad.t);
      s.appendChild(el("text", { x: width - 7, y: idxY + 4, "text-anchor": "end", class: "label" }, Indicators.fmtNumber.format(idxVal)));
    }
    const pathFor = (key, min, max) => data.map((d, i) => {
      const x = scale(d.year, minYear, maxYear, pad.l, width - pad.r);
      const y = scale(Number(d[key] || 0), min, max, height - pad.b, pad.t);
      return `${i ? "L" : "M"} ${x} ${y}`;
    }).join(" ");
    const span = Math.max(1, data.length);
    const barW = Math.max(10, Math.min(34, ((width - pad.l - pad.r) / span) * 0.58));
    data.forEach((d) => {
      const x = scale(d.year, minYear, maxYear, pad.l, width - pad.r);
      const value = Number(d[valueKey] || 0);
      const y = scale(value, 0, maxTrade, height - pad.b, pad.t);
      const rect = el("rect", {
        x: x - barW / 2,
        y,
        width: barW,
        height: Math.max(1, height - pad.b - y),
        rx: 3,
        fill: color,
        opacity: 0.82,
      });
      attachTooltip(container, rect, tooltipHtml(`${marketLabel} - ${d.year}`, [
        `${operationLabel}: ${Indicators.money(value)}`,
        `Índice: ${Indicators.fmtNumber.format(d.index)}`,
      ]));
      s.appendChild(rect);
    });
    s.appendChild(el("path", { d: pathFor("index", 0, idxMax), fill: "none", stroke: "#fbbf24", "stroke-width": 2.5, "stroke-dasharray": "8 4" }));
    data.forEach((d) => {
      const x = scale(d.year, minYear, maxYear, pad.l, width - pad.r);
      const yIndex = scale(Number(d.index || 0), 0, idxMax, height - pad.b, pad.t);
      const html = tooltipHtml(`${marketLabel} - ${d.year}`, [
        `${operationLabel}: ${Indicators.money(d[valueKey] || 0)}`,
        `Índice: ${Indicators.fmtNumber.format(d.index)}`,
      ]);
      const node = el("circle", { cx: x, cy: yIndex, r: 4, fill: "#fbbf24", stroke: "#0b1220", "stroke-width": 1 });
      attachTooltip(container, node, html);
      s.appendChild(node);
    });
    const step = Math.max(1, Math.ceil(data.length / 8));
    data.forEach((d, i) => {
      if (i % step === 0 || i === data.length - 1) {
        const x = scale(d.year, minYear, maxYear, pad.l, width - pad.r);
        s.appendChild(el("text", { x, y: height - 18, "text-anchor": "middle", class: "label" }, d.year));
      }
    });
    container.appendChild(s);
  }

  function table(container, rows, columns) {
    container.innerHTML = "";
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tr = document.createElement("tr");
    columns.forEach((c) => {
      const th = document.createElement("th");
      th.textContent = c.label;
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    rows.forEach((row) => {
      const trb = document.createElement("tr");
      columns.forEach((c) => {
        const td = document.createElement("td");
        td.className = c.num ? "num" : "";
        td.textContent = c.format ? c.format(row[c.key], row) : row[c.key];
        trb.appendChild(td);
      });
      tbody.appendChild(trb);
    });
    table.appendChild(tbody);
    container.appendChild(table);
  }

  function downloadSvgAsPng(container, filename) {
    const source = container.querySelector("svg");
    if (!source) return;
    const xml = new XMLSerializer().serializeToString(source);
    const img = new Image();
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = source.viewBox.baseVal.width;
      canvas.height = source.viewBox.baseVal.height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#070b12";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.download = filename;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = url;
  }

  function truncate(text, n) {
    const s = String(text || "Sin dato");
    return s.length > n ? `${s.slice(0, Math.max(0, n - 3))}...` : s;
  }

  return { lineChart, barChart, verticalBars, treemap, heatmap, projectionScenarioChart, projectionChainBars, tradeItcrbChart, tradeIndexChart, table, downloadSvgAsPng };
})();
