# Ruta Full Stack

Plataforma de estudio para aprender **desarrollo Full Stack de cero**: una ruta de 60 temas en 10 fases, con Cuaderno de teoría, ejercicios guiados, trabajos calificados por un tutor y exámenes autocalificados. Funciona en el computador y en el celular, y se instala como app (PWA) con modo sin conexión.

**Abrir:** https://straikker98.github.io/control-ruta-full-stack/

## Cómo se estudia

Cada tema sigue la misma cadena, en orden, y un paso no se abre hasta cumplir el anterior:

1. **Iniciar** el tema (solo uno en curso a la vez).
2. **Fundamentación**: el Cuaderno, hoja por hoja, con código de 5 colores.
3. **Ejercicios guiados**: objetivo, pasos, resultado esperado y verificación.
4. **Trabajo**: una situación nueva, sin guía. Lo califica el tutor de 0 a 10 con retroalimentación.
5. **Tres exámenes** (Fácil, Medio, Difícil) de selección única, autocalificados. 12 preguntas por intento que rotan entre un banco de 15 o más por nivel.
6. **Cierre**: se aprueba todo con **9,0 o más**.

Extras: repaso espaciado de las preguntas falladas, cronómetro de sesión con meta diaria, XP y racha (desactivables), 18 insignias de habilidades con tres niveles y avatares generados.

## La ruta

| Fases | Temas | Contenido |
|---|---|---|
| 1–2 | 1–12 | Web, terminal, HTML, formularios, Git, publicación; CSS, layout, responsive, sistema visual, accesibilidad |
| 3–4 | 13–24 | JavaScript, módulos, asincronía, pruebas; DOM, fetch, estado de interfaz, persistencia |
| 5–6 | 25–36 | SQL y PostgreSQL; Node.js, API REST, arquitectura, autenticación |
| 7–8 | 37–48 | TypeScript y React; Supabase, Vercel, producción y capstone |
| 9 | 49–54 | Linux avanzado, Docker, CI/CD, nube, Next.js, seguridad web |
| 10 | 55–60 | Algoritmos, Python, diseño de sistemas, IA aplicada, portafolio y entrevistas |

Una línea transversal de **diseño UX/UI** recorre las fases 2, 4 y 7.

## Cómo está hecha

Sitio estático, **sin paso de compilación**: HTML, CSS y JavaScript con módulos ES.

```
index.html · manifest.webmanifest · sw.js
css/        tokens, componentes y la hoja del Cuaderno
js/         main (enrutador), logic (reglas), store (estado), sync (nube), views/
content/    CONTENIDO PÚBLICO: route, checklist, badges, topics/NN, exams/NN
apps-script/  backend en Google Apps Script sobre Google Sheets
scripts/    validate_content.py, migrate_from_respaldo.py
```

**Contenido y progreso están separados.** El repositorio solo contiene contenido. El progreso (notas, XP, respuestas, retroalimentación) vive en el navegador de cada dispositivo y se sincroniza con una hoja de Google Sheets privada mediante una clave que **nunca** se guarda en el código.

## Backend

`apps-script/Code.gs` es una aplicación web de Apps Script con acciones para leer y guardar el estado, recibir entregas y registrar intentos. Cada petición exige una clave: una de estudiante (leer y escribir su progreso) y otra de tutor (listar y calificar entregas). Las claves viven en las propiedades del script, no en este repositorio.

Despliegue con [clasp](https://github.com/google/clasp): `clasp push` y `clasp deploy`.

## Contenido

El contenido de cada tema se valida con:

```bash
python scripts/validate_content.py
```

Comprueba que cada examen tenga al menos 15 preguntas por nivel, cuatro opciones, una respuesta correcta con explicación, posiciones de respuesta balanceadas y que la correcta no sea sistemáticamente la más larga.

## Desarrollo local

```bash
python -m http.server 8000
# abrir http://localhost:8000
```

Abrir `index.html` con `file://` no funciona: el navegador bloquea la lectura de los JSON.
