# Comercio exterior de San Juan

Aplicacion web interactiva para analizar exportaciones, importaciones, PGB, concentracion comercial, ITCRM/ITCRB y proyecciones ARIMA/ARIMAX de la provincia de San Juan a partir de los archivos disponibles en esta carpeta.

<p>
  <a href="#ejecutar"><img alt="Ejecutar" src="https://img.shields.io/badge/%E2%96%A3%20Ejecutar-index.html-0f172a?style=for-the-badge"></a>
  <a href="#actualizar-datos"><img alt="Actualizar datos" src="https://img.shields.io/badge/%E2%97%86%20Actualizar-datos-1e3a5f?style=for-the-badge"></a>
  <a href="#proyecciones"><img alt="Proyecciones" src="https://img.shields.io/badge/%E2%97%BC%20Proyecciones-ARIMA%2FARIMAX-374151?style=for-the-badge"></a>
  <a href="#metodologia"><img alt="Metodologia" src="https://img.shields.io/badge/%E2%97%BB%20Metodologia-fuentes%20y%20formulas-3f3f46?style=for-the-badge"></a>
</p>

## Vista General

| Modulo | Contenido |
|---|---|
| &#9635; Resumen ejecutivo | KPIs, principales resultados, concentracion, PGB y filtros globales. |
| &#9724; Executive Trade Assessment | Informe automatico para lectura financiera e institucional. |
| &#9670; Evolucion | Series anuales, variacion interanual, tendencia y marcadores de `% PGB`. |
| &#9671; Productos y destinos | Rankings, composicion por cadena, matriz producto-mercado y continentes. |
| &#9636; Proyecciones | Escenarios base, optimista y conservador hasta 2035. |
| &#9637; ITCRB y comercio | Exportaciones/importaciones por destino u origen vinculadas a ITCRM/ITCRB. |
| &#9639; Metodologia | Fuentes, formulas LaTeX, rangos HHI, robustez y sensibilidad del modelo. |

## Ejecutar

La aplicacion es estatica. No requiere servidor local.

1. Abrir [index.html](index.html) en un navegador moderno.
2. Usar el filtro `Operacion` para alternar entre exportaciones, importaciones o ambas series.
3. Aplicar filtros laterales por anio, cadena, producto, nomenclador, pais, continente y unidad.

La app usa SVG nativo y datos procesados en `data/*.js`. MathJax se carga por CDN para renderizar formulas LaTeX en la metodologia; si no hay conexion, las formulas quedan visibles en notacion LaTeX.

## Actualizar Datos

Los archivos fuente no se modifican durante la preparacion.

```powershell
powershell -ExecutionPolicy Bypass -File scripts\prepare_data.ps1
```

Regenera:

| Archivo | Uso |
|---|---|
| `data/processed_data.json` | Base procesada en formato JSON. |
| `data/processed_data.js` | Datos consumidos por el navegador. |
| `data/metadata.json` | Auditoria tecnica y metadatos de procesamiento. |

Pasos recomendados:

1. Reemplazar `Serie exportaciones 2003-mayo 2026.xlsx` y/o `Serie importaciones 2021-mayo 2026.xlsx` por versiones nuevas con estructura equivalente.
2. Verificar hojas tabulares equivalentes a `Base 2003-2026 procesada` y `Base 2021-2026 procesada`.
3. Si cambia el nombre del archivo o de la hoja, ajustar `scripts/prepare_data.ps1` y `scripts/prepare_data.py`.
4. Ejecutar nuevamente el script de preparacion.
5. Abrir `index.html` y revisar KPIs, graficos, tablas y descargas.

Nota: los scripts excluyen `ANIO = 2026` del analisis por definicion del proyecto.

## Proyecciones

Las proyecciones 2026-2035 se calculan por cadena y operacion con un esquema ARIMA/ARIMAX reproducible.

```powershell
powershell -ExecutionPolicy Bypass -File scripts\prepare_projections.ps1
```

Entradas principales:

| Entrada | Descripcion |
|---|---|
| `data/processed_data.json` | Series anuales de comercio por cadena. |
| `ITCRMSerie.xlsx` | ITCRM multilateral usado como regresor exogeno cuando corresponde. |

Salidas:

| Archivo | Contenido |
|---|---|
| `data/projections_data.json` | Proyecciones, modelos y metricas por cadena. |
| `data/projections_data.js` | Datos de proyecciones para la app. |

Supuestos principales:

- Escenario base: pronostico puntual por cadena.
- Escenarios optimista y conservador: `+/- 1 RMSE` historico del crecimiento logaritmico.
- ITCRM futuro constante en el ultimo promedio anual observado.
- Sin supuestos externos de precios, volumenes, proyectos, politica cambiaria o condiciones financieras.

## ITCRB y Comercio

Para regenerar la serie anual de ITCRM/ITCRB:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\prepare_itcrb_data.ps1
```

Regenera:

| Archivo | Contenido |
|---|---|
| `data/itcrb_data.json` | Promedios anuales de ITCRM e ITCRB. |
| `data/itcrb_data.js` | Datos consumidos por la pestaña `ITCRB y comercio`. |

La pestaña compara comercio anual en dolares con el indice ITCRM/ITCRB. La lectura es descriptiva: no estima causalidad, elasticidades ni pass-through.

## Metodologia

La pestaña metodologica documenta:

- fuentes institucionales INDEC y BCRA;
- formulas en LaTeX;
- rangos de interpretacion de HHI, volatilidad y diversificacion;
- supuestos de proyeccion ARIMA/ARIMAX;
- medidas de bondad de ajuste y precision disponibles;
- calculo de ITCRB y comercio.

Documentos complementarios:

| Documento | Contenido |
|---|---|
| [data_audit.md](data_audit.md) | Auditoria de archivos, campos, calidad y transformaciones. |
| [technical_notes.md](technical_notes.md) | Decisiones tecnicas, formulas, limitaciones y validaciones. |

## Descargas

La aplicacion permite:

| Accion | Resultado |
|---|---|
| `Descargar CSV` | Datos filtrados en formato CSV. |
| `Tabla Excel` | Tabla compatible con Excel. |
| `PNG` | Exportacion de graficos SVG como imagen PNG. |
| `Resumen PDF` | Impresion del resumen ejecutivo desde el navegador. |
| `Imprimir informe` | Impresion del Executive Trade Assessment. |

Cada descarga utiliza la seleccion activa de filtros.

## Estructura

```text
/
|-- index.html
|-- css/
|   `-- styles.css
|-- js/
|   |-- app.js
|   |-- charts.js
|   |-- filters.js
|   |-- indicators.js
|   `-- data-loader.js
|-- data/
|   |-- processed_data.json
|   |-- processed_data.js
|   |-- projections_data.json
|   |-- projections_data.js
|   |-- itcrb_data.json
|   |-- itcrb_data.js
|   `-- metadata.json
|-- scripts/
|   |-- prepare_data.ps1
|   |-- prepare_data.py
|   |-- prepare_projections.ps1
|   |-- prepare_itcrb_data.ps1
|   `-- static_server.ps1
|-- assets/
|-- README.md
|-- data_audit.md
`-- technical_notes.md
```

## Publicacion En GitHub Pages

1. Subir el proyecto completo a un repositorio de GitHub.
2. Confirmar que `index.html`, `css/`, `js/` y `data/` esten versionados.
3. En GitHub, ir a `Settings > Pages`.
4. Elegir la rama principal y la carpeta raiz.
5. Guardar la configuracion.

GitHub Pages servira la app como sitio estatico. Si se actualiza la base, regenerar los archivos de `data/` y subirlos junto con el resto de los cambios.

## Fuentes Institucionales

| Fuente | Uso |
|---|---|
| INDEC | Comercio exterior de bienes, exportaciones e importaciones provinciales. |
| Banco Central de la Republica Argentina | ITCRM e indices bilaterales ITCRB. |
| PGB USD San Juan | Serie local de PGB dolarizado utilizada como denominador macroeconomico. |

Los totales por suma pueden no coincidir debido al redondeo de las cifras parciales.
