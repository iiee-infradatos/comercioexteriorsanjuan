const DataLoader = (() => {
  const raw = window.PROCESSED_DATA || {};
  const projections = window.PROJECTIONS_DATA || {};
  const itcrb = window.ITCRB_DATA || {};
  const records = (raw.records || []).map((d) => ({
    ...d,
    year: Number(d.year),
    month: Number(d.month || 0),
    fob_usd: Number(d.fob_usd || 0),
    fob_millions: Number(d.fob_millions || 0),
    weight: d.weight == null ? null : Number(d.weight),
  }));

  const metadata = raw.metadata || {};
  const pgb = (raw.pgb || []).map((d) => ({
    year: Number(d.year),
    pgb_usd: Number(d.pgb_usd || 0),
    pgb_millions: Number(d.pgb_millions || 0),
  }));
  const pgbByYear = new Map(pgb.map((d) => [d.year, d.pgb_usd]));
  const canonical = (value) => String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("es-AR");
  const miningRubroKey = canonical("C.MINERA");
  const goldProductKey = canonical("Oro p/uso no monetario, formas en bruto de aleación dorada o bullón dorado");
  const unique = (field) => {
    const map = new Map();
    records.map((d) => d[field]).filter(Boolean).forEach((value) => {
      const key = canonical(value);
      if (!map.has(key)) map.set(key, value);
    });
    return [...map.values()].sort((a, b) => String(a).localeCompare(String(b), "es"));
  };
  const years = [...new Set(records.map((d) => d.year).filter(Boolean))].sort((a, b) => a - b);

  function applyFilters(filters) {
    return records.filter((d) => {
      if (filters.years.length && !filters.years.includes(String(d.year))) return false;
      if (filters.operation && filters.operation !== "all" && d.operation !== filters.operation) return false;
      if (filters.rubros.length && !filters.rubros.includes(d.rubro)) return false;
      if (filters.mining === "only" && canonical(d.rubro) !== miningRubroKey) return false;
      if (filters.mining === "exclude" && canonical(d.rubro) === miningRubroKey) return false;
      if (filters.products.length && !filters.products.includes(d.product)) return false;
      if (filters.gold === "only" && canonical(d.product) !== goldProductKey) return false;
      if (filters.gold === "exclude" && canonical(d.product) === goldProductKey) return false;
      if (filters.ncms.length && !filters.ncms.includes(d.ncm)) return false;
      if (filters.countries.length && !filters.countries.includes(d.country)) return false;
      if (filters.continents.length && !filters.continents.includes(d.continent)) return false;
      return true;
    });
  }

  function groupSum(rows, keyFn, valueFn = (d) => d.fob_usd) {
    const map = new Map();
    rows.forEach((d) => {
      const key = keyFn(d);
      const prev = map.get(key) || { key, value: 0, rows: [] };
      prev.value += Number(valueFn(d) || 0);
      prev.rows.push(d);
      map.set(key, prev);
    });
    return [...map.values()];
  }

  function byYear(rows) {
    return groupSum(rows, (d) => d.year).map((d) => ({ year: Number(d.key), value: d.value })).sort((a, b) => a.year - b.year);
  }

  function byField(rows, field) {
    const map = new Map();
    rows.forEach((row) => {
      const raw = row[field] || "Sin dato";
      const key = raw === "Sin dato" ? raw : canonical(raw);
      const prev = map.get(key) || { name: raw, value: 0, rows: [] };
      prev.value += Number(row.fob_usd || 0);
      prev.rows.push(row);
      map.set(key, prev);
    });
    return [...map.values()].sort((a, b) => b.value - a.value);
  }

  function productCountry(rows) {
    return groupSum(rows, (d) => `${d.product || "Sin dato"}|||${d.country || "Sin dato"}`).map((d) => {
      const [product, country] = d.key.split("|||");
      return { product, country, value: d.value };
    });
  }

  return {
    raw,
    projections,
    itcrb,
    records,
    pgb,
    pgbByYear,
    metadata,
    years,
    dimensions: {
      rubros: unique("rubro"),
      products: unique("product"),
      ncms: unique("ncm"),
      countries: unique("country"),
      continents: unique("continent"),
    },
    applyFilters,
    groupSum,
    byYear,
    byField,
    productCountry,
  };
})();

