#!/usr/bin/env python3
"""
Обработка дат начала и окончания в расписании
"""

from supabase import create_client
import os
import re
from dotenv import load_dotenv

load_dotenv('classmate-connect/.env')

# Подключение к Supabase
SUPABASE_URL = "https://awswwgvlnhbtcfeexyqv.supabase.co"
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("=" * 60)
print("📅 ОБРАБОТКА ДАТ В РАСПИСАНИИ")
print("=" * 60)

# Обрабатываем даты в названиях предметов
print("\n1️⃣ Обработка дат начала в названиях предметов...")

date_patterns = [
    (r'^(\d{2})\.(\d{2})\.(\d{2})\.?\s+', lambda m: f'2026-{m.group(2)}-{m.group(1)}'),
    (r'^[Сс]\s+(\d{2})\.(\d{2})\.(\d{2})\.?\s+', lambda m: f'2026-{m.group(2)}-{m.group(1)}'),
]

response = supabase.table('lessons').select('id, subject').execute()
lessons = response.data

updates = []
for lesson in lessons:
    subject = lesson['subject']
    start_date = None
    new_subject = subject
    
    for pattern, date_func in date_patterns:
        match = re.match(pattern, subject)
        if match:
            start_date = date_func(match)
            new_subject = re.sub(pattern, '', subject).strip()
            break
    
    if start_date:
        updates.append({
            'id': lesson['id'],
            'subject': new_subject,
            'start_date': start_date
        })

print(f"   Найдено занятий с датами начала: {len(updates)}")

if updates:
    for i in range(0, len(updates), 100):
        batch = updates[i:i+100]
        for item in batch:
            supabase.table('lessons').update({
                'subject': item['subject'],
                'start_date': item['start_date']
            }).eq('id', item['id']).execute()
        print(f"   Обновлено: {min(i+100, len(updates))}/{len(updates)}")
    print("   ✓ Даты начала обработаны")
else:
    print("   ℹ️  Даты начала не найдены")

# Обрабатываем даты окончания в поле teacher
print("\n2️⃣ Обработка дат окончания в информации о преподавателе...")

end_date_patterns = [
    (r'до\s+(\d{2})\.(\d{2})\.(\d{2})', lambda m: f'2026-{m.group(2)}-{m.group(1)}'),
    (r'до\s+(\d{2})\.(\d{2})\.\s*$', lambda m: f'2026-{m.group(2)}-{m.group(1)}'),
    (r'до\s+(\d{2})\.(\d{2})\s', lambda m: f'2026-{m.group(2)}-{m.group(1)}'),
]

response = supabase.table('lessons').select('id, teacher').execute()
lessons = response.data

updates = []
for lesson in lessons:
    teacher = lesson.get('teacher', '')
    if not teacher:
        continue
    
    end_date = None
    for pattern, date_func in end_date_patterns:
        match = re.search(pattern, teacher)
        if match:
            end_date = date_func(match)
            break
    
    if end_date:
        updates.append({
            'id': lesson['id'],
            'end_date': end_date
        })

print(f"   Найдено занятий с датами окончания: {len(updates)}")

if updates:
    for i in range(0, len(updates), 100):
        batch = updates[i:i+100]
        for item in batch:
            supabase.table('lessons').update({
                'end_date': item['end_date']
            }).eq('id', item['id']).execute()
        print(f"   Обновлено: {min(i+100, len(updates))}/{len(updates)}")
    print("   ✓ Даты окончания обработаны")
else:
    print("   ℹ️  Даты окончания не найдены")

print("\n" + "=" * 60)
print("✅ ОБРАБОТКА ЗАВЕРШЕНА")
print("=" * 60)
