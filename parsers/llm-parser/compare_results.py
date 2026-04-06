"""Сравнение результатов парсинга"""
import json

# Читаем результат LLM
with open('parsed_25SZH01_02.docx.json', 'r', encoding='utf-8') as f:
    llm_data = json.load(f)

print("="*80)
print("АНАЛИЗ РЕЗУЛЬТАТОВ LLM ПАРСЕРА")
print("="*80)

print(f"\nВсего занятий: {len(llm_data)}")

# Группируем по группам и подгруппам
by_group = {}
for lesson in llm_data:
    key = f"{lesson['group']} подгр.{lesson['subgroup']}"
    if key not in by_group:
        by_group[key] = []
    by_group[key].append(lesson)

print(f"\nПо группам:")
for group, lessons in sorted(by_group.items()):
    print(f"  {group}: {len(lessons)} занятий")

# Примеры сложных случаев
print(f"\n{'='*80}")
print("ПРИМЕРЫ СЛОЖНЫХ СЛУЧАЕВ:")
print(f"{'='*80}\n")

# Ищем занятия с длинными названиями
long_subjects = [l for l in llm_data if len(l['subject']) > 50]
if long_subjects:
    print("1. Длинные названия предметов:")
    for l in long_subjects[:3]:
        print(f"   Предмет: {l['subject']}")
        print(f"   Тип: {l['type']}")
        print(f"   Преподаватель: {l['teacher']}")
        print(f"   Аудитория: {l['room']}\n")

# Ищем занятия с несколькими преподавателями
multi_teachers = [l for l in llm_data if l['teacher'] and ',' in l['teacher']]
if multi_teachers:
    print("2. Несколько преподавателей:")
    for l in multi_teachers[:3]:
        print(f"   Предмет: {l['subject']}")
        print(f"   Преподаватели: {l['teacher']}")
        print(f"   Аудитория: {l['room']}\n")

# Ищем занятия со специальными аудиториями
special_rooms = [l for l in llm_data if l['room'] and ('НОЦ' in l['room'] or 'СК' in l['room'])]
if special_rooms:
    print("3. Специальные аудитории:")
    for l in special_rooms[:3]:
        print(f"   Предмет: {l['subject']}")
        print(f"   Аудитория: {l['room']}")
        print(f"   Преподаватель: {l['teacher']}\n")

# Ищем занятия с датами
with_dates = [l for l in llm_data if l.get('start_date') or l.get('end_date')]
if with_dates:
    print("4. Занятия с датами:")
    for l in with_dates[:5]:
        print(f"   Предмет: {l['subject']}")
        if l.get('start_date'):
            print(f"   Начало: {l['start_date']}")
        if l.get('end_date'):
            print(f"   Конец: {l['end_date']}")
        print()

# Проверяем подгруппы
print(f"\n{'='*80}")
print("ПРОВЕРКА ПОДГРУПП:")
print(f"{'='*80}\n")

# Находим занятия где разные подгруппы в одно время
from collections import defaultdict
time_slots = defaultdict(list)

for lesson in llm_data:
    key = f"{lesson['group']}_{lesson['lesson_number']}_{lesson['week_type']}"
    time_slots[key].append(lesson)

different_lessons = [lessons for lessons in time_slots.values() if len(lessons) > 1 and len(set(l['subject'] for l in lessons)) > 1]

if different_lessons:
    print("Разные занятия для подгрупп в одно время:")
    for lessons in different_lessons[:3]:
        print(f"\n  Группа {lessons[0]['group']}, пара {lessons[0]['lesson_number']}, {lessons[0]['week_type']}:")
        for l in lessons:
            print(f"    Подгр.{l['subgroup']}: {l['subject']} ({l['type']}) - {l['teacher']} - {l['room']}")
