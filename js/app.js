let currentRows = [];
let currentSummary = null;
let topProducts = 10;

function render() {
  const filters = Filters.state();
  currentRows = DataLoader.applyFilters(filters);
  currentSummary = Indicators.summarize(currentRows);
  renderPeriod(filters);
  renderNotice();
  renderKpis(currentSummary);
  renderInsights(currentSummary);
  renderExecutiveAssessment();
  renderSummaryCharts(currentSummary);
  renderEvolution(currentSummary);
  renderProducts(currentSummary);
  renderDestinations(currentSummary);
  renderAdvanced(currentSummary);
  renderProjections();
  renderItcrbTrade();
  renderMethodology();
}

function renderPeriod(filters) {
  const years = filters.years.length ? filters.years.join(", ") : `${DataLoader.years[0]}-${DataLoader.years.at(-1)}`;
  document.getElementById("periodLabel").textContent = `Periodo seleccionado: ${years}. Fuente: archivos locales procesados.`;
}

function renderNotice() {
  const notice = document.getElementById("availabilityNotice");
  notice.textContent = "Las bases disponibles son anuales. Exportaciones usan valor U$S FOB e importaciones usan valor U$S CIF.";
}

function kpi(title, value, meta, delta, tip, deltaText = null) {
  const cls = delta == null ? "" : delta >= 0 ? "pos" : "neg";
  const deltaValue = delta == null ? "" : (deltaText || `Var. i.a. ${Indicators.pct(delta)}`);
  return `<article class="kpi-card" title="${tip}">
    <small>${title}</small>
    <strong>${value}</strong>
    <div class="meta">${meta}</div>
    <div class="delta ${cls}">${deltaValue}</div>
  </article>`;
}

function renderKpis(s) {
  const label = operationLabel(Filters.state().operation).toLowerCase();
  const countryTitle = Filters.state().operation === "import" ? "Principal origen" : "Principal pais";
  const latestMeta = s.latest ? `${s.latest.year}` : "s/d";
  const latestValue = s.latest ? Indicators.money(s.latest.value) : "s/d";
  const latestComparison = s.latest && s.previous ? `Var. i.a. ${s.latest.year} vs ${s.previous.year}: ${Indicators.pct(s.yoy)}` : null;
  const totalMeta = currentRows.length ? "Periodo filtrado" : "Sin datos";
  const html = [
    kpi(`${capitalize(label)} ${latestMeta}`, latestValue, "Ultimo anio disponible", s.yoy, "Valor en dolares del ultimo anio disponible dentro de la seleccion.", latestComparison),
    kpi(`${capitalize(label)} acumuladas`, Indicators.money(s.total), totalMeta, null, "Suma en dolares de todos los anios incluidos en los filtros."),
    kpi("Principal producto", s.topProduct?.name || "s/d", `${Indicators.pct(s.shares.topProduct)} del ultimo periodo`, null, "Producto con mayor valor en el ultimo anio disponible de la seleccion."),
    kpi(countryTitle, s.topCountry?.name || "s/d", `${Indicators.pct(s.shares.topCountry)} del ultimo periodo`, null, "Pais con mayor valor en el ultimo anio disponible de la seleccion."),
    kpi("Productos exportados", Indicators.fmtNumber.format(s.counts.products), "Con valor FOB positivo", null, "Cantidad de productos distintos con registros en la seleccion."),
    kpi("Paises destino", Indicators.fmtNumber.format(s.counts.countries), "Con valor FOB positivo", null, "Cantidad de paises distintos con registros en la seleccion."),
    kpi("Top 5 productos", Indicators.pct(s.concentration.productTop5), "Concentracion", null, "Participacion de los cinco productos principales."),
    kpi("Top 5 destinos", Indicators.pct(s.concentration.countryTop5), "Concentracion geografica", null, "Participacion de los cinco paises principales."),
    kpi("HHI productos", Indicators.fmtNumber.format(s.concentration.productHhi), "Indice Herfindahl", null, "Suma de participaciones al cuadrado; valores mas altos indican mayor concentración."),
    kpi("Productos para 80%", Indicators.fmtNumber.format(s.concentration.productCount80), "Diversificacion", null, "Cantidad minima de productos que acumula al menos 80% del valor exportado."),
    kpi("% del PGB", s.pgbShare == null ? "s/d" : Indicators.pct(s.pgbShare), "Años con PGB disponible", null, "Valor monetario seleccionado sobre PGB USD San Juan disponible."),
  ];
  document.getElementById("kpiGrid").innerHTML = html.join("");
}

function renderInsights(s) {
  const label = operationLabel(Filters.state().operation).toLowerCase();
  const countryTerm = Filters.state().operation === "import" ? "origen" : "pais";
  const yoyScope = productYoyTopScope(s);
  const productYoy = yoyScope.rows.filter((d) => Number.isFinite(d.yoy)).sort((a, b) => b.yoy - a.yoy);
  const growth = productYoy[0];
  const fall = productYoy.filter((d) => d.yoy < 0).sort((a, b) => a.yoy - b.yoy)[0];
  const scopeLabel = `Top ${yoyScope.limit}`;
  const lines = [
    `Las ${label} de San Juan alcanzaron ${Indicators.money(s.total)} durante el periodo seleccionado.`,
    s.yoy == null ? "No hay comparación interanual equivalente para la seleccion actual." : `El ultimo anio disponible registro una variacion interanual de ${Indicators.pct(s.yoy)}.`,
    s.topProduct ? `El principal producto del ultimo periodo disponible fue ${s.topProduct.name}, con una participacion de ${Indicators.pct(s.shares.topProduct)}.` : "No se identifico producto principal para la seleccion.",
    s.topCountry ? `El principal ${countryTerm} del ultimo periodo disponible fue ${s.topCountry.name}, con una participacion de ${Indicators.pct(s.shares.topCountry)}.` : "No se identifico pais principal para la seleccion.",
    `Los cinco principales productos concentraron ${Indicators.pct(s.concentration.productTop5)} del total.`,
    growth ? `El mayor crecimiento interanual entre productos del ${scopeLabel} se observo en ${growth.name}: ${Indicators.pct(growth.yoy)}.` : `No hay suficientes datos para identificar el mayor crecimiento interanual dentro del ${scopeLabel}.`,
    fall ? `La principal caida interanual entre productos del ${scopeLabel} correspondio a ${fall.name}: ${Indicators.pct(fall.yoy)}.` : `No se registro una caida interanual entre productos del ${scopeLabel} con comparacion disponible.`,
  ];
  document.getElementById("insights").innerHTML = lines.map((x) => `<p>${x}</p>`).join("");
}

function renderExecutiveAssessment() {
  const container = document.getElementById("executiveAssessmentText");
  if (!container) return;
  const filters = Filters.state();
  const exportRows = rowsForOperation("export");
  const importRows = rowsForOperation("import");
  const exportSummary = Indicators.summarize(exportRows);
  const importSummary = Indicators.summarize(importRows);
  const activeLabel = operationLabel(filters.operation).toLowerCase();
  const period = filters.years.length ? filters.years.join(", ") : `${DataLoader.years[0]}-${DataLoader.years.at(-1)}`;

  container.innerHTML = `
    ${assessmentIntro(activeLabel, period, exportSummary, importSummary)}
    ${recentExportsSection(exportRows, exportSummary)}
    ${productAssessmentSection(exportRows, exportSummary)}
    ${destinationAssessmentSection(exportRows, exportSummary)}
    ${fxPassThroughSection(exportRows)}
    ${forecastSection(exportRows, "export")}
    ${concentrationAssessmentSection(exportSummary)}
    ${dependencySection(exportRows, exportSummary)}
    ${miningSection(exportRows)}
    ${agroSection(exportRows)}
    ${importsAssessmentSection(importRows, importSummary)}
    ${forecastSection(importRows, "import")}
    ${tradeRiskSection(exportRows, exportSummary)}
    ${opportunitiesSection(exportRows, exportSummary)}
    ${executiveConclusionsSection(exportRows, exportSummary, importRows, importSummary)}
  `;
}

function rowsForOperation(operation) {
  const state = { ...Filters.state(), operation };
  return DataLoader.applyFilters(state);
}

function assessmentIntro(activeLabel, period, exportSummary, importSummary) {
  return reportSection("Executive Summary", [
    `Este assessment utiliza exclusivamente los registros filtrados en la aplicacion para el periodo ${period}. La seleccion activa del tablero corresponde a ${activeLabel}, pero este informe incorpora, cuando existen datos, una lectura especifica de exportaciones e importaciones para separar el perfil de generacion externa de divisas de la estructura de abastecimiento externo.`,
    `En la muestra exportadora filtrada, el valor acumulado alcanza ${Indicators.money(exportSummary.total)} y el ultimo anio disponible registra ${exportSummary.latest ? Indicators.money(exportSummary.latest.value) : "s/d"}. La participacion sobre PGB es ${exportSummary.pgbShare == null ? "s/d" : Indicators.pct(exportSummary.pgbShare)}. La concentracion de los cinco principales productos es ${Indicators.pct(exportSummary.concentration.productTop5)} y la de los cinco principales destinos es ${Indicators.pct(exportSummary.concentration.countryTop5)}.`,
    `La lectura ejecutiva debe interpretarse como un diagnostico de estructura, concentracion y resiliencia comercial. No incorpora proyecciones numericas ni atribuciones causales no observables en los datos. Las referencias conceptuales sobre pass-through cambiario, commodities y transicion energetica se presentan como marco de analisis y se diferencian de los resultados calculados por la aplicacion.`,
  ], [], [
    `Exportaciones filtradas: ${Indicators.money(exportSummary.total)}.`,
    `Importaciones filtradas: ${Indicators.money(importSummary.total)}.`,
    `HHI productos exportados: ${Indicators.fmtNumber.format(exportSummary.concentration.productHhi)}.`,
  ]);
}

function recentExportsSection(rows, s) {
  const recent = lastNYears(s.byYear, 5);
  const recentRows = rows.filter((d) => recent.some((x) => x.year === d.year));
  const recentSummary = Indicators.summarize(recentRows);
  const avg = recent.length ? recent.reduce((a, d) => a + d.value, 0) / recent.length : 0;
  const latestVsAvg = s.latest && avg ? Indicators.share(s.latest.value - avg, avg) : null;
  const rubroChange = shareChangesByField(recentRows, "rubro");
  const gainers = rubroChange.slice().sort((a, b) => b.delta - a.delta).slice(0, 3);
  const losers = rubroChange.slice().sort((a, b) => a.delta - b.delta).slice(0, 3);
  return reportSection("1. Evolucion reciente de las exportaciones", [
    `Durante los ultimos cinco anios disponibles de la seleccion, las exportaciones muestran un valor acumulado de ${Indicators.money(recentSummary.total)}. El ultimo anio disponible se ubica ${latestVsAvg == null ? "sin comparacion robusta frente" : `${Indicators.pct(latestVsAvg)} respecto`} al promedio de esos cinco anios, una medida util para diferenciar un desempenio de cierre de periodo de la tendencia reciente.`,
    `La tasa anual acumulativa de la seleccion completa es ${s.trend.cagr == null ? "s/d" : Indicators.pct(s.trend.cagr)}. El maximo historico dentro del filtro fue ${s.trend.max ? `${Indicators.money(s.trend.max.value)} en ${s.trend.max.year}` : "s/d"}, mientras que el minimo fue ${s.trend.min ? `${Indicators.money(s.trend.min.value)} en ${s.trend.min.year}` : "s/d"}. La variacion interanual del ultimo anio disponible es ${s.yoy == null ? "s/d" : Indicators.pct(s.yoy)}.`,
    `La composicion sectorial indica que ${listNames(gainers)} ganaron participacion relativa en la ventana reciente, mientras que ${listNames(losers)} redujeron su peso. El analisis interpreta cambios observados en valores FOB y evita atribuciones causales que no surjan de los datos disponibles.`,
  ], [
    ["Indicador", "Valor"],
    ["Ultimo anio disponible", s.latest ? `${s.latest.year} - ${Indicators.money(s.latest.value)}` : "s/d"],
    ["Promedio ultimos cinco anios", avg ? Indicators.money(avg) : "s/d"],
    ["Diferencia ultimo anio vs promedio", latestVsAvg == null ? "s/d" : Indicators.pct(latestVsAvg)],
    ["% sobre PGB", s.pgbShare == null ? "s/d" : Indicators.pct(s.pgbShare)],
  ], [
    `La evolucion reciente esta condicionada por la composicion de productos de mayor participacion.`,
    `La participacion sobre PGB sugiere el peso macroeconomico del sector externo provincial.`,
    `Los cambios de participacion sectorial ayudan a distinguir expansion concentrada de diversificacion efectiva.`,
  ]);
}

function productAssessmentSection(rows, s) {
  const top10 = s.products.slice(0, 10);
  const top20 = s.products.slice(0, 20);
  const yoy = yoyByFieldForRows(rows, "product");
  const rank = rankChanges(rows, "product");
  const volatility = volatilityByField(rows, "product");
  const emergent = rank.filter((d) => d.previousRank == null && d.currentRank <= 20).slice(0, 5);
  const retreat = rank.filter((d) => d.previousRank && d.currentRank && d.currentRank > d.previousRank).slice(0, 5);
  const topYoy = yoy.filter((d) => Number.isFinite(d.yoy)).sort((a, b) => b.yoy - a.yoy).slice(0, 5);
  return reportSection("2. Exportaciones por producto", [
    `El Top 10 de productos concentra ${Indicators.pct(Indicators.share(sum(top10), s.total))}; el Top 20 concentra ${Indicators.pct(Indicators.share(sum(top20), s.total))}. Esta configuracion es relevante para inversionistas porque una canasta concentrada amplifica la exposicion a precios internacionales, regulaciones sectoriales y continuidad operativa de pocos complejos productivos.`,
    `El producto lider es ${s.products[0]?.name || "s/d"}, con ${s.products[0] ? Indicators.pct(Indicators.share(s.products[0].value, s.total)) : "s/d"} del valor filtrado. Los productos con mayor crecimiento interanual observado dentro de la seleccion son ${listNames(topYoy)}, sujeto a que exista comparacion equivalente contra el anio previo.`,
    `Los cambios de ranking permiten distinguir productos emergentes de movimientos meramente proporcionales. En la seleccion actual, los emergentes identificados son ${listNames(emergent)}, mientras que los productos en retroceso relativo incluyen ${listNames(retreat)}.`,
  ], [
    ["Producto", "Participacion", "Var. i.a.", "Cambio ranking"],
    ...top10.map((d) => {
      const y = yoy.find((x) => x.name === d.name);
      const r = rank.find((x) => x.name === d.name);
      return [d.name, Indicators.pct(Indicators.share(d.value, s.total)), y?.yoy == null ? "s/d" : Indicators.pct(y.yoy), rankingText(r)];
    }),
  ], [
    `La estructura por producto mantiene un perfil intensivo en recursos naturales cuando los primeros productos explican una porcion elevada del total.`,
    `La volatilidad mas alta se observa en ${listNames(volatility.slice(0, 3))}, lo que puede reflejar sensibilidad a precios, ciclos productivos o mercados puntuales.`,
    `Los productos mas estables son ${listNames(volatility.slice().reverse().slice(0, 3))}, aunque estabilidad en valores no implica necesariamente estabilidad en margenes.`,
  ]);
}

function destinationAssessmentSection(rows, s) {
  const rank = rankChanges(rows, "country");
  const top = s.countries.slice(0, 10);
  const strategic = top.slice(0, 5);
  return reportSection("3. Exportaciones por destino", [
    `Los principales compradores concentran una parte sustantiva del comercio: Top 5 destinos ${Indicators.pct(s.concentration.countryTop5)} y Top 10 destinos ${Indicators.pct(s.concentration.countryTop10)}. El HHI geografico es ${Indicators.fmtNumber.format(s.concentration.countryHhi)}, lo que permite evaluar dependencia comercial por mercado.`,
    `El principal destino es ${s.countries[0]?.name || "s/d"}, con ${s.countries[0] ? Indicators.pct(Indicators.share(s.countries[0].value, s.total)) : "s/d"} del total filtrado. Desde una perspectiva de riesgo, una exposicion elevada a pocos mercados puede aumentar la sensibilidad frente a cambios regulatorios, logisticos o de demanda en esas contrapartes.`,
    `Los mercados estrategicos de la muestra son ${listNames(strategic)}. Los nuevos destinos del ultimo anio frente al anio previo son ${newDestinations()}, mientras que los destinos sin registro reciente son ${lostDestinations()}.`,
  ], [
    ["Destino", "Participacion", "Cambio ranking"],
    ...top.map((d) => [d.name, Indicators.pct(Indicators.share(d.value, s.total)), rankingText(rank.find((x) => x.name === d.name))]),
  ], [
    `La diversificacion geografica reduce riesgo de contraparte, pero no elimina exposicion si los productos enviados siguen concentrados.`,
    `La dependencia de destinos vinculados a commodities debe leerse junto con la concentracion por producto.`,
    `La apertura de nuevos mercados es positiva solo si gana escala y continuidad en el tiempo.`,
  ]);
}

function fxPassThroughSection(rows) {
  const rubros = DataLoader.byField(rows, "rubro");
  return reportSection("4. Impacto potencial del tipo de cambio sobre las exportaciones provinciales", [
    `De acuerdo con la literatura sobre pass-through, incluida la referencia conceptual del Consejo Federal de Inversiones mencionada para este trabajo, una devaluacion no se traslada mecanicamente a competitividad exportadora. El efecto depende del traslado a precios internos, la estructura de costos, el contenido importado, la inflacion, la logistica y el comportamiento del tipo de cambio real.`,
    `Aplicado a San Juan, el resultado podria diferir por cadena. La mineria suele estar mas asociada a precios internacionales y contratos denominados en moneda dura; la agroindustria y la vitivinicultura pueden capturar mejoras competitivas si los costos domesticos no ajustan al mismo ritmo, aunque dependen de envases, energia, financiamiento, logistica e insumos transables. Olivicultura, ajo, uva, mosto y cal combinan exposicion a costos locales con restricciones de escala, calidad, fletes y demanda externa.`,
    `En la muestra filtrada, las cadenas con mayor peso son ${listNames(rubros.slice(0, 5))}. Esa composicion es consistente con una respuesta heterogenea al tipo de cambio: no corresponde inferir elasticidades ni efectos cuantitativos sin series de precios, costos, cantidades y tipo de cambio real por cadena.`,
  ], [
    ["Cadena", "Lectura cualitativa"],
    ["Mineria", "Mayor sensibilidad a precios internacionales; mejora cambiaria condicionada por costos, retenciones, regulacion y ciclo de proyectos."],
    ["Vitivinicultura y mosto", "Podria ganar competitividad si costos domesticos rezagan; depende de envases, energia, fletes y demanda externa."],
    ["Olivicultura, uva, ajo", "Efecto condicionado por costos laborales, logistica, sanidad, estacionalidad y acceso a mercados."],
    ["Cal", "Potencialmente vinculada a demanda regional, energia, transporte y costos industriales."],
  ], [
    `El pass-through puede erosionar rapidamente una mejora nominal si la inflacion ajusta costos internos.`,
    `El contenido importado reduce el beneficio neto de una devaluacion.`,
    `Las cadenas con precios internacionales pueden mejorar ingresos en moneda local, pero no necesariamente volumen exportado.`,
  ]);
}

function forecastSection(rows, operation) {
  const label = operation === "import" ? "importaciones" : "exportaciones";
  const projection = projectionWindow(operation, 2026, 2028);
  const projectText = operation === "export"
    ? "La expansion de proyectos cupriferos, la demanda mundial de cobre asociada a la transicion energetica, los precios del oro y la continuidad de mercados agroindustriales son factores ampliamente reconocidos a monitorear."
    : "La trayectoria de importaciones dependera de nivel de actividad, inversion, contenido importado de proyectos productivos, disponibilidad de divisas y condiciones financieras.";
  const title = operation === "import" ? "11. Pronostico importaciones 2026-2028" : "5. Pronostico exportaciones 2026-2028";
  if (!projection.rows.length) {
    return reportSection(title, [
      `La aplicacion no encontro resultados estadisticos 2026-2028 para ${label} en el archivo procesado de proyecciones. La lectura se mantiene cualitativa y no incorpora cifras inventadas.`,
      `${projectText} La interpretacion debe actualizarse cuando existan nuevos datos efectivos o proyecciones verificables en la carpeta fuente.`,
    ], [
      ["Escenario", "Lectura cualitativa"],
      ["Base", `Continuidad de la estructura reciente de ${label}, condicionada por los principales productos y destinos observados.`],
      ["Optimista", operation === "export" ? "Mayor traccion minera, precios internacionales favorables y ampliacion de mercados agroindustriales." : "Importaciones asociadas a inversion productiva y normalizacion de abastecimiento externo."],
      ["Conservador", operation === "export" ? "Menor dinamismo de commodities, restricciones logisticas o perdida de mercados puntuales." : "Restricciones de divisas, menor inversion o sustitucion por menor demanda interna."],
    ], [
      `El escenario base preserva la estructura observada, no una meta oficial.`,
      `Los factores externos deben monitorearse junto con concentracion y continuidad de destinos.`,
      `La interpretacion financiera debe leerse junto con la pestaña Proyecciones.`,
    ]);
  }
  return reportSection(title, [
    `La pestaña Proyecciones incorpora un ejercicio estadistico por cadena hasta 2035. Para el tramo 2026-2028, el escenario base de ${label} pasa de ${projection.first ? Indicators.money(projection.first.base) : "s/d"} en 2026 a ${projection.last ? Indicators.money(projection.last.base) : "s/d"} en 2028, con una variacion acumulada de ${projection.growth == null ? "s/d" : Indicators.pct(projection.growth)}.`,
    `Los escenarios optimista y conservador son bandas mecanicas derivadas del error historico del modelo por cadena. No representan objetivos oficiales ni incorporan supuestos externos adicionales de precios, produccion o politica cambiaria.`,
    `${projectText} La lectura debe actualizarse cuando existan datos efectivos o presupuestos/proyecciones verificables en la carpeta fuente.`,
  ], [
    ["Anio", "Conservador", "Base", "Optimista"],
    ...projection.rows.map((d) => [d.year, Indicators.money(d.conservative), Indicators.money(d.base), Indicators.money(d.optimistic)]),
  ], [
    `El escenario base se deriva del modelo estadistico incorporado en la pestaña Proyecciones.`,
    `La banda de escenarios refleja volatilidad historica estimada, no shocks discrecionales.`,
    `La lectura 2026-2028 debe evaluarse junto con concentracion por cadena y sensibilidad al ITCRM.`,
  ]);
}

function concentrationAssessmentSection(s) {
  const pLevel = riskLevel(s.concentration.productHhi, 2500, 1500);
  const gLevel = riskLevel(s.concentration.countryHhi, 2500, 1500);
  return reportSection("6. Concentracion exportadora", [
    `La concentracion exportadora es uno de los principales determinantes del riesgo comercial. En la seleccion actual, el HHI de productos es ${Indicators.fmtNumber.format(s.concentration.productHhi)} y el HHI geografico es ${Indicators.fmtNumber.format(s.concentration.countryHhi)}.`,
    `El Top 5 de productos concentra ${Indicators.pct(s.concentration.productTop5)} y el Top 10 concentra ${Indicators.pct(s.concentration.productTop10)}. En destinos, el Top 5 representa ${Indicators.pct(s.concentration.countryTop5)} y el Top 10 ${Indicators.pct(s.concentration.countryTop10)}.`,
  ], [
    ["Factor", "Nivel", "Justificacion", "Implicancias"],
    ["Productos", semaphore(pLevel), `HHI ${Indicators.fmtNumber.format(s.concentration.productHhi)}; Top 5 ${Indicators.pct(s.concentration.productTop5)}.`, "Mayor sensibilidad a productos lideres y precios sectoriales."],
    ["Destinos", semaphore(gLevel), `HHI ${Indicators.fmtNumber.format(s.concentration.countryHhi)}; Top 5 ${Indicators.pct(s.concentration.countryTop5)}.`, "Exposicion a demanda, regulacion y logistica de pocos mercados."],
    ["Diversificacion", semaphore(s.concentration.productCount80 <= 5 ? "alto" : s.concentration.productCount80 <= 12 ? "medio" : "bajo"), `${s.concentration.productCount80} productos explican 80% del total.`, "Menor cantidad implica mayor dependencia operativa."],
  ], [
    `La concentracion no es negativa per se, pero aumenta sensibilidad ante shocks idiosincraticos.`,
    `La lectura para credito subnacional debe ponderar estabilidad historica y profundidad de mercados compradores.`,
    `La diversificacion sectorial y geografica opera como mitigante parcial.`,
  ]);
}

function dependencySection(rows, s) {
  return reportSection("7. Dependencia comercial", [
    `La dependencia comercial se observa en cinco dimensiones: producto, cadena, pais, cliente/contraparte y logistica. La aplicacion no contiene clientes individuales, por lo que la contraparte se aproxima por pais de destino y producto.`,
    `La dependencia por producto esta liderada por ${s.products[0]?.name || "s/d"}; por cadena, por ${s.rubros[0]?.name || "s/d"}; y por pais, por ${s.countries[0]?.name || "s/d"}. Este patron puede implicar riesgos de concentracion, regulatorios o logisticos si no existen mercados alternativos de escala similar.`,
  ], [
    ["Dimension", "Principal exposicion", "Lectura"],
    ["Producto", s.products[0]?.name || "s/d", s.products[0] ? Indicators.pct(Indicators.share(s.products[0].value, s.total)) : "s/d"],
    ["Cadena", s.rubros[0]?.name || "s/d", s.rubros[0] ? Indicators.pct(Indicators.share(s.rubros[0].value, s.total)) : "s/d"],
    ["Pais", s.countries[0]?.name || "s/d", s.countries[0] ? Indicators.pct(Indicators.share(s.countries[0].value, s.total)) : "s/d"],
  ], [
    `El riesgo logistico depende de corredores, fletes y continuidad operativa, variables no disponibles en la base.`,
    `El riesgo geopolitico se aproxima por concentracion geografica, no por eventos externos especificos.`,
    `La dependencia por cadena debe leerse junto con la capacidad de generar divisas y su peso sobre PGB.`,
  ]);
}

function miningSection(rows) {
  const mining = rows.filter((d) => d.rubro === "C.MINERA");
  const s = Indicators.summarize(mining);
  const total = rows.reduce((a, d) => a + d.fob_usd, 0);
  return reportSection("8. Exportaciones mineras", [
    `La mineria representa ${Indicators.pct(Indicators.share(s.total, total))} del valor exportado filtrado. Su principal producto es ${s.products[0]?.name || "s/d"} y su principal destino es ${s.countries[0]?.name || "s/d"}.`,
    `Desde una perspectiva crediticia, la mineria puede fortalecer la generacion de divisas, pero tambien introduce exposicion a precios internacionales, concentracion operativa y ciclos de proyectos. En San Juan, la lectura es consistente con una estructura donde el complejo minero tiene capacidad de incidir en el desempeno agregado.`,
  ], [
    ["Indicador minero", "Valor"],
    ["Exportaciones mineras", Indicators.money(s.total)],
    ["Participacion sobre total filtrado", Indicators.pct(Indicators.share(s.total, total))],
    ["HHI productos mineros", Indicators.fmtNumber.format(s.concentration.productHhi)],
    ["Top destino minero", s.countries[0]?.name || "s/d"],
  ], [
    `La exposicion minera incrementa sensibilidad a commodities.`,
    `La concentracion puede ser compatible con escala exportadora elevada, pero requiere monitoreo.`,
    `La sostenibilidad del flujo minero debe monitorearse junto con continuidad operativa, destinos y evolucion de precios de referencia.`,
  ]);
}

function agroSection(rows) {
  const terms = ["vino", "mosto", "pasa", "uva", "ajo", "oliva", "cal"];
  const groups = terms.map((term) => {
    const subset = rows.filter((d) => String(d.product || "").toLocaleLowerCase("es-AR").includes(term));
    return { name: term, value: subset.reduce((a, d) => a + d.fob_usd, 0), rows: subset };
  }).filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  const total = rows.reduce((a, d) => a + d.fob_usd, 0);
  return reportSection("9. Exportaciones agroindustriales e industriales seleccionadas", [
    `La seleccion agroindustrial e industrial considerada incluye vino, mosto, pasas, uva fresca, ajo, aceite de oliva, cal y otros productos identificables por descripcion. En conjunto, estos rubros observables representan ${Indicators.pct(Indicators.share(sum(groups), total))} del total filtrado.`,
    `Estos complejos suelen aportar diversificacion frente a la concentracion minera, aunque su escala individual puede ser menor y su desempeno depende de calidad, acceso a mercados, costos logisticos, demanda externa y condiciones sanitarias o regulatorias.`,
  ], [
    ["Complejo", "Valor", "Participacion"],
    ...groups.map((d) => [capitalize(d.name), Indicators.money(d.value), Indicators.pct(Indicators.share(d.value, total))]),
  ], [
    `La agroindustria puede actuar como mitigante parcial de concentracion si sostiene continuidad de mercados.`,
    `La cal combina rasgos industriales y de recurso natural; su lectura debe separarse de alimentos y bebidas.`,
    `La comparacion requiere cuidado porque los grupos se identifican por texto de producto, no por una taxonomia externa adicional.`,
  ]);
}

function importsAssessmentSection(rows, s) {
  return reportSection("10. Importaciones", [
    `Las importaciones filtradas alcanzan ${Indicators.money(s.total)}. El principal producto importado es ${s.products[0]?.name || "s/d"} y el principal pais de origen/procedencia es ${s.countries[0]?.name || "s/d"}.`,
    `La estructura importadora permite evaluar dependencias de abastecimiento. Una concentracion elevada puede indicar exposicion a pocos proveedores o insumos especificos; una estructura mas diversificada puede reducir dependencia puntual, aunque tambien refleja mayor complejidad de cadenas productivas.`,
  ], [
    ["Indicador", "Valor"],
    ["Top 5 productos importados", Indicators.pct(s.concentration.productTop5)],
    ["Top 10 productos importados", Indicators.pct(s.concentration.productTop10)],
    ["Top 5 paises de origen", Indicators.pct(s.concentration.countryTop5)],
    ["HHI productos importados", Indicators.fmtNumber.format(s.concentration.productHhi)],
  ], [
    `Las importaciones deben analizarse como potencial demanda de insumos, bienes de capital o consumo, segun producto.`,
    `La composicion por producto permite identificar dependencias de abastecimiento sin forzar una clasificacion economica adicional.`,
    `La dependencia externa de insumos puede moderar los beneficios netos de una devaluacion.`,
  ]);
}

function tradeRiskSection(rows, s) {
  const volatility = volatilityByField(rows, "product")[0];
  const itcrb = tradeItcrbRiskSummary(rowsForOperation("export"), rowsForOperation("import"));
  return reportSection("12. Trade Risk Assessment", [
    `El perfil de riesgo comercial combina concentracion sectorial, concentracion geografica, dependencia de commodities, logistica, volatilidad y diversificacion. La clasificacion siguiente es automatica y se basa en umbrales prudenciales simples sobre HHI, participaciones y cantidad de productos para 80% del total.`,
    `La pestaña Exportaciones, importaciones e ITCRB agrega una lectura de tipo de cambio real bilateral: ${itcrb.narrative}`,
  ], [
    ["Riesgo", "Nivel", "Justificacion", "Posibles mitigantes"],
    ["Concentracion sectorial", semaphore(riskLevel(s.concentration.productHhi, 2500, 1500)), `HHI productos ${Indicators.fmtNumber.format(s.concentration.productHhi)}.`, "Mayor diversificacion de productos y cadenas."],
    ["Concentracion geografica", semaphore(riskLevel(s.concentration.countryHhi, 2500, 1500)), `HHI destinos ${Indicators.fmtNumber.format(s.concentration.countryHhi)}.`, "Apertura de mercados y continuidad comercial."],
    ["Dependencia de commodities", semaphore(s.products[0] && Indicators.share(s.products[0].value, s.total) > 40 ? "alto" : "medio"), `Producto lider ${s.products[0]?.name || "s/d"}.`, "Mayor valor agregado y canasta agroindustrial."],
    ["Sensibilidad ITCRB/comercio", semaphore(itcrb.level), itcrb.justification, "Diversificar mercados y monitorear competitividad bilateral frente a socios relevantes."],
    ["Volatilidad", semaphore(volatility?.cv > 0.6 ? "alto" : volatility?.cv > 0.3 ? "medio" : "bajo"), `${volatility?.name || "s/d"} registra alta variabilidad relativa.`, "Contratos, mercados alternativos y diversificacion."],
    ["Diversificacion", semaphore(s.concentration.productCount80 <= 5 ? "alto" : "medio"), `${s.concentration.productCount80} productos explican 80%.`, "Profundizar productos secundarios con escala."],
  ], [
    `La matriz de riesgo no reemplaza un rating, pero ordena exposiciones comerciales observables.`,
    `La lectura ITCRB identifica si el comercio filtrado esta concentrado en pocos socios con indice bilateral disponible.`,
    `Los mitigantes dependen de continuidad de inversiones, infraestructura y acceso a mercados.`,
    `La concentracion puede convivir con fortaleza exportadora si los productos lideres son competitivos y liquidos internacionalmente.`,
  ]);
}

function opportunitiesSection(rows, s) {
  return reportSection("13. Strategic Opportunities", [
    `Las oportunidades estrategicas se desprenden de la estructura observada y de factores ampliamente reconocidos: expansion minera, demanda mundial de cobre vinculada a la transicion energetica, precios del oro, continuidad agroindustrial y diversificacion de mercados.`,
    `En la muestra, los productos secundarios y destinos no lideres son relevantes para evaluar diversificacion. La oportunidad no se define por una proyeccion numerica, sino por la posibilidad de que segmentos con presencia exportadora ganen escala y continuidad.`,
  ], [
    ["Oportunidad", "Evidencia en datos", "Implicancia"],
    ["Diversificacion de productos", `${s.concentration.productCount80} productos explican 80%.`, "Reducir dependencia de pocos bienes."],
    ["Nuevos mercados", newDestinations(), "Ampliar contrapartes si se sostiene en el tiempo."],
    ["Mayor PGB exportador", s.pgbShare == null ? "s/d" : Indicators.pct(s.pgbShare), "Aumentar peso externo sin deteriorar concentracion."],
    ["Agroindustria", listNames(DataLoader.byField(rows, "product").filter((d) => /vino|mosto|uva|ajo|oliva|pasa/i.test(d.name)).slice(0, 5)), "Atenuar dependencia minera con productos regionales."],
  ], [
    `La expansion minera podria elevar escala exportadora si se materializan proyectos y demanda externa.`,
    `Los nuevos mercados son oportunidad solo si reducen concentracion y no sustituyen destinos equivalentes.`,
    `La sofisticacion requiere mayor valor agregado observable en productos exportados.`,
  ]);
}

function executiveConclusionsSection(exportRows, s, importRows, importSummary) {
  return reportSection("14. Executive Conclusions", [
    `La estructura comercial de San Juan presenta fortalezas asociadas a escala exportadora en productos lideres, participacion sobre PGB y presencia en mercados externos relevantes. Al mismo tiempo, la concentracion por producto y destino exige monitoreo para evaluar resiliencia ante shocks de precios, demanda, regulacion o logistica.`,
    `Desde una perspectiva similar a la utilizada por inversionistas institucionales y agencias de riesgo, el punto central no es solo el valor exportado, sino la calidad de esa generacion externa: estabilidad, diversificacion, liquidez de mercados compradores, dependencia de commodities y capacidad de sostener flujos aun en escenarios adversos.`,
    `Las importaciones, por su parte, deben leerse como indicador de dependencia externa y potencial demanda de insumos o bienes de capital. Sin clasificacion adicional, no corresponde inferir automaticamente fragilidad; si corresponde monitorear concentracion de proveedores, tipo de productos importados y sensibilidad al tipo de cambio.`,
  ], [
    ["Dimension", "Lectura ejecutiva"],
    ["Fortalezas", `Escala exportadora acumulada de ${Indicators.money(s.total)} y producto lider con mercados internacionales.`],
    ["Debilidades", `Top 5 productos ${Indicators.pct(s.concentration.productTop5)} y Top 5 destinos ${Indicators.pct(s.concentration.countryTop5)}.`],
    ["Oportunidades", "Mineria, diversificacion agroindustrial, nuevos mercados y mayor profundidad exportadora."],
    ["Riesgos", "Commodities, concentracion geografica, logistica, volatilidad y pass-through cambiario incompleto."],
    ["Factores a monitorear", "PGB exportador, HHI, ranking de productos, continuidad de destinos, importaciones de insumos y precios internacionales."],
  ], [
    `La sostenibilidad exportadora dependera de combinar escala minera con diversificacion real.`,
    `La mejora cambiaria potencial no debe confundirse con mejora competitiva permanente.`,
    `La calidad crediticia del perfil comercial mejora cuando las exportaciones crecen sin elevar excesivamente concentracion.`,
  ]);
}

function reportSection(title, paragraphs, tableRows = [], insights = []) {
  const table = tableRows.length ? `<table class="assessment-table"><tbody>${tableRows.map((row, i) => `<tr>${row.map((cell) => `<${i === 0 ? "th" : "td"}>${cell}</${i === 0 ? "th" : "td"}>`).join("")}</tr>`).join("")}</tbody></table>` : "";
  const insightHtml = insights.length ? `<div class="assessment-insights"><strong>Insights destacados</strong>${insights.map((d) => `<p>✓ ${d}</p>`).join("")}</div>` : "";
  return `<section class="assessment-section"><h3>${title}</h3>${paragraphs.map((p) => `<p>${p}</p>`).join("")}${table}${insightHtml}</section>`;
}

function lastNYears(series, n) {
  return series.slice(-n);
}

function sum(items) {
  return items.reduce((a, d) => a + (d.value || 0), 0);
}

function listNames(items) {
  const names = (items || []).map((d) => d.name).filter(Boolean).slice(0, 5);
  return names.length ? names.join(", ") : "s/d";
}

function yoyByFieldForRows(rows, field) {
  const years = DataLoader.byYear(rows).map((d) => d.year);
  const last = years.at(-1);
  if (!last) return [];
  const curr = DataLoader.byField(rows.filter((d) => d.year === last), field);
  const prev = DataLoader.byField(rows.filter((d) => d.year === last - 1), field);
  const prevMap = new Map(prev.map((d) => [d.name, d.value]));
  return curr.map((d) => ({ ...d, yoy: Indicators.yoy(d.value, prevMap.get(d.name) || 0) }));
}

function rankChanges(rows, field) {
  const years = DataLoader.byYear(rows).map((d) => d.year);
  const last = years.at(-1);
  if (!last) return [];
  const curr = DataLoader.byField(rows.filter((d) => d.year === last), field);
  const prev = DataLoader.byField(rows.filter((d) => d.year === last - 1), field);
  const prevRank = new Map(prev.map((d, i) => [d.name, i + 1]));
  return curr.map((d, i) => ({ ...d, currentRank: i + 1, previousRank: prevRank.get(d.name) || null }));
}

function rankingText(item) {
  if (!item) return "s/d";
  if (!item.previousRank) return "Nuevo en ranking";
  const diff = item.previousRank - item.currentRank;
  if (diff > 0) return `Sube ${diff}`;
  if (diff < 0) return `Baja ${Math.abs(diff)}`;
  return "Sin cambio";
}

function shareChangesByField(rows, field) {
  const years = DataLoader.byYear(rows).map((d) => d.year);
  if (years.length < 2) return [];
  const first = years[0];
  const last = years.at(-1);
  const firstRows = rows.filter((d) => d.year === first);
  const lastRows = rows.filter((d) => d.year === last);
  const firstTotal = firstRows.reduce((a, d) => a + d.fob_usd, 0);
  const lastTotal = lastRows.reduce((a, d) => a + d.fob_usd, 0);
  const firstMap = new Map(DataLoader.byField(firstRows, field).map((d) => [d.name, Indicators.share(d.value, firstTotal)]));
  return DataLoader.byField(lastRows, field).map((d) => ({ name: d.name, delta: Indicators.share(d.value, lastTotal) - (firstMap.get(d.name) || 0) }));
}

function volatilityByField(rows, field) {
  const items = DataLoader.byField(rows, field).slice(0, 30);
  return items.map((item) => {
    const series = DataLoader.byYear(item.rows).map((d) => d.value);
    const mean = series.reduce((a, d) => a + d, 0) / Math.max(series.length, 1);
    const variance = series.reduce((a, d) => a + Math.pow(d - mean, 2), 0) / Math.max(series.length, 1);
    return { name: item.name, cv: mean ? Math.sqrt(variance) / mean : 0 };
  }).sort((a, b) => b.cv - a.cv);
}

function riskLevel(value, high, medium) {
  if (value >= high) return "alto";
  if (value >= medium) return "medio";
  return "bajo";
}

function semaphore(level) {
  const labels = { alto: "● Alto", medio: "● Medio", bajo: "● Bajo" };
  return `<span class="risk ${level}">${labels[level] || "s/d"}</span>`;
}

function productYoyTopScope(s) {
  const selectedLimit = Number(topProducts);
  const limit = selectedLimit === 20 || topProducts === "all" ? 20 : 10;
  const topNames = new Set(s.products.slice(0, limit).map((d) => d.name));
  return {
    limit,
    rows: yoyByField("product").filter((d) => topNames.has(d.name)),
  };
}

function renderSummaryCharts(s) {
  Charts.lineChart(document.getElementById("annualChart"), s.byYear, { average: s.trend.movingAverage, secondary: pgbSecondary(s.byYear) });
  Charts.barChart(document.getElementById("rubroChart"), withPgbShare(s.rubros).slice(0, 12), { left: 230 });
}

function renderEvolution(s) {
  Charts.lineChart(document.getElementById("evolutionChart"), s.byYear, { average: s.trend.movingAverage, secondary: pgbSecondary(s.byYear) });
  const yoy = s.byYear.map((d) => {
    const prev = s.byYear.find((x) => x.year === d.year - 1);
    return { name: prev ? `${d.year}/${prev.year}` : String(d.year), year: String(d.year), comparison: prev ? `${d.year} vs ${prev.year}` : "", value: prev ? Indicators.yoy(d.value, prev.value) : 0, hasPrev: Boolean(prev) };
  }).filter((d) => d.hasPrev);
  Charts.verticalBars(document.getElementById("yoyChart"), yoy);
  const metrics = [
    ["Maximo historico", s.trend.max ? `${Indicators.money(s.trend.max.value)} (${s.trend.max.year})` : "s/d"],
    ["Minimo historico", s.trend.min ? `${Indicators.money(s.trend.min.value)} (${s.trend.min.year})` : "s/d"],
    ["Tasa anual acumulativa", s.trend.cagr == null ? "s/d" : Indicators.pct(s.trend.cagr)],
    ["Promedio movil", s.byYear.length >= 3 ? "Calculado con ventana de 3 anios por disponibilidad anual" : "No robusto"],
  ];
  document.getElementById("trendMetrics").innerHTML = metrics.map(metricHtml).join("");
}

function renderProducts(s) {
  const unit = Filters.state().unit;
  const productSource = unit === "weight" ? productsByWeight() : s.products;
  const total = productSource.reduce((acc, d) => acc + d.value, 0);
  const limit = topProducts === "all" ? productSource.length : Number(topProducts);
  const rows = (unit === "weight" ? productSource : withPgbShare(productSource)).slice(0, limit);
  const valueFormatter = unit === "weight" ? formatKg : Indicators.money;
  const valueLabel = unit === "weight" ? "Peso neto" : "Valor FOB";
  Charts.barChart(document.getElementById("productChart"), rows, { left: 300, rowHeight: 28, format: valueFormatter });
  Charts.treemap(document.getElementById("treeChart"), s.rubros);
  const yoyRows = yoyByField("product");
  const yoyMap = new Map(yoyRows.map((d) => [d.name, d.yoy]));
  Charts.table(document.getElementById("productTable"), rows.map((d, i) => ({
    rank: i + 1,
    name: d.name,
    value: d.value,
    share: Indicators.share(d.value, total),
    pgbShare: d.pgbShare,
    yoy: yoyMap.get(d.name),
  })), [
    { key: "rank", label: "#" },
    { key: "name", label: "Producto" },
    { key: "value", label: valueLabel, num: true, format: valueFormatter },
    { key: "share", label: "Participacion", num: true, format: Indicators.pct },
    { key: "pgbShare", label: "% PGB", num: true, format: Indicators.pct },
    { key: "yoy", label: "Var. i.a. FOB", num: true, format: Indicators.pct },
  ]);
}

function productsByWeight() {
  const map = new Map();
  currentRows.forEach((row) => {
    if (!row.product || row.weight == null) return;
    const key = row.product.trim().replace(/\s+/g, " ").toLocaleLowerCase("es-AR");
    const prev = map.get(key) || { name: row.product, value: 0, rows: [] };
    prev.value += Number(row.weight || 0);
    prev.rows.push(row);
    map.set(key, prev);
  });
  return [...map.values()].filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
}

function formatKg(value) {
  return `${Indicators.fmtNumber.format(value || 0)} kg`;
}

function availablePgbTotal() {
  const years = new Set(currentRows.map((d) => d.year).filter((year) => DataLoader.pgbByYear.has(year)));
  return [...years].reduce((acc, year) => acc + (DataLoader.pgbByYear.get(year) || 0), 0);
}

function withPgbShare(items) {
  const denominator = availablePgbTotal();
  return items.map((d) => {
    const numerator = d.rows ? d.rows.filter((row) => DataLoader.pgbByYear.has(row.year)).reduce((acc, row) => acc + row.fob_usd, 0) : d.value;
    return { ...d, pgbShare: denominator ? Indicators.share(numerator, denominator) : null };
  });
}

function pgbSecondary(byYear) {
  return byYear.filter((d) => d.pgb_share != null).map((d) => ({ year: d.year, value: d.pgb_share }));
}

function renderDestinations(s) {
  const countryTitle = Filters.state().operation === "import" ? "Principales paises de origen" : "Principales paises";
  const productByCountry = principalProductByCountry();
  const countriesWithPgb = withPgbShare(s.countries);
  document.getElementById("partnerCards").innerHTML = countriesWithPgb.slice(0, 10).map((d, i) => `
    <article class="partner-card">
      <span class="rank">#${i + 1}</span>
      <strong>${d.name}</strong>
      <p>${Indicators.money(d.value)} &middot; ${Indicators.pct(Indicators.share(d.value, s.total))} &middot; ${d.pgbShare == null ? "s/d PGB" : `${Indicators.pct(d.pgbShare)} PGB`}</p>
      <p>Principal producto: ${productByCountry.get(d.name) || "s/d"}</p>
    </article>`).join("");
  const continents = withPgbShare(DataLoader.byField(currentRows, "continent")).slice(0, 12);
  Charts.barChart(document.getElementById("continentChart"), continents, { left: 190, color: "#4aa3c7" });
  Charts.table(document.getElementById("geoTable"), countriesWithPgb.map((d) => ({
    country: d.name,
    continent: d.rows[0]?.continent || "Sin dato",
    value: d.value,
    share: Indicators.share(d.value, s.total),
    pgbShare: d.pgbShare,
  })), [
    { key: "country", label: "Pais" },
    { key: "continent", label: "Continente" },
    { key: "value", label: "Valor FOB", num: true, format: Indicators.money },
    { key: "share", label: "Participacion", num: true, format: Indicators.pct },
    { key: "pgbShare", label: "% PGB", num: true, format: Indicators.pct },
  ]);
  const topP = s.products.slice(0, 12).map((d) => d.name);
  const topC = s.countries.slice(0, 12).map((d) => d.name);
  const matrix = DataLoader.productCountry(currentRows).filter((d) => topP.includes(d.product) && topC.includes(d.country));
  Charts.heatmap(document.getElementById("heatmapChart"), matrix, topP, topC);
}

function operationLabel(operation) {
  if (operation === "import") return "Importaciones";
  if (operation === "all") return "Exportaciones e importaciones";
  return "Exportaciones";
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function renderAdvanced(s) {
  document.getElementById("concentrationMetrics").innerHTML = [
    ["Top 5 productos", Indicators.pct(s.concentration.productTop5)],
    ["Top 10 productos", Indicators.pct(s.concentration.productTop10)],
    ["Indice HHI productos", Indicators.fmtNumber.format(s.concentration.productHhi)],
    ["Productos que explican 80%", Indicators.fmtNumber.format(s.concentration.productCount80)],
    ["Lectura", "Un HHI mayor indica una canasta mas concentrada."],
  ].map(metricHtml).join("");

  document.getElementById("geoMetrics").innerHTML = [
    ["Paises destino", Indicators.fmtNumber.format(s.counts.countries)],
    ["Top 5 destinos", Indicators.pct(s.concentration.countryTop5)],
    ["Top 10 destinos", Indicators.pct(s.concentration.countryTop10)],
    ["HHI geográfico", Indicators.fmtNumber.format(s.concentration.countryHhi)],
    ["Nuevos destinos", newDestinations()],
    ["Destinos sin registro reciente", lostDestinations()],
  ].map(metricHtml).join("");
}

function renderProjections() {
  const container = document.getElementById("projectionText");
  if (!container) return;
  const data = DataLoader.projections || {};
  if (!data.exports && !data.imports) {
    container.innerHTML = `<p>No se encontro el archivo de proyecciones procesadas.</p>`;
    return;
  }
  const meta = data.metadata || {};
  const exportsAgg = data.exports?.aggregate || [];
  const importsAgg = data.imports?.aggregate || [];
  const exportsChains = data.exports?.chains || [];
  const importsChains = data.imports?.chains || [];
  const lastItcrm = (data.itcrm_annual || []).at(-1);
  const exportBase2035 = valueForScenario(exportsAgg, 2035, "base");
  const importBase2035 = valueForScenario(importsAgg, 2035, "base");

  container.innerHTML = `
    <section class="assessment-section">
      <h3>Alcance del modelo</h3>
      <p>Las proyecciones 2026-2035 se estiman por cadena a partir de las series anuales disponibles de comercio exterior y del ITCRM multilateral del archivo <strong>${meta.itcrm_source_file || "ITCRMSerie.xlsx"}</strong>. La especificacion base utiliza valores en logaritmos, diferencia anual, componente autorregresivo de primer orden e ITCRM como regresor externo cuando la cantidad de observaciones lo permite.</p>
      <p>El forecast principal excluye cadenas discontinuas o sin dato positivo en 2025. Para exportaciones se exige un minimo de ocho observaciones positivas y para importaciones un minimo de cuatro. Cuando una cadena incluida no cuenta con suficientes observaciones para estimar el componente con ITCRM, se utiliza una especificacion de caminata aleatoria con deriva sobre log(valor).</p>
      <p>No se incorporan supuestos externos de precios, produccion, tipo de cambio futuro ni puesta en marcha de proyectos. Las cadenas marginales con historia insuficiente quedan fuera del agregado proyectado para evitar extrapolaciones no robustas.</p>
      <p>El ITCRM futuro se mantiene constante en el ultimo promedio anual observado${lastItcrm ? ` (${lastItcrm.year}: ${Indicators.fmtNumber.format(lastItcrm.itcrm)})` : ""}, porque no se encontraron proyecciones de ITCRM en los archivos locales. Los escenarios optimista y conservador aplican +/- 1 RMSE historico de crecimiento logaritmico por cadena.</p>
    </section>

    <section class="assessment-section">
      <h3>Gráficos interactivos de escenarios</h3>
      <div class="projection-toolbar">
        <div class="segmented" role="group" aria-label="Operacion proyectada">
          <button data-projection-operation="export" class="active">Exportaciones</button>
          <button data-projection-operation="import">Importaciones</button>
        </div>
        <div class="projection-actions">
          <button class="icon-button" data-projection-download="projectionScenarioChart">PNG escenario</button>
          <button class="icon-button" data-projection-download="projectionChainChart">PNG cadenas</button>
        </div>
      </div>
      <div class="projection-grid">
        <article>
          <h4 id="projectionScenarioTitle">Escenarios agregados</h4>
          <div id="projectionScenarioChart" class="chart projection-chart"></div>
        </article>
        <article>
          <h4 id="projectionChainTitle">Cadenas principales en 2035</h4>
          <div id="projectionChainChart" class="chart projection-chart"></div>
        </article>
      </div>
    </section>

    <section class="assessment-section">
      <h3>Exportaciones: escenarios agregados</h3>
      <p>El escenario base agrega las proyecciones por cadena exportadora. Los escenarios no representan objetivos de politica ni forecasts oficiales; son bandas mecanicas derivadas del error historico del modelo.</p>
      ${projectionScenarioTable(exportsAgg)}
      <h4>Cadenas exportadoras con mayor valor proyectado en 2035</h4>
      ${projectionChainTable(exportsChains)}
      ${projectionSummary("Exportaciones", exportBase2035, exportsAgg)}
    </section>

    <section class="assessment-section">
      <h3>Importaciones: escenarios agregados</h3>
      <p>La serie de importaciones disponible es mas corta, por lo que varias cadenas utilizan la especificacion parsimoniosa con deriva. La lectura debe concentrarse en ordenes de magnitud, dispersion de escenarios y dependencia relativa por cadena.</p>
      ${projectionScenarioTable(importsAgg)}
      <h4>Cadenas importadoras con mayor valor proyectado en 2035</h4>
      ${projectionChainTable(importsChains)}
      ${projectionSummary("Importaciones", importBase2035, importsAgg)}
    </section>

    <section class="assessment-section">
      <h3>Lectura tecnica</h3>
      <table class="assessment-table">
        <tbody>
          <tr><th>Escenario</th><th>Interpretacion</th></tr>
          <tr><td>Base</td><td>Continuidad estadistica de la trayectoria historica por cadena, condicionada al ITCRM observado y sin shocks adicionales.</td></tr>
          <tr><td>Optimista</td><td>Trayectoria base ajustada por un error historico favorable. No implica precios internacionales ni volumenes mayores a los observados.</td></tr>
          <tr><td>Conservador</td><td>Trayectoria base ajustada por un error historico desfavorable. No incorpora eventos extremos ni restricciones no observadas en la serie.</td></tr>
        </tbody>
      </table>
      <p>Para uso financiero, estas bandas deben leerse como un ejercicio estadistico de sensibilidad. La robustez es mayor en exportaciones, donde la historia disponible es mas extensa, y menor en importaciones por la menor cantidad de anios observados.</p>
    </section>
  `;
  bindProjectionCharts();
  renderProjectionCharts("export");
}

function bindProjectionCharts() {
  document.querySelectorAll("[data-projection-operation]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-projection-operation]").forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
      renderProjectionCharts(button.dataset.projectionOperation);
    });
  });
  document.querySelectorAll("[data-projection-download]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.projectionDownload;
      Charts.downloadSvgAsPng(document.getElementById(id), `${id}.png`);
    });
  });
}

function renderProjectionCharts(operation) {
  const data = DataLoader.projections || {};
  const key = operation === "import" ? "imports" : "exports";
  const label = operation === "import" ? "Importaciones" : "Exportaciones";
  const aggregate = data[key]?.aggregate || [];
  const chains = data[key]?.chains || [];
  const scenarioTitle = document.getElementById("projectionScenarioTitle");
  const chainTitle = document.getElementById("projectionChainTitle");
  if (scenarioTitle) scenarioTitle.textContent = `${label}: escenarios agregados 2026-2035`;
  if (chainTitle) chainTitle.textContent = `${label}: principales cadenas proyectadas a 2035`;
  Charts.projectionScenarioChart(document.getElementById("projectionScenarioChart"), aggregate, label);
  Charts.projectionChainBars(document.getElementById("projectionChainChart"), chains, label);
}

function valueForScenario(rows, year, scenario) {
  const row = rows.find((d) => Number(d.year) === year);
  return row ? Number(row[scenario] || 0) : null;
}

function projectionWindow(operation, startYear, endYear) {
  const data = DataLoader.projections || {};
  const key = operation === "import" ? "imports" : "exports";
  const rows = (data[key]?.aggregate || [])
    .filter((d) => Number(d.year) >= startYear && Number(d.year) <= endYear)
    .map((d) => ({
      year: Number(d.year),
      conservative: Number(d.conservative || 0),
      base: Number(d.base || 0),
      optimistic: Number(d.optimistic || 0),
    }))
    .filter((d) => d.base > 0)
    .sort((a, b) => a.year - b.year);
  const first = rows[0] || null;
  const last = rows.at(-1) || null;
  return {
    rows,
    first,
    last,
    growth: first && last ? Indicators.yoy(last.base, first.base) : null,
  };
}

function projectionScenarioTable(rows) {
  if (!rows.length) return `<p>No hay proyecciones agregadas disponibles.</p>`;
  const visible = rows.filter((d) => Number(d.year) >= 2026 && Number(d.year) <= 2035);
  return `<table class="assessment-table">
    <thead><tr><th>Anio</th><th>Conservador</th><th>Base</th><th>Optimista</th></tr></thead>
    <tbody>${visible.map((d) => `
      <tr>
        <td>${d.year}</td>
        <td>${Indicators.money(d.conservative)}</td>
        <td>${Indicators.money(d.base)}</td>
        <td>${Indicators.money(d.optimistic)}</td>
      </tr>`).join("")}</tbody>
  </table>`;
}

function projectionChainTable(chains) {
  const rows = chains
    .map((chain) => {
      const model = chain.model || {};
      const forecast = (model.forecast || []).find((d) => Number(d.year) === 2035);
      return { ...chain, ...model, forecast };
    })
    .filter((d) => d.forecast)
    .sort((a, b) => Number(b.forecast.base || 0) - Number(a.forecast.base || 0))
    .slice(0, 12);
  if (!rows.length) return `<p>No hay proyecciones por cadena disponibles.</p>`;
  return `<table class="assessment-table">
    <thead><tr><th>Cadena</th><th>Ultimo dato</th><th>Base 2035</th><th>Conservador 2035</th><th>Optimista 2035</th><th>Modelo</th></tr></thead>
    <tbody>${rows.map((d) => `
      <tr>
        <td>${d.chain || "Sin dato"}</td>
        <td>${d.last_observed_year}: ${Indicators.money(d.last_observed_value)}</td>
        <td>${Indicators.money(d.forecast.base)}</td>
        <td>${Indicators.money(d.forecast.conservative)}</td>
        <td>${Indicators.money(d.forecast.optimistic)}</td>
        <td>${d.model_type || "s/d"}</td>
      </tr>`).join("")}</tbody>
  </table>`;
}

function projectionSummary(label, base2035, rows) {
  const first = rows.find((d) => Number(d.year) === 2026);
  const last = rows.find((d) => Number(d.year) === 2035);
  if (!first || !last || !base2035) return "";
  const growth = Indicators.yoy(last.base, first.base);
  return `<div class="assessment-insights">
    <strong>Insights destacados</strong>
    <p>La trayectoria base de ${label.toLowerCase()} alcanza ${Indicators.money(base2035)} en 2035 bajo supuestos estrictamente estadisticos.</p>
    <p>Entre 2026 y 2035, la variacion acumulada del escenario base es ${growth == null ? "s/d" : Indicators.pct(growth)}.</p>
    <p>La distancia entre los escenarios optimista y conservador refleja la volatilidad historica estimada por cadena, no supuestos externos adicionales.</p>
  </div>`;
}

const itcrbMarkets = [
  { label: "Total multilateral", index: "ITCRM", countries: null },
  { label: "Brasil", index: "ITCRB Brasil", countries: ["Brasil"] },
  { label: "Canadá", index: "ITCRB Canadá", countries: ["Canadá", "Canada"] },
  { label: "Chile", index: "ITCRB Chile", countries: ["Chile"] },
  { label: "Estados Unidos", index: "ITCRB Estados Unidos", countries: ["Estados Unidos", "Estados Unidos de América"] },
  { label: "México", index: "ITCRB México", countries: ["México", "Mexico"] },
  { label: "Uruguay", index: "ITCRB Uruguay", countries: ["Uruguay", "Zonamérica (ex Montevideo) (Uruguay)"] },
  { label: "China", index: "ITCRB China", countries: ["China"] },
  { label: "India", index: "ITCRB India", countries: ["India"] },
  { label: "Japón", index: "ITCRB Japón", countries: ["Japón", "Japon"] },
  { label: "Reino Unido", index: "ITCRB Reino Unido", countries: ["Reino Unido"] },
  { label: "Suiza", index: "ITCRB Suiza", countries: ["Suiza"] },
  { label: "Zona Euro", index: "ITCRB Zona Euro", countries: ["Alemania", "Austria", "Bélgica", "Chipre", "Croacia", "Eslovaquia", "Eslovenia", "España", "Estonia", "Finlandia", "Francia", "Grecia", "Irlanda", "Italia", "Letonia", "Lituania", "Luxemburgo", "Malta", "Países Bajos", "Portugal"] },
  { label: "Vietnam", index: "ITCRB Vietnam", countries: ["Vietnam"] },
  { label: "Sudamérica", index: "ITCRB Sudamérica", countries: ["Bolivia", "Brasil", "Chile", "Colombia", "Ecuador", "Paraguay", "Perú", "Uruguay", "Venezuela"] },
];

function renderItcrbTrade() {
  const select = document.getElementById("itcrbMarketSelect");
  const chainSelect = document.getElementById("itcrbChainSelect");
  const exportChart = document.getElementById("itcrbExportChart");
  const importChart = document.getElementById("itcrbImportChart");
  const note = document.getElementById("itcrbTradeNote");
  if (!select || !chainSelect || !exportChart || !importChart) return;
  if (!select.options.length) {
    select.innerHTML = itcrbMarkets.map((m, i) => `<option value="${i}">${m.label} · ${m.index}</option>`).join("");
    select.addEventListener("change", () => renderItcrbTradeChart());
  }
  if (!chainSelect.options.length) {
    const chainOptions = [
      `<option value="all">Todas las cadenas</option>`,
      `<option value="exclude-mining">Todo sin cadena minera</option>`,
      ...DataLoader.dimensions.rubros.map((name) => `<option value="${escapeAttr(name)}">${name}</option>`),
    ];
    chainSelect.innerHTML = chainOptions.join("");
    chainSelect.addEventListener("change", () => renderItcrbTradeChart());
  }
  renderItcrbTradeChart();
  if (note) {
    const meta = DataLoader.itcrb?.metadata || {};
    note.textContent = `Fuente índice: ${meta.source_file || "ITCRMSerie.xlsx"}, hoja ${meta.source_sheet || "ITCRM y bilaterales prom. mens."}. Comercio anual desde archivos locales procesados.`;
  }
}

function renderItcrbTradeChart() {
  const select = document.getElementById("itcrbMarketSelect");
  const chainSelect = document.getElementById("itcrbChainSelect");
  const exportChart = document.getElementById("itcrbExportChart");
  const importChart = document.getElementById("itcrbImportChart");
  if (!select || !chainSelect || !exportChart || !importChart) return;
  const market = itcrbMarkets[Number(select.value || 0)] || itcrbMarkets[0];
  const rows = buildTradeItcrbRows(market, chainSelect.value || "all");
  Charts.tradeIndexChart(exportChart, rows, market.label, "Exportaciones", "exports", "#77c9ec");
  Charts.tradeIndexChart(importChart, rows, market.label, "Importaciones", "imports", "#2dd4bf");
}

function buildTradeItcrbRows(market, chainFilter) {
  const idxRows = DataLoader.itcrb?.annual || [];
  const indexByYear = new Map(idxRows.map((d) => [Number(d.year), Number(d[market.index])]));
  const allowed = market.countries ? new Set(market.countries.map(canonicalText)) : null;
  const exportYears = new Set(DataLoader.records.filter((d) => d.operation === "export").map((d) => Number(d.year)));
  const importYears = new Set(DataLoader.records.filter((d) => d.operation === "import").map((d) => Number(d.year)));
  const years = [...new Set([...DataLoader.years, ...idxRows.map((d) => Number(d.year))])].filter((y) => y <= 2025).sort((a, b) => a - b);
  return years.map((year) => {
    const yearRows = DataLoader.records.filter((d) => Number(d.year) === year && itcrbCountryMatch(d, allowed) && itcrbChainMatch(d, chainFilter));
    const exports = yearRows.filter((d) => d.operation === "export").reduce((sum, d) => sum + Number(d.fob_usd || 0), 0);
    const imports = yearRows.filter((d) => d.operation === "import").reduce((sum, d) => sum + Number(d.fob_usd || 0), 0);
    return { year, exports, imports, exportsAvailable: exportYears.has(year), importsAvailable: importYears.has(year), index: indexByYear.get(year) };
  }).filter((d) => d.index != null);
}

function tradeItcrbRiskSummary(exportRows, importRows) {
  if (!DataLoader.itcrb?.annual?.length) {
    return {
      level: "medio",
      narrative: "no se encontro una serie ITCRM/ITCRB procesada para vincular comercio e indice bilateral.",
      justification: "Serie ITCRB no disponible.",
    };
  }
  const totalExport = exportRows.reduce((a, d) => a + Number(d.fob_usd || 0), 0);
  const totalImport = importRows.reduce((a, d) => a + Number(d.fob_usd || 0), 0);
  const exportMarket = topItcrbMarket(exportRows, "export", totalExport);
  const importMarket = topItcrbMarket(importRows, "import", totalImport);
  const totalExportRelation = tradeIndexRelation(exportRows, itcrbMarkets[0], "export");
  const totalImportRelation = tradeIndexRelation(importRows, itcrbMarkets[0], "import");
  const maxShare = Math.max(exportMarket.share || 0, importMarket.share || 0);
  const maxCorr = Math.max(Math.abs(totalExportRelation.correlation || 0), Math.abs(totalImportRelation.correlation || 0));
  const level = maxShare >= 0.5 || maxCorr >= 0.7 ? "alto" : maxShare >= 0.25 || maxCorr >= 0.4 ? "medio" : "bajo";
  const narrative = `en exportaciones, el mayor socio cubierto por ITCRB es ${exportMarket.label} (${Indicators.pct(exportMarket.share)} del valor filtrado); en importaciones, ${importMarket.label} (${Indicators.pct(importMarket.share)}). La correlacion simple comercio-ITCRM multilateral es ${formatCorrelation(totalExportRelation.correlation)} para exportaciones y ${formatCorrelation(totalImportRelation.correlation)} para importaciones. Esta relacion es descriptiva y no implica causalidad.`;
  return {
    level,
    narrative,
    justification: `Mayor exposicion bilateral cubierta: ${Indicators.pct(maxShare)}; correlacion absoluta maxima con ITCRM: ${formatCorrelation(maxCorr)}.`,
  };
}

function topItcrbMarket(rows, operation, total) {
  const candidates = itcrbMarkets.slice(1).map((market) => {
    const allowed = new Set((market.countries || []).map(canonicalText));
    const value = rows
      .filter((row) => row.operation === operation && itcrbCountryMatch(row, allowed))
      .reduce((a, d) => a + Number(d.fob_usd || 0), 0);
    return { label: market.label, value, share: Indicators.share(value, total) };
  }).sort((a, b) => b.value - a.value);
  return candidates[0] || { label: "s/d", value: 0, share: null };
}

function tradeIndexRelation(rows, market, operation) {
  const idxRows = DataLoader.itcrb?.annual || [];
  const indexByYear = new Map(idxRows.map((d) => [Number(d.year), Number(d[market.index])]));
  const allowed = market.countries ? new Set(market.countries.map(canonicalText)) : null;
  const byYear = DataLoader.byYear(rows.filter((d) => d.operation === operation && itcrbCountryMatch(d, allowed)))
    .filter((d) => indexByYear.has(Number(d.year)) && Number(d.year) <= 2025);
  return {
    observations: byYear.length,
    correlation: correlation(byYear.map((d) => d.value), byYear.map((d) => indexByYear.get(Number(d.year)))),
  };
}

function correlation(xs, ys) {
  const pairs = xs.map((x, i) => [Number(x), Number(ys[i])]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (pairs.length < 3) return null;
  const meanX = pairs.reduce((a, [x]) => a + x, 0) / pairs.length;
  const meanY = pairs.reduce((a, [, y]) => a + y, 0) / pairs.length;
  let num = 0;
  let denX = 0;
  let denY = 0;
  pairs.forEach(([x, y]) => {
    const dx = x - meanX;
    const dy = y - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  });
  const den = Math.sqrt(denX * denY);
  return den ? num / den : null;
}

function formatCorrelation(value) {
  return value == null || !Number.isFinite(value) ? "s/d" : value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function itcrbCountryMatch(row, allowed) {
  if (!allowed) return true;
  const country = canonicalText(row.country);
  if (allowed.has(country)) return true;
  return [...allowed].some((name) => country.includes(name) || name.includes(country));
}

function itcrbChainMatch(row, chainFilter) {
  if (!chainFilter || chainFilter === "all") return true;
  if (chainFilter === "exclude-mining") return canonicalText(row.rubro) !== canonicalText("C.MINERA");
  return row.rubro === chainFilter;
}

function escapeAttr(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function canonicalText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function renderMethodology() {
  const m = DataLoader.metadata;
  const itcrbMeta = DataLoader.itcrb?.metadata || {};
  const projectionMeta = DataLoader.projections?.metadata || {};
  document.getElementById("methodologyText").innerHTML = `
    <p>La aplicación utiliza exclusivamente los archivos encontrados en la carpeta local. Las fuentes institucionales de referencia son: comercio exterior de bienes del INDEC para exportaciones e importaciones provinciales, e índices de tipo de cambio real del Banco Central de la República Argentina para ITCRM/ITCRB.</p>

    <h3>Fuentes</h3>
    <ul>
      <li><strong>Exportaciones e importaciones:</strong> INDEC, comercio exterior. Referencia institucional: <a href="https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-2-79" target="_blank" rel="noopener">https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-2-79</a>.</li>
      <li><strong>Índices de Tipo de Cambio Multilateral (ITCRM) y bilaterales (ITCRB):</strong> Banco Central de la República Argentina. Referencia institucional: <a href="https://www.bcra.gob.ar/indices-de-tipo-de-cambio-multilateral/" target="_blank" rel="noopener">https://www.bcra.gob.ar/indices-de-tipo-de-cambio-multilateral/</a>.</li>
    </ul>

    <h3>Variables y tratamiento</h3>
    <ul>
      <li>Variable monetaria: exportaciones en U$S FOB e importaciones en U$S CIF, según las columnas originales detectadas.</li>
      <li>Periodo de referencia: anual, porque no se encontró columna mensual en la base de exportaciones.</li>
      <li>Clasificación de productos: producto, nomenclador y cadena/rubro disponibles en cada base.</li>
      <li>País: destino para exportaciones y origen/procedencia para importaciones cuando así corresponda a la fuente.</li>
      <li>Los valores faltantes se muestran como "s/d" y no se imputan.</li>
      <li>No se identificaron definiciones específicas sobre datos confidenciales en los campos usados; no se imputan valores ocultos.</li>
      <li>Los totales por suma pueden no coincidir debido al redondeo de las cifras parciales.</li>
      <li>Fecha de actualización de archivos locales: ${m.source_update_date || "s/d"}.</li>
    </ul>

    <h3>Fórmulas utilizadas</h3>
    <table class="assessment-table">
      <tbody>
        <tr><th>Indicador</th><th>Fórmula</th><th>Interpretación</th></tr>
        <tr><td>Total exportado/importado</td><td>\\(X = \\sum_{i=1}^{n} x_i\\)</td><td>Suma del valor monetario para el periodo, operación y filtros seleccionados.</td></tr>
        <tr><td>Participación</td><td>\\(s_i = \\frac{x_i}{\\sum_{j=1}^{n} x_j}\\)</td><td>Peso relativo de producto, cadena, país o continente dentro de la selección.</td></tr>
        <tr><td>Variación interanual</td><td>\\(\\Delta_{a/a} = \\frac{x_t}{x_{t-1}} - 1\\)</td><td>Compara años consecutivos equivalentes; no se calcula si el año previo es cero o no está disponible.</td></tr>
        <tr><td>CAGR</td><td>\\(CAGR = \\left(\\frac{x_T}{x_0}\\right)^{\\frac{1}{n}} - 1\\)</td><td>Tasa anual acumulativa entre el primer y último año con datos válidos.</td></tr>
        <tr><td>% del PGB</td><td>\\(\\%PGB = \\frac{X}{PGB_{USD}}\\)</td><td>Peso de exportaciones o importaciones sobre el producto geográfico bruto dolarizado disponible.</td></tr>
        <tr><td>Top 5 / Top 10</td><td>\\(Top_k = \\frac{\\sum_{i=1}^{k} x_i}{\\sum_{j=1}^{n} x_j}\\)</td><td>Medida simple de concentración acumulada.</td></tr>
        <tr><td>HHI</td><td>\\(HHI = \\sum_{i=1}^{n} (100 \\cdot s_i)^2\\)</td><td>Índice Herfindahl-Hirschman; aumenta cuando el comercio se concentra en pocos productos o destinos.</td></tr>
        <tr><td>Productos para 80%</td><td>\\(\\min k:\\sum_{i=1}^{k} s_i \\geq 0{,}80\\)</td><td>Cantidad mínima de productos necesaria para explicar 80% del total filtrado.</td></tr>
        <tr><td>Correlación comercio-ITCRM/ITCRB</td><td>\\(\\rho_{X,I} = corr(X_t, I_t)\\)</td><td>Relación lineal descriptiva; no implica causalidad ni elasticidad.</td></tr>
      </tbody>
    </table>

    <h3>Rangos de análisis</h3>
    <table class="assessment-table">
      <tbody>
        <tr><th>Indicador</th><th>Rango</th><th>Lectura utilizada</th></tr>
        <tr><td>HHI</td><td>&lt; 1.500</td><td>Concentración baja.</td></tr>
        <tr><td>HHI</td><td>1.500 a 2.499</td><td>Concentración media.</td></tr>
        <tr><td>HHI</td><td>≥ 2.500</td><td>Concentración alta.</td></tr>
        <tr><td>Coeficiente de variación</td><td>&lt; 0,30</td><td>Volatilidad baja.</td></tr>
        <tr><td>Coeficiente de variación</td><td>0,30 a 0,60</td><td>Volatilidad media.</td></tr>
        <tr><td>Coeficiente de variación</td><td>&gt; 0,60</td><td>Volatilidad alta.</td></tr>
        <tr><td>Productos para 80%</td><td>≤ 5 productos</td><td>Diversificación limitada.</td></tr>
        <tr><td>Productos para 80%</td><td>6 a 12 productos</td><td>Diversificación intermedia.</td></tr>
        <tr><td>Productos para 80%</td><td>&gt; 12 productos</td><td>Diversificación mayor.</td></tr>
      </tbody>
    </table>

    <h3>Proyecciones ARIMA/ARIMAX</h3>
    <p>Las proyecciones 2026-2035 se generan con el script local de preparación y se guardan en los archivos procesados de proyecciones. Método registrado: ${projectionMeta.method || "ARIMAX aproximado por cadena sobre log(valor), con diferencia anual, componente AR(1) e ITCRM multilateral como regresor exógeno cuando la serie lo permite."}</p>
    <ul>
      <li>Unidad de estimación: cadena y operación, separando exportaciones e importaciones.</li>
      <li>Transformación: se utiliza log(valor) para trabajar con variaciones proporcionales y evitar proyecciones negativas.</li>
      <li>Especificación base: diferencia anual del logaritmo del valor, componente autorregresivo de primer orden y variación del ITCRM como regresor exógeno cuando hay observaciones suficientes.</li>
      <li>Regla de inclusión: ${projectionMeta.inclusion_rule || "se proyectan cadenas con dato positivo reciente y un mínimo de observaciones positivas; cadenas discontinuas o insuficientes se excluyen del forecast principal."}</li>
      <li>Escenarios: ${projectionMeta.scenario_rule || "base como pronóstico puntual; optimista y conservador como +/- 1 RMSE histórico del crecimiento logarítmico estimado por cadena."}</li>
      <li>Supuesto cambiario: el ITCRM futuro se mantiene constante en el último promedio anual observado porque no se encontraron proyecciones de ITCRM en los archivos locales.</li>
      <li>No se incorporan supuestos externos de precios, producción, puesta en marcha de proyectos, política cambiaria, condiciones financieras ni shocks discrecionales.</li>
    </ul>

    <h3>Robustez y sensibilidad del modelo</h3>
    <ul>
      <li>Robustez temporal: las exportaciones tienen mayor soporte histórico que las importaciones; las importaciones 2021-2025 deben leerse con mayor cautela por menor cantidad de observaciones.</li>
      <li>Robustez por cadena: se excluyen cadenas sin dato positivo reciente o con historia insuficiente para evitar extrapolaciones mecánicas de series discontinuas.</li>
      <li>Sensibilidad de escenarios: la distancia entre escenario conservador y optimista refleja el error histórico estimado por cadena; no representa un shock diseñado externamente.</li>
      <li>Sensibilidad cambiaria: el ITCRM se incluye como regresor cuando la serie permite estimarlo; no se calculan elasticidades estructurales ni efectos causales.</li>
      <li>Validación conceptual: los resultados se interpretan como ejercicio estadístico de sensibilidad, no como presupuesto, meta oficial ni forecast determinístico.</li>
    </ul>

    <h3>Medidas de bondad de ajuste y precisión</h3>
    <p>La medida cuantitativa disponible en los archivos procesados es el RMSE del crecimiento logarítmico anual por cadena. Esta métrica se calcula sobre los residuos internos del modelo y se usa para construir las bandas conservadora y optimista. La aplicación no presenta AIC, BIC, MAE ni MAPE porque esos estadísticos no fueron persistidos en el archivo de proyecciones procesado.</p>
    <table class="assessment-table">
      <tbody>
        <tr><th>Medida</th><th>Fórmula</th><th>Uso en la aplicación</th></tr>
        <tr><td>Residuo</td><td>\\(e_t = g_t - \\hat{g}_t\\)</td><td>Diferencia entre crecimiento logarítmico observado y estimado.</td></tr>
        <tr><td>RMSE log-growth</td><td>\\(RMSE = \\sqrt{\\frac{1}{n}\\sum_{t=1}^{n} e_t^2}\\)</td><td>Medida principal de error histórico por cadena.</td></tr>
        <tr><td>Error porcentual aproximado</td><td>\\(\\varepsilon \\approx e^{RMSE} - 1\\)</td><td>Traduce el RMSE logarítmico a una escala porcentual aproximada.</td></tr>
        <tr><td>Banda optimista</td><td>\\(\\hat{x}_{t+1}^{opt} = exp(\\hat{\\ell}_{t+1} + RMSE)\\)</td><td>Escenario superior mecánico, no shock externo.</td></tr>
        <tr><td>Banda conservadora</td><td>\\(\\hat{x}_{t+1}^{cons} = exp(\\hat{\\ell}_{t+1} - RMSE)\\)</td><td>Escenario inferior mecánico, no stress test extremo.</td></tr>
      </tbody>
    </table>
    ${projectionFitSummaryHtml()}

    <h3>Cálculo de ITCRB y comercio</h3>
    <p>El archivo ${itcrbMeta.source_file || "ITCRMSerie.xlsx"}, hoja ${itcrbMeta.source_sheet || "ITCRM y bilaterales prom. mens."}, contiene series mensuales de ITCRM e ITCRB. Para la app, cada índice mensual se convierte a promedio anual simple y se vincula con los valores anuales de comercio exterior.</p>
    <ul>
      <li>Para "Total multilateral" se suman todas las exportaciones o importaciones filtradas y se utiliza el índice ITCRM.</li>
      <li>Para países individuales se filtra el comercio por país de destino en exportaciones u origen/procedencia en importaciones, y se utiliza el ITCRB bilateral correspondiente.</li>
      <li>Para grupos como Zona Euro o Sudamérica se agregan los países definidos en la app y se usa el índice bilateral agregado disponible en la serie del BCRA.</li>
      <li>El filtro de cadena permite comparar todas las cadenas, excluir la cadena minera o seleccionar una cadena específica.</li>
      <li>Los gráficos muestran comercio anual en dólares en el eje izquierdo e índice ITCRM/ITCRB en el eje derecho. La comparación es descriptiva y no estima causalidad, pass-through ni elasticidades.</li>
    </ul>`;
  if (window.MathJax?.typesetPromise) {
    window.MathJax.typesetPromise([document.getElementById("methodologyText")]).catch(() => {});
  }
}

function projectionFitSummaryHtml() {
  const data = DataLoader.projections || {};
  const rows = [
    projectionFitSummaryRow("Exportaciones", data.exports?.chains || []),
    projectionFitSummaryRow("Importaciones", data.imports?.chains || []),
  ];
  return `<table class="assessment-table">
    <tbody>
      <tr><th>Operación</th><th>Modelos incluidos</th><th>ARIMAX</th><th>ARIMA con deriva</th><th>RMSE mediano</th><th>RMSE min-max</th><th>Error porcentual aprox. mediano</th></tr>
      ${rows.map((d) => `
        <tr>
          <td>${d.label}</td>
          <td>${d.count}</td>
          <td>${d.arimax}</td>
          <td>${d.arima}</td>
          <td>${d.median == null ? "s/d" : d.median.toLocaleString("es-AR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
          <td>${d.min == null ? "s/d" : `${d.min.toLocaleString("es-AR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} - ${d.max.toLocaleString("es-AR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`}</td>
          <td>${d.approxPct == null ? "s/d" : Indicators.pct(d.approxPct)}</td>
        </tr>`).join("")}
    </tbody>
  </table>
  <p>Lectura: un RMSE logarítmico más bajo indica que el crecimiento anual estimado por el modelo se aproximó mejor al crecimiento observado de esa cadena. En importaciones, la precisión debe evaluarse con mayor cautela por la menor longitud histórica disponible.</p>`;
}

function projectionFitSummaryRow(label, chains) {
  const models = chains
    .map((chain) => chain.model || {})
    .filter((model) => Number.isFinite(Number(model.rmse_log_growth)));
  const values = models.map((model) => Number(model.rmse_log_growth)).sort((a, b) => a - b);
  const medianValue = median(values);
  return {
    label,
    count: models.length,
    arimax: models.filter((model) => String(model.model_type || "").includes("ARIMAX")).length,
    arima: models.filter((model) => String(model.model_type || "").includes("ARIMA(0,1,0)")).length,
    median: medianValue,
    min: values.length ? values[0] : null,
    max: values.length ? values.at(-1) : null,
    approxPct: medianValue == null ? null : Math.exp(medianValue) - 1,
  };
}

function median(values) {
  if (!values.length) return null;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
}

function yoyByField(field) {
  if (!currentSummary?.latest) return [];
  const year = currentSummary.latest.year;
  const curr = DataLoader.byField(currentRows.filter((d) => d.year === year), field);
  const prev = DataLoader.byField(currentRows.filter((d) => d.year === year - 1), field);
  const prevMap = new Map(prev.map((d) => [d.name, d.value]));
  return curr.map((d) => ({ ...d, yoy: Indicators.yoy(d.value, prevMap.get(d.name) || 0) }));
}

function principalProductByCountry() {
  const map = new Map();
  DataLoader.byField(currentRows, "country").forEach((country) => {
    const product = DataLoader.byField(country.rows, "product")[0];
    map.set(country.name, product?.name || "s/d");
  });
  return map;
}

function newDestinations() {
  const years = currentSummary.byYear.map((d) => d.year);
  if (years.length < 2) return "s/d";
  const last = years.at(-1);
  const prev = last - 1;
  const prevSet = new Set(currentRows.filter((d) => d.year === prev).map((d) => d.country));
  const news = [...new Set(currentRows.filter((d) => d.year === last).map((d) => d.country))].filter((d) => !prevSet.has(d));
  return news.length ? news.slice(0, 5).join(", ") : "Sin nuevos destinos frente al anio previo";
}

function lostDestinations() {
  const years = currentSummary.byYear.map((d) => d.year);
  if (years.length < 2) return "s/d";
  const last = years.at(-1);
  const prev = last - 1;
  const lastSet = new Set(currentRows.filter((d) => d.year === last).map((d) => d.country));
  const lost = [...new Set(currentRows.filter((d) => d.year === prev).map((d) => d.country))].filter((d) => !lastSet.has(d));
  return lost.length ? lost.slice(0, 5).join(", ") : "Sin bajas frente al anio previo";
}

function metricHtml([label, value]) {
  return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;
}

function downloadCurrentCsv(extension = "csv") {
  const cols = ["year", "period", "ncm", "product", "rubro", "country", "continent", "fob_usd", "weight"];
  const lines = [cols.join(";")].concat(currentRows.map((r) => cols.map((c) => csvCell(r[c])).join(";")));
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `exportaciones_san_juan_filtradas.${extension}`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function csvCell(value) {
  const s = value == null ? "" : String(value);
  return `"${s.replaceAll('"', '""')}"`;
}

function bindEvents() {
  document.querySelectorAll(".tabs button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(button.dataset.tab).classList.add("active");
    });
  });
  document.querySelectorAll("[data-top-products]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-top-products]").forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
      topProducts = button.dataset.topProducts;
      renderInsights(currentSummary);
      renderProducts(currentSummary);
    });
  });
  document.querySelectorAll("[data-download-chart]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.downloadChart;
      Charts.downloadSvgAsPng(document.getElementById(id), `${id}.png`);
    });
  });
  document.getElementById("printExecutiveAssessment")?.addEventListener("click", () => {
    document.body.classList.add("print-executive");
    window.print();
    setTimeout(() => document.body.classList.remove("print-executive"), 300);
  });
  document.getElementById("downloadCsv").addEventListener("click", () => downloadCurrentCsv("csv"));
  document.getElementById("downloadExcel").addEventListener("click", () => downloadCurrentCsv("xls"));
  document.getElementById("downloadPdf").addEventListener("click", () => window.print());
}

document.addEventListener("DOMContentLoaded", () => {
  Filters.init(render);
  bindEvents();
  render();
});




