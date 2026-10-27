#!/usr/bin/env python3
"""Genera assets/avatars/index.json a partir de las imágenes que pongas en assets/avatars/.
Nombre de archivo = nombre del personaje en minúsculas con guiones (naruto-uzumaki.webp). Uso: python scripts/avatars_index.py"""
import json, os
D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'avatars')
ext = ('.webp', '.png', '.jpg', '.jpeg', '.avif')
out = {os.path.splitext(f)[0]: f for f in sorted(os.listdir(D)) if f.lower().endswith(ext)}
json.dump(out, open(os.path.join(D, 'index.json'), 'w', encoding='utf-8'), indent=1)
print(f'{len(out)} imagen(es) registradas')
