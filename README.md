# Control y Seguimiento · Ruta Full Stack (versión independiente)

Versión independiente y autocontenida de la plataforma de estudio Full Stack de Alejandro Osorio Loaiza (Alejo). Replica la plataforma que vive en Muse y **se alimenta del respaldo completo** exportado desde ella.

## Qué contiene

- `index.html` · `styles.css` · `app.js` — la aplicación (sin dependencias ni paso de compilación).
- `respaldo.json` — respaldo completo generado desde la app de Muse el 26 de octubre de 2026: 48 semanas, 289 acciones, 407 secciones del Cuaderno, 117 ejercicios, 48 trabajos, 144 evaluaciones, 191 preguntas y el progreso real al momento de exportar.

## Vistas

Hoy (semana en curso, checklist y contadores) · Ruta (8 fases, 48 semanas) · Cuaderno (fundamentación por hojas, con ejercicios) · Trabajos (consigna, estado, nota y retroalimentación del experto) · Evaluaciones (3 niveles con sus exámenes de selección única) · Insignias · Perfil.

## Cómo abrirla

Es un sitio estático. Dos opciones:

1. **Local:** en la carpeta del proyecto ejecuta `python3 -m http.server 8000` y abre `http://localhost:8000`.
2. **GitHub Pages:** en el repositorio, Settings → Pages → publicar desde la rama `main`, carpeta raíz.

Abrir `index.html` directo con `file://` puede fallar en algunos navegadores porque bloquean la lectura del JSON local.

## Diferencias frente a la app de Muse

- Los marcados del checklist y las respuestas de examen se guardan **solo en el navegador** (localStorage).
- **No hay autocalificación:** las notas que se ven son las que el experto ya puso en la app de Muse; las evaluaciones nuevas se rinden y se califican allí.
- Los retratos de los avatares viven en la app de Muse; aquí el avatar se representa con iniciales.
- Es una foto de los datos al día del respaldo: no se actualiza sola.

## Cómo actualizar los datos

1. En la app de Muse: Registro → Perfil y XP → **Descargar respaldo JSON**.
2. Reemplaza `respaldo.json` de este repositorio por el archivo descargado.
3. Sube el cambio (`git add respaldo.json && git commit -m "Actualiza respaldo" && git push`).
