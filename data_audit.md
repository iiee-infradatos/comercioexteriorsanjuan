# Auditoria de Datos

Fecha de auditoria: 2026-07-14.

## Archivos encontrados

| Archivo | Formato | Tamano | Contenido identificado | Uso en la app |
|---|---:|---:|---|---|
| `Serie exportaciones 2003-mayo 2026.xlsx` | Excel | 1.665.199 bytes | Hojas `Base 2003-2026 procesada` y `Tabla dinamica`. Base tabular con exportaciones de San Juan. | Fuente principal. |
| `Serie importaciones 2021-mayo 2026.xlsx` | Excel | 527.070 bytes | Hojas `Base 2021-2026 procesada` y `Tabla dinamica`. Base tabular de importaciones de San Juan. | Fuente secundaria incorporada. |
| `Serie 2004-2025 PGB Dolarizada 17.06.xlsx` | Excel | 81.128 bytes | Hoja `V.Agregado U$S` con Producto Geografico Bruto de San Juan dolarizado por rama/concepto. | Usado para incorporar PGB USD San Juan. |
| `Datos Pedidos a Tania 02.07 (1).xlsx` | Excel | 104.415 bytes | Hojas de actividad economica, PGB, per capita y una hoja `EXPO`. La hoja `Per capita` contiene una serie alternativa de `PGB USD`. | Inspeccionado; reemplazado por la serie especifica 2004-2025 indicada por el usuario. |
| `ITCRMSerie.xlsx` | Excel | 3.650.007 bytes | Serie de tipo de cambio real multilateral y bilaterales. | Inspeccionado; no usado porque no es comercio provincial por producto/destino. |
| `resumen-cadenas.csv` | CSV `;` | 174.465 bytes | 2.046 filas con categorias/cadenas, indicadores, unidad, anio y valor. | Inspeccionado; no usado porque no trae clave directa a producto/destino de San Juan. |
| `informe-final.pdf` | PDF | 778.490 bytes | Informe documental. | No usado como dato estructurado. |

## Bases utilizadas

### Exportaciones

Archivo: `Serie exportaciones 2003-mayo 2026.xlsx`  
Hoja: `Base 2003-2026 procesada`

| Campo original | Campo normalizado | Uso |
|---|---|---|
| `AÑO` | `year`, `period` | Periodo anual. |
| `NOMENCLADOR` | `ncm` | Codigo o nomenclador de producto. |
| `PRODUCTO` | `product` | Descripcion del producto exportado. |
| `CADENA` | `rubro` | Categoria/cadena productiva usada como gran rubro disponible. |
| `PAIS` | `country` | Pais de destino. |
| `CONTINENTE` | `continent` | Region geografica para filtros y agregados. |
| `U$S FOB` | `fob_usd`, `fob_millions` | Valor FOB en dolares y millones de dolares. |
| `PESO NETO (KG)` | `weight` | Peso neto en kilogramos. |

### Importaciones

Archivo: `Serie importaciones 2021-mayo 2026.xlsx`  
Hoja: `Base 2021-2026 procesada`

| Campo original | Campo normalizado | Uso |
|---|---|---|
| `AÑO` | `year`, `period` | Periodo anual. |
| `NOMEN` | `ncm` | Codigo o nomenclador de producto. |
| `PRODUCTO` | `product` | Descripcion del producto importado. |
| `CADENA` | `rubro` | Categoria/cadena disponible. |
| `COD PAIS` | no usado | Codigo pais de fuente, conservado solo en archivo original. |
| `PAIS` | `country` | Pais de origen/procedencia segun la base. |
| `CONTINENTE` | `continent` | Region geografica para filtros y agregados. |
| `U$S CIF` | `fob_usd`, `fob_millions` | Valor CIF en dolares y millones de dolares. Se conserva el nombre tecnico de campo comun para compatibilidad interna. |
| `PESO NETO (KG)` | `weight` | Peso neto en kilogramos. |

### PGB USD San Juan

Archivo: `Serie 2004-2025 PGB Dolarizada 17.06.xlsx`  
Hoja: `V.Agregado U$S`  
Fila utilizada: `Total` / `Sectores`

Valores disponibles:

- 2004 a 2025.
- La hoja indica unidad `Miles de dolares (U$S)`. Los valores 2004-2024 se convirtieron multiplicando por 1.000.
- La ultima columna aparece con encabezado duplicado `2024(*)`; por consistencia con el nombre del archivo y el orden de la serie se interpreta como 2025.
- El valor de esa ultima columna se encuentra en escala de millones; se convirtio multiplicando por 1.000.000.

## Cobertura

- Registros procesados totales: 24.437.
- Exportaciones: 20.772 registros, 2003 a 2025, 937 productos, 176 paises, 34 cadenas/rubros, US$ FOB 29.985.347.960,43.
- Importaciones: 3.665 registros, 2021 a 2025, 809 productos, 29 paises, 24 cadenas/rubros, US$ CIF 391.455.520,85.
- PGB: 22 anios, 2004 a 2025.
- Periodicidad: anual en las bases de comercio.
- El anio 2026 fue excluido del analisis por pedido del usuario.
- El porcentaje sobre PGB se calcula solo para anios con PGB disponible: 2004-2025.

## Variables no encontradas

- Mes o periodo mensual.
- Cantidades fisicas distintas de peso neto.
- Codigos ISO de paises.
- Geometrias o GeoJSON para mapa coropletico.
- Exportaciones nacionales comparables.
- Poblacion provincial para calculo per capita.
- Indicador explicito de datos provisorios, estimados o confidenciales.

Por estas ausencias, la app omite o advierte sobre graficos mensuales, acumulados mensuales, estacionalidad mensual, participacion de San Juan en comercio nacional, exportaciones/importaciones per capita y mapa mundial coropletico.

## Calidad de datos

- Faltantes en `PRODUCTO`: 2, normalizados desde placeholders como `0`.
- Faltantes en `PAIS`: 1, normalizado desde placeholders como `#N/A`.
- Faltantes en `CADENA`: 0.
- Faltantes en `NOMENCLADOR`: 2, normalizados desde placeholders como `#N/A`.
- Faltantes en `PESO NETO (KG)`: 0.
- Grupos duplicados exactos detectados por anio, nomenclador, producto, cadena, pais, continente, FOB y peso: 4. Se conservaron porque pueden representar registros administrativos separados con iguales valores; no se eliminan datos fuente.
- Importaciones no presentan faltantes en producto, pais, nomenclador ni peso neto luego de la normalizacion aplicada.

## Transformaciones realizadas

- Lectura de Excel como OpenXML sin modificar archivos originales.
- Normalizacion de texto: recorte de espacios y colapso de espacios multiples.
- Normalizacion de placeholders (`#N/A`, `N/A`, `S/D`, `-` y `0` en dimensiones) como valores faltantes.
- Conversion numerica de valores con separadores argentinos o invariantes.
- Normalizacion de periodo anual como `YYYY`.
- Exclusion de registros con `AÑO = 2026`.
- Conversion de `U$S FOB` y `U$S CIF` a un campo comun `fob_usd`/`fob_millions` para calculo interno. En la interfaz y metodologia se aclara la unidad original de cada operacion.
- Incorporacion de `PGB USD San Juan` como denominador anual para calcular exportaciones/PGB o importaciones/PGB cuando corresponde.
- Generacion de agregados dinamicos en la app por anio, producto, cadena, pais, continente y matriz producto-destino.
- Generacion de `data/processed_data.json`, `data/metadata.json` y `data/processed_data.js`.

## Validaciones realizadas

- La suma general de registros procesados se usa como total de control para KPIs.
- Las participaciones se calculan dinamicamente contra el total filtrado.
- Las variaciones interanuales comparan anios consecutivos equivalentes.
- Se evita dividir por cero y se muestra `s/d` o advertencia cuando falta comparacion.

Nota obligatoria: los totales por suma pueden no coincidir debido al redondeo de las cifras parciales.

