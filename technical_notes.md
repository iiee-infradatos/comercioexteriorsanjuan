# Notas Tecnicas y Metodologicas

## Decisiones tecnicas

- La aplicacion es estatica: `index.html`, CSS y JavaScript sin servidor obligatorio.
- No usa dependencias externas en tiempo de ejecucion. Los graficos se dibujan con SVG nativo para que funcione localmente y en GitHub Pages.
- Los datos no estan incrustados en el HTML. Se cargan desde `data/processed_data.js`, generado a partir de `data/processed_data.json`.
- El script ejecutado en esta maquina fue `scripts/prepare_data.ps1`, porque no habia Python ni Node.js disponibles en PATH.
- Se incluye `scripts/prepare_data.py` como alternativa reproducible para entornos con Python, `pandas` y `openpyxl`.
- El selector de operacion permite analizar `Exportaciones`, `Importaciones` o ambas series combinadas.
- Los filtros `Solo cadena minera` / `Sin cadena minera` usan la cadena disponible `C.MINERA`.
- Los filtros `Solo oro no monetario` / `Sin oro no monetario` usan el producto exacto `Oro p/uso no monetario, formas en bruto de aleación dorada o bullón dorado`.
- El anio 2026 se excluye del procesamiento y de la aplicacion por pedido del usuario.
- Las dimensiones de productos, paises, rubros y codigos se consolidan en la app con claves insensibles a mayusculas/minusculas y espacios multiples, conservando una etiqueta de visualizacion.
- El filtro de unidad alterna el ranking y la tabla de productos entre valor en dolares y peso neto. Los KPIs ejecutivos permanecen monetarios porque describen comercio exterior.

## Modelo de datos

El registro normalizado minimo es:

- `operation`: `export` o `import`.
- `operation_label`: etiqueta visible de la operacion.
- `year`: anio.
- `period`: anio en formato `YYYY`.
- `ncm`: nomenclador/codigo de producto.
- `product`: producto.
- `rubro`: cadena productiva disponible en la fuente.
- `country`: pais de destino para exportaciones u origen/procedencia para importaciones.
- `continent`: continente.
- `fob_usd`: campo monetario comun en dolares. Para exportaciones corresponde a U$S FOB; para importaciones corresponde a U$S CIF.
- `fob_millions`: campo monetario comun en millones de dolares.
- `weight`: peso neto en kg.
- `pgb_usd`: PGB USD San Juan por anio, tomado de `Serie 2004-2025 PGB Dolarizada 17.06.xlsx`, hoja `V.Agregado U$S`, fila `Total` / `Sectores`.

## Calculos

- Total exportado: suma de `fob_usd` cuando `operation = export`; representa U$S FOB.
- Total importado: suma de `fob_usd` cuando `operation = import`; representa U$S CIF.
- Participacion: valor de categoria / total filtrado.
- Variacion interanual: `(valor anio t - valor anio t-1) / valor anio t-1`.
- En el grafico de variacion interanual, cada barra se etiqueta como `anio t/anio t-1`. Ejemplo: `2025/2024` significa variacion de 2025 contra 2024. El anio 2026 no se incluye.
- HHI: suma de participaciones porcentuales al cuadrado.
- Productos para 80%: cantidad minima de productos ordenados de mayor a menor que acumulan al menos 80%.
- Tendencia: promedio movil de 3 anios, porque la fuente es anual. No se usa promedio movil de 12 meses al no existir mes.
- CAGR: tasa anual acumulativa entre primer y ultimo anio disponible de la seleccion.
- Los calculos usan como ultimo anio efectivo 2025; no se incluyen registros 2026.
- Peso neto por producto: suma de `PESO NETO (KG)` en la seleccion filtrada.
- Porcentaje sobre PGB: valor monetario de la categoria en anios con PGB disponible / suma de PGB USD de esos anios. La serie PGB disponible cubre 2004-2025.

## Graficos implementados

- KPIs ejecutivos.
- Selector de operacion exportaciones/importaciones.
- Principales resultados automaticos.
- Evolucion anual.
- Evolucion anual con eje secundario `% PGB` para los anios con PGB disponible.
- Variacion interanual anual.
- Promedio movil anual y extremos.
- Barras por cadena/rubro disponible.
- Barras por cadena/rubro con valor monetario y `% PGB`.
- Ranking de productos con Top 10, Top 20 y todos.
- Ranking de productos con valor monetario y `% PGB`.
- Alternancia de ranking de productos entre valor monetario y peso neto.
- Treemap simplificado por cadena.
- Ranking de principales paises de destino u origen, segun operacion.
- Barras por continente.
- Barras por continente con valor monetario y `% PGB`.
- Tabla de paises no georreferenciados.
- Matriz producto por mercado/pais.
- Concentracion de productos y paises.
- Diversificacion geografica basica.

## Graficos no implementados por falta de informacion

- Evolucion mensual.
- Series acumuladas mensuales.
- Comparacion mensual entre anios.
- Estacionalidad mensual.
- Promedio movil de 12 meses.
- Mapa mundial coropletico o de burbujas con ISO/GeoJSON.
- Participacion de San Juan en exportaciones o importaciones nacionales.
- Exportaciones/importaciones per capita.
- Peso de productos mineros/agroindustriales bajo categorias INDEC estrictas cuando no coinciden con `CADENA`.
- Cantidad fisica distinta de peso neto.

## Fuentes institucionales

- Exportaciones e importaciones: INDEC, comercio exterior, referencia institucional `https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-2-79`.
- ITCRM e ITCRB: Banco Central de la Republica Argentina, referencia institucional `https://www.bcra.gob.ar/indices-de-tipo-de-cambio-multilateral/`.
- La aplicacion procesa exclusivamente los archivos locales disponibles en la carpeta de trabajo.

## Formulas y rangos

- Total: \(X = \sum_{i=1}^{n} x_i\).
- Participacion: \(s_i = \frac{x_i}{\sum_{j=1}^{n} x_j}\).
- Variacion interanual: \(\Delta_{a/a} = \frac{x_t}{x_{t-1}} - 1\), solo cuando existe anio previo positivo.
- CAGR: \(CAGR = \left(\frac{x_T}{x_0}\right)^{\frac{1}{n}} - 1\).
- Porcentaje del PGB: \(\%PGB = \frac{X}{PGB_{USD}}\).
- HHI: suma de las participaciones porcentuales al cuadrado, \(HHI = \sum_{i=1}^{n} (100 \cdot s_i)^2\).
- Rangos HHI usados: menor a 1.500 bajo, 1.500 a 2.499 medio, 2.500 o mas alto.
- Volatilidad por coeficiente de variacion: menor a 0,30 baja, 0,30 a 0,60 media, mayor a 0,60 alta.
- Correlacion comercio-ITCRM/ITCRB: \(\rho_{X,I} = corr(X_t, I_t)\); no implica causalidad ni elasticidad.
- Residuo del modelo de proyeccion: \(e_t = g_t - \hat{g}_t\), donde \(g_t\) es el crecimiento logaritmico observado.
- RMSE log-growth: \(RMSE = \sqrt{\frac{1}{n}\sum_{t=1}^{n} e_t^2}\).
- Error porcentual aproximado del RMSE: \(\varepsilon \approx e^{RMSE} - 1\).

## Proyecciones ARIMA 2026-2035

- Se agrego una pestaña `Proyecciones` con graficos interactivos SVG para escenarios agregados y cadenas principales proyectadas a 2035.
- El script reproducible es `scripts/prepare_projections.ps1`.
- Los resultados procesados se guardan en `data/projections_data.json` y `data/projections_data.js`.
- La estimacion se realiza por cadena y operacion, usando las series anuales disponibles de exportaciones e importaciones.
- El forecast principal incluye solo cadenas con dato positivo en 2025. Se exige un minimo de 8 observaciones positivas para exportaciones y 4 para importaciones.
- Las cadenas discontinuas, sin actividad reciente o con historia insuficiente se excluyen del agregado proyectado y del ranking de cadenas para evitar extrapolaciones no robustas.
- El ITCRM multilateral se toma del archivo `ITCRMSerie.xlsx`, hoja `ITCRM y bilaterales prom. mens.`, convertido a promedio anual.
- La especificacion principal es un ARIMAX aproximado sobre `log(valor)`: diferencia anual, componente AR(1) del crecimiento logaritmico e ITCRM como regresor exogeno.
- Cuando una cadena no tiene suficientes observaciones para estimar el componente ARIMAX, se usa una caminata aleatoria con deriva sobre `log(valor)`.
- El horizonte llega a 2035. El escenario base usa el pronostico puntual y mantiene el ITCRM futuro constante en el ultimo promedio anual observado, porque no existen proyecciones de ITCRM en la carpeta.
- Los escenarios optimista y conservador aplican +/- 1 RMSE historico de crecimiento logaritmico por cadena.
- Las proyecciones son un ejercicio estadistico de sensibilidad; no son metas, presupuestos, proyecciones oficiales ni incorporan supuestos externos sobre precios, volumenes, proyectos, politica cambiaria o condiciones financieras.
- Las importaciones tienen menor robustez por contar con una serie historica mas corta.
- Robustez: se excluyen cadenas discontinuas o sin dato positivo reciente; la distancia entre escenarios refleja error historico estimado y no shocks externos discrecionales.
- Medidas de bondad de ajuste y precision disponibles: `rmse_log_growth` por cadena, tipo de modelo (`ARIMAX(1,1,0)` o `ARIMA(0,1,0) con deriva`) y error porcentual aproximado derivado del RMSE.
- AIC, BIC, MAE y MAPE no se muestran porque no fueron persistidos en el archivo procesado de proyecciones.

## ITCRB y comercio por destino/origen

- Se agrego la pestaña `ITCRB y comercio`.
- El script reproducible es `scripts/prepare_itcrb_data.ps1`.
- Los resultados procesados se guardan en `data/itcrb_data.json` y `data/itcrb_data.js`.
- El archivo fuente es `ITCRMSerie.xlsx`, hoja `ITCRM y bilaterales prom. mens.`.
- Las series mensuales de ITCRM e ITCRB se convierten a promedio anual.
- La pestaña muestra graficos separados para exportaciones e importaciones, ambos con doble eje: comercio en dolares en el eje izquierdo e indice ITCRM/ITCRB en el eje derecho.
- Se incorpora filtro de cadena con opciones `Todas las cadenas`, `Todo sin cadena minera` y cada cadena disponible.
- Para paises individuales se usa el campo de pais disponible en la base de comercio. Para `Zona Euro` y `Sudamerica` se agregan paises del grupo definidos en la app.
- La visualizacion no estima elasticidades ni causalidad; solo muestra co-movimientos observados.
- Para `Total multilateral` se suma todo el comercio filtrado y se usa ITCRM. Para paises o grupos se filtra el comercio por destino/origen y se usa el ITCRB correspondiente.

## Limitaciones

- `CADENA` se usa como gran rubro disponible, sin forzar categorias INDEC no presentes.
- `NOMENCLADOR`/`NOMEN` se conserva como codigo disponible, pero no se infiere seccion/capitulo/partida si la fuente no lo explicita.
- No se imputan paises, productos ni valores faltantes.
- Placeholders como `#N/A`, `N/A`, `S/D`, `-` y `0` en dimensiones se tratan como faltantes.
- No se infieren causas de variaciones.
- Las descargas Excel se ofrecen como archivo tabular compatible (`.xls`) con datos filtrados separados por `;`.
- Si se elige "Exportaciones e importaciones", los montos combinan bases con distinta valuacion original: FOB para exportaciones y CIF para importaciones.

## Validacion

- La app recalcula todos los indicadores sobre la seleccion filtrada.
- Las variaciones interanuales solo se muestran cuando existe anio previo.
- Los porcentajes usan total filtrado y evitan division por cero.
- Se muestran advertencias cuando una visualizacion no esta respaldada por variables fuente.
- La suma por producto y pais coincide con el total dentro de cada operacion, salvo diferencias de redondeo.
- Los totales por suma pueden no coincidir debido al redondeo de las cifras parciales.

