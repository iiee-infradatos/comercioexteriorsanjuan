const Indicators = (() => {
  const fmtNumber = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
  const fmtMillions = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmtPct = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function money(valueUsd) {
    return `US$ ${fmtMillions.format((valueUsd || 0) / 1_000_000)} millones`;
  }

  function pct(value) {
    if (!Number.isFinite(value)) return "s/d";
    return `${fmtPct.format(value)}%`;
  }

  function yoy(current, previous) {
    if (!previous) return null;
    return ((current - previous) / previous) * 100;
  }

  function share(value, total) {
    if (!total) return 0;
    return (value / total) * 100;
  }

  function hhi(items, total) {
    if (!total) return 0;
    return items.reduce((acc, d) => acc + Math.pow((d.value / total) * 100, 2), 0);
  }

  function countFor80(items, total) {
    let acc = 0;
    for (let i = 0; i < items.length; i += 1) {
      acc += items[i].value;
      if (total && acc / total >= 0.8) return i + 1;
    }
    return items.length;
  }

  function cagr(first, last, years) {
    if (first <= 0 || last <= 0 || years <= 0) return null;
    return (Math.pow(last / first, 1 / years) - 1) * 100;
  }

  function movingAverage(series, windowSize = 3) {
    return series.map((d, i) => {
      const start = Math.max(0, i - windowSize + 1);
      const slice = series.slice(start, i + 1);
      return { ...d, average: slice.reduce((a, x) => a + x.value, 0) / slice.length };
    });
  }

  function summarize(rows) {
    const total = rows.reduce((a, d) => a + d.fob_usd, 0);
    const byYear = DataLoader.byYear(rows).map((d) => {
      const pgb = DataLoader.pgbByYear.get(d.year) || null;
      return { ...d, pgb_usd: pgb, pgb_share: pgb ? share(d.value, pgb) : null };
    });
    const pgbRows = rows.filter((d) => DataLoader.pgbByYear.has(d.year));
    const pgbValue = pgbRows.reduce((acc, d) => acc + d.fob_usd, 0);
    const yearsWithPgb = new Set(pgbRows.map((d) => d.year));
    const totalPgb = [...yearsWithPgb].reduce((acc, year) => acc + (DataLoader.pgbByYear.get(year) || 0), 0);
    const latest = byYear.at(-1);
    const previous = latest ? byYear.find((d) => d.year === latest.year - 1) : null;
    const products = DataLoader.byField(rows, "product");
    const countries = DataLoader.byField(rows, "country");
    const rubros = DataLoader.byField(rows, "rubro");
    const latestRows = latest ? rows.filter((d) => d.year === latest.year) : rows;
    const latestProducts = DataLoader.byField(latestRows, "product");
    const latestCountries = DataLoader.byField(latestRows, "country");
    const topProduct = latestProducts[0] || products[0] || null;
    const topCountry = latestCountries[0] || countries[0] || null;
    const productTop5 = products.slice(0, 5).reduce((a, d) => a + d.value, 0);
    const productTop10 = products.slice(0, 10).reduce((a, d) => a + d.value, 0);
    const countryTop5 = countries.slice(0, 5).reduce((a, d) => a + d.value, 0);
    const countryTop10 = countries.slice(0, 10).reduce((a, d) => a + d.value, 0);
    const max = byYear.reduce((m, d) => (!m || d.value > m.value ? d : m), null);
    const min = byYear.reduce((m, d) => (!m || d.value < m.value ? d : m), null);

    return {
      total,
      totalPgb,
      pgbValue,
      pgbShare: totalPgb ? share(pgbValue, totalPgb) : null,
      byYear,
      latest,
      previous,
      yoy: latest && previous ? yoy(latest.value, previous.value) : null,
      products,
      countries,
      rubros,
      topProduct,
      topCountry,
      counts: {
        products: products.filter((d) => d.name !== "Sin dato").length,
        countries: countries.filter((d) => d.name !== "Sin dato").length,
      },
      concentration: {
        productTop5: share(productTop5, total),
        productTop10: share(productTop10, total),
        productHhi: hhi(products, total),
        productCount80: countFor80(products, total),
        countryTop5: share(countryTop5, total),
        countryTop10: share(countryTop10, total),
        countryHhi: hhi(countries, total),
      },
      trend: {
        max,
        min,
        cagr: byYear.length > 1 ? cagr(byYear[0].value, byYear.at(-1).value, byYear.at(-1).year - byYear[0].year) : null,
        movingAverage: movingAverage(byYear, 3),
      },
      shares: {
        topProduct: topProduct && latest ? share(topProduct.value, latest.value) : share(topProduct?.value || 0, total),
        topCountry: topCountry && latest ? share(topCountry.value, latest.value) : share(topCountry?.value || 0, total),
      },
    };
  }

  return { fmtNumber, money, pct, yoy, share, summarize };
})();
