# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

"Ruta Full Stack": PWA personal de estudio (60 temas, 10 fases). Sitio estático en español, **sin build, sin package.json, sin linter, sin tests automáticos**: HTML + CSS + módulos ES nativos. Toda la UI y el contenido están en español.

## Comandos

```bash
python -m http.server 8000          # desarrollo local (file:// no funciona: se leen JSON por fetch)
python scripts/validate_content.py  # valida exámenes (≥15 preguntas/nivel, 4 opciones, clave+explicación, posiciones balanceadas)
python scripts/next_topic.py        # informa qué tema toca generar hoy (JSON); --mark N lo registra en content/index.json
```

Despliegue: GitHub Pages sirve la raíz; el backend se publica con `clasp push` / `clasp deploy` desde `apps-script/`.

## Arquitectura

- **Contenido separado del progreso.** `content/` (route, checklist, badges, config, `topics/NN.json`, `exams/NN.json`, `index.json`) es público y versionado. El progreso (notas, XP, respuestas) vive en `localStorage` (`rfs.state.v1`) y se sincroniza con Google Sheets.
- `js/main.js`: enrutador por hash (tabla `ROUTES`) + barra superior (cronómetro de sesión, estado de sync). Las vistas están en `js/views/` y se importan estáticamente.
- `js/logic.js`: **todas las reglas de desbloqueo** (cadena Cuaderno → ejercicios → trabajo → exámenes Fácil/Medio/Difícil, `PASS = 9.0`, XP, rachas). Cambiar reglas aquí, no en las vistas.
- `js/store.js`: estado único (`state()`, `mutate`, `subscribe`, `defaults`). `js/sync.js`: cliente de Apps Script; protege el progreso (un dispositivo "virgen" nunca sobrescribe la nube; el arranque espera la primera sincronización; el servidor también rechaza estados vacíos).
- `apps-script/Code.gs`: backend (doGet/doPost) sobre Google Sheets. Acciones del estudiante sin clave; las del tutor (calificar entregas, leer respaldos) exigen clave en las propiedades del script. `Claves.gs`, `.clasp.json` y `.clasprc.json` están en `.gitignore`: nunca versionarlos. Respaldos automáticos en hoja `Respaldos`.
- `sw.js`: caché de "cascarón" + contenido, con actualización en segundo plano; nunca intercepta el backend. **Al añadir/renombrar archivos CSS/JS hay que actualizarlos en `SHELL` y subir `VERSION`** para que los clientes se actualicen.
- `css/`: `tokens.css` (variables, tema claro/oscuro, acentos, color por fase `--ph-N`), `base.css` (todos los componentes), `cuaderno.css`, `lab.css`. `js/fx.js` (confeti, +XP, contadores) y `js/palette.js` (Ctrl+K) son efectos de interfaz; `util.toast` dispara confeti cuando el mensaje contiene `+N XP`.

## Generar contenido de temas

Un tema = `content/topics/NN.json` + `content/exams/NN.json` + marcar en `index.json` (`next_topic.py --mark N`). **Leer `scripts/GENERACION.md` antes de escribir**: define el esquema, tamaño mínimo (≥10 hojas, ≥35 secciones, 4 000–7 000 palabras, ≥4 ejercicios), el formato del `body` (viñetas `• `, tablas con ` | `, sin arte ASCII), la voz impersonal y la regla de nivel cero (no usar conceptos no enseñados antes). Los temas 1–11 están completos; tomar 01, 03, 08 y exams/03 como referencia de calidad. Después de generar, correr `validate_content.py`.

`tmp/` está ignorado (scripts/entradas temporales de generación).
