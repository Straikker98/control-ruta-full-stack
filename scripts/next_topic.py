#!/usr/bin/env python3
"""Estado de la generación diaria de temas.

Uso:
  python scripts/next_topic.py            # informa qué hacer hoy (JSON)
  python scripts/next_topic.py --mark N   # registra que el tema N se generó hoy

Idempotente: si ya se generó un tema hoy, indica "ya_hecho" y no hay que generar otro.
Los temas se generan EN ORDEN (el menor pendiente), uno por día.
"""
import json, os, sys, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C = os.path.join(ROOT, 'content')


def load(p):
    with open(os.path.join(C, p), encoding='utf-8') as f:
        return json.load(f)


def save(p, o):
    with open(os.path.join(C, p), 'w', encoding='utf-8') as f:
        json.dump(o, f, ensure_ascii=False, indent=1)


idx, route = load('index.json'), load('route.json')
hoy = datetime.date.today().isoformat()
gen = idx.setdefault('generados', {})   # { "11": "2026-10-27" }

if len(sys.argv) > 2 and sys.argv[1] == '--mark':
    w = int(sys.argv[2])
    gen[str(w)] = hoy
    if w not in idx['topics_completos']:
        idx['topics_completos'].append(w)
        idx['topics_completos'].sort()
    save('index.json', idx)
    print(json.dumps({'marcado': w, 'fecha': hoy}))
    sys.exit(0)

if hoy in gen.values():
    print(json.dumps({'ya_hecho': True, 'fecha': hoy, 'tema': [k for k, v in gen.items() if v == hoy]}))
    sys.exit(0)

pendientes = [w['week'] for w in route['weeks'] if w['week'] not in idx['topics_completos']]
if not pendientes:
    print(json.dumps({'ya_hecho': True, 'motivo': 'todos los temas están creados'}))
    sys.exit(0)

n = pendientes[0]
wk = next(w for w in route['weeks'] if w['week'] == n)
fase = next(p for p in route['phases'] if p['id'] == wk['phase'])
previos = [{'week': w['week'], 'title': w['title'], 'mastery': w['mastery']} for w in route['weeks'] if w['week'] < n][-8:]
print(json.dumps({
    'ya_hecho': False, 'fecha': hoy, 'tema': n, 'faltan': len(pendientes),
    'titulo': wk['title'], 'dominio': wk['mastery'], 'evidencia': wk['evidence'], 'diseno': wk.get('design', ''),
    'fase': {'id': fase['id'], 'titulo': fase['title']}, 'temas_previos': previos,
}, ensure_ascii=False, indent=1))
