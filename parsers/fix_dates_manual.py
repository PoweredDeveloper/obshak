#!/usr/bin/env python3
"""
Ручное исправление дат в названиях предметов
"""
import re
from pathlib import Path

def load_env():
    env_path = Path('.env')
    env_vars = {}
    if env_path.exists():
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key] = value.strip('"').strip("'")
    return env_vars

from supabase import create_client

env_vars = load_env()
supabase = create_client(env_vars['VITE_SUPABASE_URL'], env_vars['VITE_SUPABASE_PUBLISHABLE_KEY'])

print("Получаем записи с датами...")
response = supabase.table('lessons').select('id, subject').like('subject', 'С %').execute()
lessons = response.data

print(f"Найдено: {len(lessons)}")

date_patterns = [
    # С 30.03.26. или С 30.03. 26.
    (r'^[Сс]\s+(\d{2})\.(\d{2})\.?\s*(\d{2})\.?\s*', lambda m: f'20{m.group(3)}-{m.group(2)}-{m.group(1)}'),
    # С 06.04. (без года)
    (r'^[Сс]\s+(\d{2})\.(\d{2})\.\s+', lambda m: f'2026-{m.group(2)}-{m.group(1)}'),
    # С 09.02 по (диапазон)
    (r'^[Сс]\s+(\d{2})\.(\d{2})\s+по\s+', lambda m: f'2026-{m.group(2)}-{m.group(1)}'),
]

updates = []
for lesson in lessons:
    subject = lesson['subject']
    for pattern, date_func in date_patterns:
        match = re.match(pattern, subject)
        if match:
            start_date = date_func(match)
            new_subject = re.sub(pattern, '', subject).strip()
            updates.append({
                'id': lesson['id'],
                'subject': new_subject,
                'start_date': start_date
            })
            break

print(f"Обновляем {len(updates)} записей...")

for i, item in enumerate(updates):
    supabase.table('lessons').update({
        'subject': item['subject'],
        'start_date': item['start_date']
    }).eq('id', item['id']).execute()
    
    if (i + 1) % 10 == 0:
        print(f"  {i + 1}/{len(updates)}")

print(f"✓ Готово! Обновлено: {len(updates)}")
