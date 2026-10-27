#!/usr/bin/env python3
"""Valida el contenido de la plataforma. Uso:
  python scripts/validate_content.py            # todo
  python scripts/validate_content.py exams 3    # solo el examen del tema 3
Sale con código 1 si hay errores.
"""
import json, os, sys, re, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C = os.path.join(ROOT, 'content')
LEVELS = ['facil', 'medio', 'dificil']
MIN_Q = 15
errors, warns = [], []


def err(m): errors.append(m)
def warn(m): warns.append(m)


def load(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def check_exam(week):
    p = os.path.join(C, 'exams', '%02d.json' % week)
    if not os.path.exists(p):
        err('%02d: falta exams/%02d.json' % (week, week)); return
    try:
        ex = load(p)
    except Exception as e:
        err('%02d: JSON inválido: %s' % (week, e)); return
    if ex.get('week') != week:
        err('%02d: campo week incorrecto' % week)
    lv = ex.get('levels', {})
    seen_prompts = set()
    for L in LEVELS:
        qs = lv.get(L)
        if not isinstance(qs, list):
            err('%02d/%s: falta el nivel' % (week, L)); continue
        if len(qs) < MIN_Q:
            err('%02d/%s: %d preguntas (mínimo %d)' % (week, L, len(qs), MIN_Q))
        ids = set()
        for i, q in enumerate(qs):
            t = '%02d/%s#%d' % (week, L, i + 1)
            for k in ('id', 'prompt', 'options', 'answer', 'explanation'):
                if k not in q:
                    err('%s: falta %s' % (t, k))
            if any(k not in q for k in ('id', 'prompt', 'options', 'answer', 'explanation')):
                continue
            if q['id'] in ids: err('%s: id repetido %s' % (t, q['id']))
            ids.add(q['id'])
            o = q['options']
            if not (isinstance(o, list) and len(o) == 4 and all(isinstance(x, str) and x.strip() for x in o)):
                err('%s: debe tener 4 opciones de texto' % t); continue
            if len({x.strip().lower() for x in o}) != 4:
                err('%s: opciones repetidas' % t)
            if not (isinstance(q['answer'], int) and 0 <= q['answer'] <= 3):
                err('%s: answer debe ser 0..3' % t)
            if len(q['prompt'].strip()) < 20: err('%s: enunciado demasiado corto' % t)
            if len(q['explanation'].strip()) < 40: err('%s: explicación demasiado corta' % t)
            if q['prompt'].strip().lower() in seen_prompts: err('%s: enunciado repetido' % t)
            seen_prompts.add(q['prompt'].strip().lower())
            for x in o:
                if re.search(r'todas las anteriores|ninguna de las anteriores|ambas', x, re.I):
                    err('%s: opción tipo «todas/ninguna/ambas» no permitida' % t)
        good = [q for q in qs if isinstance(q.get('answer'), int) and isinstance(q.get('options'), list) and len(q['options']) == 4]
        if good:
            dist = collections.Counter(q['answer'] for q in good)
            if max(dist.values()) / len(good) > 0.4:
                err('%02d/%s: posición de la respuesta desbalanceada %s (máx. 40%% en una posición)' % (week, L, dict(dist)))
            longest = sum(1 for q in good if len(q['options'][q['answer']]) == max(len(x) for x in q['options']))
            if longest / len(good) > 0.4:
                err('%02d/%s: la correcta es la más larga en %d de %d (máx. 40%%)' % (week, L, longest, len(good)))


def check_topic(week):
    p = os.path.join(C, 'topics', '%02d.json' % week)
    if not os.path.exists(p):
        err('%02d: falta topics/%02d.json' % (week, week)); return
    t = load(p)
    if t.get('week') != week: err('%02d: week incorrecto en topics' % week)
    if t.get('estado') == 'completo':
        if len(t.get('sections', [])) < 20: err('%02d: pocas secciones (%d)' % (week, len(t.get('sections', []))))
        if len(t.get('exercises', [])) < 3: err('%02d: pocos ejercicios' % week)
        if not t.get('trabajo', {}).get('description'): err('%02d: trabajo sin descripción' % week)


def main():
    args = sys.argv[1:]
    route = load(os.path.join(C, 'route.json'))
    weeks = [w['week'] for w in route['weeks']]
    if args and args[0] == 'exams':
        targets = [int(a) for a in args[1:]] or None
        for w in (targets or load(os.path.join(C, 'index.json'))['topics_completos']):
            check_exam(w)
    else:
        idx = load(os.path.join(C, 'index.json'))
        for w in weeks:
            check_topic(w)
        for w in idx['topics_completos']:
            check_exam(w)
        chk = load(os.path.join(C, 'checklist.json'))
        for w in weeks:
            if str(w) not in chk: err('%02d: falta checklist' % w)
    for m in warns: print('AVISO', m)
    for m in errors: print('ERROR', m)
    print('OK' if not errors else '%d errores' % len(errors))
    sys.exit(1 if errors else 0)


main()
