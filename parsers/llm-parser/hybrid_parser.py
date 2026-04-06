"""
Гибридный парсер: Python для структуры + LLM для содержимого ячеек
"""
import os
import re
import json
import requests
from docx import Document
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
OPENROUTER_MODEL = os.getenv('OPENROUTER_MODEL', 'deepseek/deepseek-chat')

# Промпт для парсинга одной ячейки
CELL_PARSE_PROMPT = """Ты парсишь ячейку расписания университета.

Формат: "Предмет (Тип) Преподаватель Аудитория"

Примеры:
- "Математика (Лекции) проф. Иванов И.И. 2-203"
- "Физика (Практические)доц. Петров2-305"
- "Химия (Лабораторные) до 12.04. доц. Сидоров 1-36"
- "История (Лекции) С 20.04. проф. Смирнов 3-208"
- "Физкультура (Практические) СК «Тезуче» доц. Калманович В.Л., доц. Архипов Е.Ю."

Верни ТОЛЬКО JSON (без markdown):
{
  "subject": "название предмета",
  "type": "Лекции/Практические/Лабораторные",
  "teacher": "ФИО или null",
  "room": "аудитория или null",
  "start_date": "YYYY-MM-DD или null",
  "end_date": "YYYY-MM-DD или null"
}

Правила:
- Год не указан → 2026
- Несколько преподавателей → через запятую
- Убери лишние пробелы"""

def parse_time(time_str):
    """Парсит время из строки"""
    if not time_str or '-' not in time_str:
        return None, None
    
    parts = time_str.split('-')
    if len(parts) != 2:
        return None, None
    
    start = parts[0].strip().replace('.', ':')
    end = parts[1].strip().replace('.', ':')
    
    if start.count(':') == 1:
        start += ':00'
    if end.count(':') == 1:
        end += ':00'
    
    return start, end

def parse_cell_with_llm(cell_text):
    """Парсит содержимое ячейки с помощью LLM"""
    
    url = "https://openrouter.ai/api/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": CELL_PARSE_PROMPT},
            {"role": "user", "content": cell_text}
        ],
        "temperature": 0.1,
        "max_tokens": 200
    }
    
    try:
        response = requests.post(url, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        answer = result['choices'][0]['message']['content'].strip()
        
        # Убираем markdown если есть
        if answer.startswith('```'):
            answer = answer.split('\n', 1)[1]
        if answer.endswith('```'):
            answer = answer.rsplit('\n', 1)[0]
        
        return json.loads(answer)
        
    except Exception as e:
        print(f"  ⚠️  Ошибка LLM для '{cell_text[:50]}...': {e}")
        return None

def extract_table_structure(file_path):
    """Извлекает структуру таблицы (Python парсер)"""
    
    doc = Document(file_path)
    
    # Находим таблицу с расписанием
    table = None
    for t in doc.tables:
        if len(t.rows) >= 3:
            table = t
            break
    
    if not table:
        return None
    
    header_row = table.rows[0]
    subgroup_row = table.rows[1]
    
    # Собираем информацию о группах
    groups_info = {}
    
    for col_idx, cell in enumerate(header_row.cells):
        if col_idx < 4:
            continue
        
        group_name = cell.text.strip()
        
        if not group_name or not re.match(r'\d{1,2}[А-ЯЁ]{2}\d{2}', group_name):
            continue
        
        subgroup_text = subgroup_row.cells[col_idx].text.strip().lower()
        subgroup = 0
        
        if 'подгруппа 1' in subgroup_text:
            subgroup = 1
        elif 'подгруппа 2' in subgroup_text:
            subgroup = 2
        elif 'подгруппа 3' in subgroup_text:
            subgroup = 3
        elif 'подгруппа 4' in subgroup_text:
            subgroup = 4
        
        if group_name not in groups_info:
            groups_info[group_name] = []
        
        if not any(sg == subgroup for _, sg in groups_info[group_name]):
            groups_info[group_name].append((col_idx, subgroup))
    
    return {
        'table': table,
        'groups_info': groups_info
    }

def parse_schedule_hybrid(file_path):
    """Гибридный парсинг: структура + LLM для ячеек"""
    
    print(f"\n{'='*80}")
    print(f"📄 Файл: {os.path.basename(file_path)}")
    print(f"{'='*80}\n")
    
    # Шаг 1: Извлекаем структуру (Python)
    print("📊 Извлекаем структуру таблицы...")
    structure = extract_table_structure(file_path)
    
    if not structure:
        print("❌ Не удалось извлечь структуру")
        return []
    
    table = structure['table']
    groups_info = structure['groups_info']
    
    print(f"✅ Найдено групп: {len(groups_info)}")
    for group_name, cols in groups_info.items():
        subgroups_str = ', '.join([f"подгр.{sg}" if sg > 0 else "вся группа" for _, sg in cols])
        print(f"  - {group_name}: {subgroups_str}")
    
    # Шаг 2: Парсим занятия
    print(f"\n🤖 Парсим занятия с помощью LLM...")
    
    day_map = {
        'понедельник': 1, 'вторник': 2, 'среда': 3,
        'четверг': 4, 'пятница': 5, 'суббота': 6
    }
    
    lessons = []
    current_day = None
    cells_processed = 0
    cells_total = 0
    
    for row_idx in range(2, len(table.rows)):
        row = table.rows[row_idx]
        cells = row.cells
        
        if len(cells) < 4:
            continue
        
        # Служебные колонки
        day_cell = cells[0].text.strip().lower()
        lesson_num_cell = cells[1].text.strip()
        week_type_cell = cells[2].text.strip()
        time_cell = cells[3].text.strip()
        
        # День недели
        if day_cell in day_map:
            current_day = day_map[day_cell]
        
        if not current_day or not lesson_num_cell.isdigit():
            continue
        
        lesson_number = int(lesson_num_cell)
        time_start, time_end = parse_time(time_cell)
        
        if not time_start:
            continue
        
        week_type = 'Обе'
        if week_type_cell in ['Чет', 'Неч']:
            week_type = week_type_cell
        
        # Парсим ячейки для каждой группы
        for group_name, columns in groups_info.items():
            for col_idx, subgroup in columns:
                if col_idx >= len(cells):
                    continue
                
                cell_text = cells[col_idx].text.strip()
                
                if not cell_text:
                    continue
                
                cells_total += 1
                
                # Парсим ячейку с LLM
                lesson_data = parse_cell_with_llm(cell_text)
                
                if not lesson_data or not lesson_data.get('subject'):
                    continue
                
                cells_processed += 1
                
                lessons.append({
                    'group_name': group_name,
                    'subgroup': subgroup,
                    'day_of_week': current_day,
                    'lesson_number': lesson_number,
                    'time_start': time_start,
                    'time_end': time_end,
                    'week_type': week_type,
                    'subject': lesson_data['subject'],
                    'type': lesson_data.get('type'),
                    'teacher': lesson_data.get('teacher'),
                    'room': lesson_data.get('room'),
                    'start_date': lesson_data.get('start_date'),
                    'end_date': lesson_data.get('end_date')
                })
                
                # Прогресс
                if cells_processed % 10 == 0:
                    print(f"  Обработано: {cells_processed}/{cells_total} ячеек")
    
    print(f"\n✅ Парсинг завершен!")
    print(f"📊 Обработано ячеек: {cells_processed}/{cells_total}")
    print(f"📚 Найдено занятий: {len(lessons)}")
    
    return lessons

if __name__ == "__main__":
    import sys
    
    test_file = sys.argv[1] if len(sys.argv) > 1 else "../../schedules/1GP01.docx"
    
    if not os.path.exists(test_file):
        print(f"❌ Файл не найден: {test_file}")
    else:
        lessons = parse_schedule_hybrid(test_file)
        
        # Показываем примеры
        print(f"\n{'='*80}")
        print(f"ПРИМЕРЫ ЗАНЯТИЙ:")
        print(f"{'='*80}\n")
        
        for lesson in lessons[:5]:
            print(f"Группа: {lesson['group_name']} (подгр. {lesson['subgroup']})")
            print(f"День: {lesson['day_of_week']}, пара {lesson['lesson_number']}, {lesson['week_type']}")
            print(f"Время: {lesson['time_start']} - {lesson['time_end']}")
            print(f"Предмет: {lesson['subject']}")
            print(f"Тип: {lesson['type']}")
            print(f"Преподаватель: {lesson['teacher']}")
            print(f"Аудитория: {lesson['room']}")
            if lesson.get('start_date'):
                print(f"Начало: {lesson['start_date']}")
            if lesson.get('end_date'):
                print(f"Конец: {lesson['end_date']}")
            print()
