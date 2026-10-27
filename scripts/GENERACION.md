# Guía para generar un tema completo

Esta guía la sigue el agente que crea un tema nuevo cada día (y sirve de referencia para cualquier tema que se escriba a mano). Los temas 1–10 son el ejemplo de calidad: **léelos antes de escribir** (`content/topics/01.json`, `03.json`, `08.json` y `content/exams/03.json`).

## Qué se entrega por tema

Dos archivos y una actualización de índice:

| Archivo | Contenido |
|---|---|
| `content/topics/NN.json` | `estado: "completo"`, `sections`, `exercises`, `trabajo` |
| `content/exams/NN.json` | `levels` con `facil`, `medio` y `dificil`, con clave y explicación |
| `content/index.json` | lo actualiza `python scripts/next_topic.py --mark N` |

## Esquema de `topics/NN.json`

```json
{
  "week": 11,
  "estado": "completo",
  "sections": [ { "page": 1, "kind": "heading|definition|theory|list|table|diagram|code|warning", "title": "…", "body": "…" } ],
  "exercises": [ { "n": 1, "title": "Ejercicio 1 · …", "objective": "…", "steps": [ { "hacer": "…", "esperado": "…" } ], "example": "…", "verification": "…" } ],
  "trabajo": { "title": "Trabajo del Tema N · …", "description": "…", "estimated_minutes": 240 }
}
```

- **Tamaño mínimo:** 10 hojas (`page` 1..10 o más), 35 secciones o más, entre 4 000 y 7 000 palabras, 4 ejercicios o más.
- Las hojas siguen un flujo continuo: la hoja 1 abre directo en la teoría (el título del tema lo pone la app, no lo repitas), sin portada, sin «continuación» ni rótulos redundantes.
- Alterna **hojas de consulta** (tablas, código de referencia, flujos) con **hojas de práctica ejecutable** que se hacen en el computador.

## Formato del cuerpo (`body`)

Texto plano. La app interpreta:

- Viñetas con `• ` al inicio de línea.
- Una línea con sangría continúa la anterior.
- Bloques de código entre ``` ```…``` ``` (el código va **solo** en bloques o entre `comillas invertidas`).
- `**negrita**` para literales exactos dentro de una frase (rutas, comandos, valores).
- Tablas: filas separadas por saltos de línea y celdas por ` | `; la primera fila es el encabezado. `kind: "table"`.
- Diagramas: `kind: "diagram"`, texto con flechas `──►`, `▼`, `│`. **Nada de arte ASCII con cajas** (`+---+`); flujos sencillos que se dibujen con regla.
- `kind: "warning"` para reglas críticas y causas de fracaso (rojo).
- Prefijos como `Definición:`, `Regla:`, `Ejemplo:` se resaltan en azul automáticamente.

## Voz y método (heredados de la skill `cuaderno-universidad`)

1. **Voz impersonal** de libro de texto: tercera persona, sin «tú» ni «vamos a». Sin frases sobre el propio cuaderno, sin instrucciones de cómo estudiar, sin rótulos de generación.
2. **Nivel cero absoluto:** ningún paso usa un concepto o archivo que no se haya creado y explicado antes (en este tema o en uno anterior). Si hace falta algo de un tema posterior, se entrega el código completo para copiar y se explica solo lo mínimo.
3. **Síntesis exhaustiva sin relleno:** todos los conceptos, mecanismos, causas y efectos necesarios para aprobar a nivel universitario. Viñetas claras. Sin introducciones largas.
4. **Cinco colores** (los pone la app según `kind`): rojo = advertencias; azul = subtítulos y definiciones; negro = teoría; verde = flechas, notas y tablas; naranja = **solo** código y comandos.
5. Texto y código separados: cada bloque de código en su propia caja; las explicaciones fluyen en texto normal.
6. **Terminología y herramientas reales del mercado**, versiones actuales, sin trucos obsoletos. Cuando algo cambió recientemente, enseña la forma actual.
7. **Hilo de diseño:** si la ruta marca una nota de diseño para el tema (`diseno`), incorpora una sección sobre ello con criterio visual concreto.

## Ejercicios

Cada ejercicio: **objetivo**, **pasos numerados** (`hacer` + `esperado`: qué se observa), **ejemplo/resultado de referencia** y **verificación final**. Son la situación **guiada** del tema. Antes de los ejercicios, el Cuaderno incluye la práctica previa con los procedimientos que van a usarse.

## Trabajo

Una **situación nueva, distinta de la guiada**, que no viene resuelta y exige aplicar este tema **y lo acumulado**. Define el entregable concreto (repositorio, página, auditoría, sistema) y qué debe contener. Se entrega como enlace y explicación. Descripción en párrafos claros, 120–250 palabras. El tutor lo califica de 0 a 10; se aprueba con 9,0.

## Exámenes (`exams/NN.json`)

```json
{ "week": 11, "levels": { "facil": [Q…], "medio": [Q…], "dificil": [Q…] } }
Q = { "id": "11-f-01", "prompt": "…", "options": ["…","…","…","…"], "answer": 0, "explanation": "…" }
```

- **16 preguntas o más por nivel** (el intento sortea 12). `id`: `NN-f-01`, `NN-m-01`, `NN-d-01`.
- `facil` = definiciones, reconocimiento y comandos esenciales · `medio` = aplicar a un caso concreto (leer código, elegir la declaración correcta) · `dificil` = diagnóstico: dado un síntoma o error, hallar la causa o el mejor arreglo.
- Cuatro opciones, **una sola correcta**, tres distractores plausibles (errores típicos). Prohibido «todas/ninguna/ambas las anteriores».
- **La posición correcta debe variar** (máximo 40 % en un mismo índice) y **la correcta no debe ser sistemáticamente la más larga** (máximo 40 %). Escribe deliberadamente distractores largos.
- La **explicación** (1–3 frases) dice por qué la correcta lo es y por qué cae la tentación más probable.
- Cada enunciado es autocontenido (incluye el fragmento de código dentro).
- **Determina la clave razonando**, no por la forma de las opciones.

## Verificación obligatoria

```bash
python scripts/validate_content.py      # debe terminar en OK
```

Además, antes de subir: relee 5 preguntas al azar y confirma que la clave es correcta; comprueba que cada afirmación técnica es verdadera hoy.

## Publicación

```bash
python scripts/next_topic.py --mark N
gh auth switch -u Straikker98
git add content && git commit -m "Tema N: <título>" && git push origin main
```

GitHub Pages se actualiza solo. **Nunca** incluyas claves, tokens ni datos personales.
