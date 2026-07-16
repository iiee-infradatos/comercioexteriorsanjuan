const Filters = (() => {
  const ids = {
    year: "yearFilter",
    operation: "operationFilter",
    rubro: "rubroFilter",
    mining: "miningFilter",
    product: "productFilter",
    gold: "goldFilter",
    ncm: "ncmFilter",
    country: "countryFilter",
    continent: "continentFilter",
    unit: "unitFilter",
  };

  function fillSelect(id, values) {
    const select = document.getElementById(id);
    select.innerHTML = "";
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  }

  function selected(id) {
    return [...document.getElementById(id).selectedOptions].map((o) => o.value);
  }

  function state() {
    return {
      years: selected(ids.year),
      operation: document.getElementById(ids.operation).value,
      rubros: selected(ids.rubro),
      mining: document.getElementById(ids.mining).value,
      products: selected(ids.product),
      gold: document.getElementById(ids.gold).value,
      ncms: selected(ids.ncm),
      countries: selected(ids.country),
      continents: selected(ids.continent),
      unit: document.getElementById(ids.unit).value,
    };
  }

  function reset() {
    Object.values(ids).forEach((id) => {
      const el = document.getElementById(id);
      if (el.multiple) [...el.options].forEach((o) => { o.selected = false; });
    });
    document.getElementById(ids.unit).value = "fob";
    document.getElementById(ids.operation).value = "export";
    document.getElementById(ids.mining).value = "all";
    document.getElementById(ids.gold).value = "all";
  }

  function init(onChange) {
    fillSelect(ids.year, DataLoader.years.map(String));
    fillSelect(ids.rubro, DataLoader.dimensions.rubros);
    fillSelect(ids.product, DataLoader.dimensions.products);
    fillSelect(ids.ncm, DataLoader.dimensions.ncms);
    fillSelect(ids.country, DataLoader.dimensions.countries);
    fillSelect(ids.continent, DataLoader.dimensions.continents);

    Object.values(ids).forEach((id) => document.getElementById(id).addEventListener("change", onChange));
    document.getElementById("periodType").addEventListener("change", onChange);
    document.getElementById("resetFilters").addEventListener("click", () => {
      reset();
      onChange();
    });
  }

  return { init, state, reset };
})();
