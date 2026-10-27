#!/usr/bin/env python3
"""Migración única: respaldo.json (Muse) -> archivos de contenido públicos.

Separa CONTENIDO (público) de PROGRESO (privado: notas, XP, respuestas, retroalimentación).
Uso: python scripts/migrate_from_respaldo.py respaldo.json
"""
import json, sys, os, re, collections

SRC = sys.argv[1] if len(sys.argv) > 1 else 'respaldo.json'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C = os.path.join(ROOT, 'content')
os.makedirs(os.path.join(C, 'topics'), exist_ok=True)
os.makedirs(os.path.join(C, 'exams'), exist_ok=True)
os.makedirs(os.path.join(ROOT, 'tmp', 'exam-input'), exist_ok=True)

d = json.load(open(SRC, encoding='utf-8'))['data']
W = lambda r: int(r['week'])


def dump(path, obj):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)


# ---------------------------------------------------------------- ruta (60 semanas)
PHASES = [
    (1, 'Fundamentos de la web y control del entorno', 'Entender cómo funciona la web y dominar tu entorno de trabajo.'),
    (2, 'CSS, diseño adaptable y experiencia de usuario', 'Construir interfaces claras, accesibles y con criterio visual.'),
    (3, 'JavaScript de verdad: lenguaje, datos y lógica', 'Programar con JavaScript con lógica, datos, módulos y pruebas.'),
    (4, 'Navegador, APIs y aplicaciones con datos', 'Hacer aplicaciones que consumen APIs y guardan datos.'),
    (5, 'SQL y PostgreSQL: el corazón de los datos', 'Modelar, consultar y proteger datos relacionales.'),
    (6, 'Backend con Node.js y APIs mantenibles', 'Construir servidores y APIs REST ordenadas y seguras.'),
    (7, 'React y TypeScript para interfaces escalables', 'Crear interfaces escalables con tipos y componentes.'),
    (8, 'Supabase, Vercel y operación en producción', 'Llevar una aplicación completa a producción.'),
    (9, 'Ingeniería profesional: contenedores, CI/CD, nube y seguridad', 'Trabajar como en un equipo real: reproducible, automatizado y seguro.'),
    (10, 'Ingeniería de software y empleabilidad', 'Algoritmos, diseño de sistemas, Python, IA aplicada y búsqueda de empleo.'),
]

NEW_WEEKS = [
    (49, 9, 'Linux y terminal avanzada', 'Shell scripting, permisos, procesos, redes básicas y SSH.', 'Script de automatización documentado'),
    (50, 9, 'Docker', 'Imágenes, contenedores, volúmenes, redes y Docker Compose.', 'Stack local reproducible con Compose'),
    (51, 9, 'CI/CD con GitHub Actions', 'Flujos de trabajo, pruebas automáticas, build y despliegue continuo.', 'Pipeline que prueba, construye y despliega'),
    (52, 9, 'Nube y despliegue', 'IAM, cómputo, almacenamiento, bases gestionadas, costos y observabilidad básica.', 'Aplicación desplegada con costos documentados'),
    (53, 9, 'Next.js', 'App Router, Server Components, renderizado SSR/SSG y rutas de API.', 'Aplicación Next.js con datos del servidor'),
    (54, 9, 'Seguridad web', 'OWASP Top 10, XSS, CSRF, inyección SQL, secretos, cabeceras y dependencias.', 'Auditoría con correcciones verificadas'),
    (55, 10, 'Estructuras de datos y algoritmos I', 'Complejidad, arrays, hash, pilas, colas, búsqueda y patrones básicos.', '30 problemas resueltos con análisis de complejidad'),
    (56, 10, 'Estructuras de datos y algoritmos II', 'Recursión, árboles, grafos, ordenamiento y programación dinámica inicial.', 'Resolución de problemas tipo entrevista'),
    (57, 10, 'Python para backend', 'Sintaxis, tipos, FastAPI, validación y pruebas con pytest.', 'API en FastAPI equivalente a la de Node'),
    (58, 10, 'Diseño de sistemas y arquitectura', 'Escalado, caché, colas, consistencia, trade-offs y observabilidad.', 'Documento de diseño con decisiones justificadas'),
    (59, 10, 'IA aplicada al desarrollo', 'APIs de modelos, prompts, RAG básico, evaluación y desarrollo asistido con criterio.', 'Funcionalidad con IA y política de uso responsable'),
    (60, 10, 'Portafolio, inglés técnico y entrevistas', 'CV, GitHub, LinkedIn, entrevistas técnicas y conductuales, negociación.', 'Portafolio publicado y simulacros de entrevista'),
]

# Hilo transversal de diseño UX/UI (se muestra como "Diseño" en la semana)
DISEÑO = {
    7: 'Jerarquía visual: tamaño, peso y contraste antes de agregar color.',
    8: 'Retícula y ritmo: espaciado consistente con una escala de 4/8 px.',
    9: 'Diseño móvil primero: priorizar contenido y zonas táctiles de 44 px.',
    10: 'Sistema de diseño: tokens de color, tipografía y espaciado reutilizables.',
    11: 'Diseño inclusivo: contraste, foco visible y estados para todos los usuarios.',
    12: 'Pulido: alineación, consistencia y revisión crítica antes/después.',
    19: 'Feedback inmediato: cada acción del usuario recibe respuesta visible.',
    21: 'Estados de interfaz diseñados: carga, vacío, error y éxito con mensaje útil.',
    24: 'Revisión de flujo completo con un usuario real y registro de fricciones.',
    38: 'Diseño de componentes: variantes, estados y API clara.',
    39: 'Formularios que guían: validación visible, ayuda en contexto y errores humanos.',
    41: 'Wireframe y prototipo del flujo en Figma antes de programar.',
    46: 'Microinteracciones con propósito: animar solo lo que aporta comprensión.',
    48: 'Capstone con diseño cuidado: portafolio visual, caso de estudio y demo.',
}

weeks = []
for r in sorted(d['route_weeks'], key=W):
    w = W(r)
    weeks.append({'week': w, 'phase': int(r['phase']), 'title': r['title'], 'mastery': r['mastery'],
                  'evidence': r['evidence_goal'], 'design': DISEÑO.get(w, '')})
for w, ph, t, m, e in NEW_WEEKS:
    weeks.append({'week': w, 'phase': ph, 'title': t, 'mastery': m, 'evidence': e, 'design': DISEÑO.get(w, '')})
route = {'phases': [{'id': i, 'title': t, 'summary': s, 'weeks': [x['week'] for x in weeks if x['phase'] == i]}
                    for i, t, s in PHASES], 'weeks': weeks}
dump(os.path.join(C, 'route.json'), route)

# ---------------------------------------------------------------- checklist
chk = collections.defaultdict(list)
for t in sorted(d['week_tasks'], key=lambda t: (W(t), int(t['sort_order']))):
    chk[W(t)].append(t['title'])
for w, ph, t, m, e in NEW_WEEKS:
    chk[w] = [
        'Días 1–2 · Teoría del cuaderno (~2 h diarias): estudia y transcribe la fundamentación de «%s».' % t,
        'Día 3 · Práctica guiada: resuelve los ejercicios del tema paso a paso.',
        'Día 4 · Práctica independiente: repite sin guía lo esencial y registra tus errores.',
        'Día 5 · Trabajo: construye la entrega del tema (%s).' % e.lower(),
        'Día 6 · Evaluaciones: presenta Fácil, Medio y Difícil, en orden.',
        'Día 7 · Cierre de la semana: repaso de 30 minutos, registra tu sesión y deja lista la siguiente.',
    ]
dump(os.path.join(C, 'checklist.json'), {str(k): v for k, v in sorted(chk.items())})

# ---------------------------------------------------------------- temas 1-10 reales
asg = {W(a): a for a in d['assignments']}
by_sec = collections.defaultdict(list)
for s in d['notebook_sections']:
    by_sec[W(s)].append(s)
by_ex = collections.defaultdict(list)
for e in d['topic_exercises']:
    by_ex[W(e)].append(e)
qs_by = collections.defaultdict(list)
asm = {a['id']: a for a in d['assessments']}
for q in d['assessment_questions']:
    qs_by[W(q)].append(q)


def split_step(s):
    if ' → ' in s:
        a, b = s.split(' → ', 1)
        return {'hacer': a.strip(), 'esperado': b.strip()}
    return {'hacer': s.strip(), 'esperado': ''}


done_weeks = []
for w in sorted(by_sec):
    secs = sorted(by_sec[w], key=lambda s: int(s['sort_order']))
    exs = sorted(by_ex[w], key=lambda e: int(e['sort_order']))
    a = asg[w]
    topic = {
        'week': w, 'estado': 'completo',
        'sections': [{'page': int(s['page']), 'kind': s['kind'], 'title': s['title'], 'body': s['body']} for s in secs],
        'exercises': [{'n': i + 1, 'title': e['title'], 'objective': e['objective'], 'steps': [split_step(x) for x in e['steps']],
                       'example': e['example'], 'verification': e['verification']} for i, e in enumerate(exs)],
        'trabajo': {'title': a['title'], 'description': a['description'], 'estimated_minutes': int(a['estimated_minutes'] or 240)},
    }
    dump(os.path.join(C, 'topics', '%02d.json' % w), topic)
    done_weeks.append(w)
    # entrada para los agentes que escriben el banco de preguntas (sin claves: no existen)
    inp = {'week': w, 'title': next(x['title'] for x in weeks if x['week'] == w),
           'existing_questions': [{'level': q['level'], 'prompt': q['prompt'],
                                   'options': q['options'] if isinstance(q['options'], list) else json.loads(q['options'])}
                                  for q in sorted(qs_by[w], key=lambda q: (q['level'], int(q['sort_order'])))]}
    dump(os.path.join(ROOT, 'tmp', 'exam-input', '%02d.json' % w), inp)

# ---------------------------------------------------------------- temas 11-60: esqueleto
for x in weeks:
    w = x['week']
    if w in done_weeks:
        continue
    a = asg.get(w)
    topic = {'week': w, 'estado': 'pendiente', 'sections': [], 'exercises': [],
             'trabajo': {'title': (a['title'] if a else 'Trabajo del Tema %d · %s' % (w, x['title'])), 'description': '', 'estimated_minutes': 240}}
    dump(os.path.join(C, 'topics', '%02d.json' % w), topic)

dump(os.path.join(C, 'index.json'), {'version': 1, 'topics_completos': done_weeks, 'total_weeks': len(weeks)})

# ---------------------------------------------------------------- insignias (18 x 3 niveles)
BADGES = [
    ('terminal', 'Terminal y entorno', 1), ('html', 'HTML', 3), ('git', 'Git y GitHub', 5), ('css', 'CSS', 7),
    ('javascript', 'JavaScript', 13), ('sql', 'SQL y PostgreSQL', 25), ('node', 'Node.js', 31), ('rest', 'APIs REST', 32),
    ('typescript', 'TypeScript', 37), ('react', 'React', 38), ('supabase', 'Supabase', 43), ('vercel', 'Despliegue en Vercel', 47),
    ('docker', 'Docker', 50), ('cicd', 'CI/CD', 51), ('nextjs', 'Next.js', 53), ('seguridad', 'Seguridad web', 54),
    ('algoritmos', 'Algoritmos', 55), ('python', 'Python', 57),
]
dump(os.path.join(C, 'badges.json'), [{'id': i, 'title': t, 'week': w} for i, t, w in BADGES])

print('temas completos:', done_weeks)
print('semanas en la ruta:', len(weeks))
print('preguntas existentes:', sum(len(v) for v in qs_by.values()))
