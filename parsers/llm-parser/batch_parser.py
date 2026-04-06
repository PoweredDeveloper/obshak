"""
Батч-парсер: Python для структуры + LLM для дней (батчами)
"""
import os
import re
import json
import requests
from docx import Document
from dotenv import load_dotenv

load_dotenv()

# Polza AI API
POLZA_API_KEY = os.getenv('POLZA_API_KEY')
POLZA_MODEL = os.getenv('POLZA_MODEL', 'nex-agi/deepseek-v3.1-nex-n1')
POLZA_API_URL = os.getenv('POLZA_API_URL', 'https://polza.ai/api/v1/chat/completions')

# Промпт для парсинга дня
DAY_PARSE_PROMPT = """Ты парсишь расписание занятий университета на один день.

Я дам тебе список занятий в формате:
Группа | Подгруппа | Пара | Неделя | Время | Текст ячейки

Текст ячейки содержит: "Предмет (Тип) Преподаватель Аудитория"

Примеры текста ячейки:
- "Математика (Лекции) проф. Иванов И.И. 2-203"
- "Физика (Практические)доц. Петров2-305" (без пробелов!)
- "Химия (Лабораторные) до 12.04. доц. Сидоров 1-36" (с датой окончания)
- "История (Лекции) С 20.04. проф. Смирнов 3-208" (с датой начала)
- "Физкультура (Практические) СК «Тезуче» доц. Калманович В.Л., доц. Архипов Е.Ю." (спецаудитория, несколько преподавателей)

Верни ТОЛЬКО JSON массив (без markdown, без текста):
[
  {
    "group": "код группы",
    "subgroup": число или 0,
    "day_of_week": "название дня (Понедельник/Вторник/Среда/Четверг/Пятница/Суббота)",
    "lesson_number": число,
    "week_type": "Чет/Неч/Обе",
    "time_start": "HH:MM",
    "time_end": "HH:MM",
    "subject": "название предмета",
    "type": "Лекции/Практические/Лабораторные",
    "teacher": "ФИО или null",
    "room": "аудитория или null",
    "start_date": "YYYY-MM-DD или null",
    "end_date": "YYYY-MM-DD или null"
  }
]

Правила:
- Если год не указан в дате → используй 2026
- Несколько преподавателей → объедини через запятую
- Убери лишние пробелы и точки
- Если информация отсутствует → null
- Верни массив для ВСЕХ занятий из входных данных"""

def parse_time(time_str):
    """Парсит время из строки"""
    if not time_str or '-' not in time_str:
        return None, None
    
    parts = time_str.split('-')
    if len(parts) != 2:
        return None, None
    
    start = parts[0].strip().replace('.', ':')
    end = parts[1].strip().replace('.', ':')
    
    # Убираем секунды для краткости
    if start.count(':') == 2:
        start = ':'.join(start.split(':')[:2])
    if end.count(':') == 2:
        end = ':'.join(end.split(':')[:2])
    
    return start, end

def extract_table_structure(file_path):
    """Извлекает структуру таблицы"""
    
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
        
        # Проверяем формат группы
        if not group_name or not re.match(r'\d{1,2}[А-ЯЁ]{2}\d{2}', group_name):
            continue
        
        subgroup_text = subgroup_row.cells[col_idx].text.strip().lower()
        subgroup = 0
        
        if 'подгруппа 1' in subgroup_text or 'подгр. 1' in subgroup_text or 'подгр.1' in subgroup_text:
            subgroup = 1
        elif 'подгруппа 2' in subgroup_text or 'подгр. 2' in subgroup_text or 'подгр.2' in subgroup_text:
            subgroup = 2
        elif 'подгруппа 3' in subgroup_text:
            subgroup = 3
        elif 'подгруппа 4' in subgroup_text:
            subgroup = 4
        
        if group_name not in groups_info:
            groups_info[group_name] = []
        
        # Добавляем ВСЕ колонки, даже если подгруппа повторяется
        groups_info[group_name].append((col_idx, subgroup))
    
    return {
        'table': table,
        'groups_info': groups_info
    }

def parse_day_with_llm(day_name, day_lessons, max_retries=3):
    """Парсит занятия одного дня с помощью LLM"""
    
    expected_count = len(day_lessons)
    
    # Формируем входные данные
    input_text = f"День: {day_name}\n\nЗанятия:\n"
    
    for lesson in day_lessons:
        input_text += f"{lesson['group']} | подгр.{lesson['subgroup']} | пара {lesson['lesson_number']} | {lesson['week_type']} | {lesson['time_start']}-{lesson['time_end']} | {lesson['cell_text']}\n"
    
    headers = {
        "Authorization": f"Bearer {POLZA_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": POLZA_MODEL,
        "messages": [
            {"role": "system", "content": DAY_PARSE_PROMPT},
            {"role": "user", "content": input_text}
        ],
        "temperature": 0.1,
        "max_tokens": 4000
    }
    
    for attempt in range(max_retries):
        try:
            response = requests.post(POLZA_API_URL, headers=headers, json=data, timeout=90)
            response.raise_for_status()
            
            result = response.json()
            answer = result['choices'][0]['message']['content'].strip()
            
            # Убираем markdown если есть
            if answer.startswith('```json'):
                answer = answer[7:]
            if answer.startswith('```'):
                answer = answer[3:]
            if answer.endswith('```'):
                answer = answer[:-3]
            answer = answer.strip()
            
            parsed_lessons = json.loads(answer)
            tokens = result.get('usage', {}).get('total_tokens', 0)
            
            # ВАЛИДАЦИЯ: проверяем количество
            if len(parsed_lessons) != expected_count:
                print(f"⚠️  LLM вернул {len(parsed_lessons)} занятий вместо {expected_count}!")
                if attempt < max_retries - 1:
                    print(f"Повтор {attempt + 2}/{max_retries}...")
                    continue
                else:
                    print(f"❌ После {max_retries} попыток все равно {len(parsed_lessons)} занятий")
            
            return parsed_lessons, tokens
            
        except requests.exceptions.Timeout:
            if attempt < max_retries - 1:
                print(f"Timeout, повтор {attempt + 2}/{max_retries}...", end=' ')
                continue
            else:
                print(f"Timeout после {max_retries} попыток")
                return [], 0
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"Ошибка, повтор {attempt + 2}/{max_retries}...", end=' ')
                continue
            else:
                print(f"Ошибка для {day_name}: {e}")
                return [], 0
    
    return [], 0

def parse_schedule_batch(file_path):
    """Батч-парсинг по дням"""
    
    print(f"\n{'='*80}")
    print(f"Файл: {os.path.basename(file_path)}")
    print(f"{'='*80}\n")
    
    # Шаг 1: Извлекаем структуру
    print("📊 Извлекаем структуру таблицы...")
    structure = extract_table_structure(file_path)
    
    if not structure:
        print("Не удалось извлечь структуру")
        return []
    
    table = structure['table']
    groups_info = structure['groups_info']
    
    print(f"Найдено групп: {len(groups_info)}")
    for group_name, cols in groups_info.items():
        subgroups_str = ', '.join([f"подгр.{sg}" if sg > 0 else "вся группа" for _, sg in cols])
        print(f"  - {group_name}: {subgroups_str}")
    
    # Шаг 2: Собираем занятия по дням
    print(f"\nСобираем занятия по дням...")
    
    day_map = {
        'понедельник': 'Понедельник',
        'вторник': 'Вторник',
        'среда': 'Среда',
        'четверг': 'Четверг',
        'пятница': 'Пятница',
        'суббота': 'Суббота'
    }
    
    days_data = {day: [] for day in day_map.values()}
    current_day = None
    current_lesson_number = None  # Запоминаем последний номер пары
    
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
        
        # Определяем день
        if day_cell in day_map:
            current_day = day_map[day_cell]
        
        # Определяем номер пары (если пусто - берем предыдущий)
        if lesson_num_cell.isdigit():
            current_lesson_number = int(lesson_num_cell)
        
        if not current_day or not current_lesson_number:
            continue
        
        lesson_number = current_lesson_number
        time_start, time_end = parse_time(time_cell)
        
        if not time_start:
            continue
        
        week_type = week_type_cell if week_type_cell in ['Чет', 'Неч'] else 'Обе'
        
        # Собираем ячейки для каждой группы
        for group_name, columns in groups_info.items():
            for col_idx, subgroup in columns:
                if col_idx >= len(cells):
                    continue
                
                cell_text = cells[col_idx].text.strip()
                
                if not cell_text:
                    continue
                
                days_data[current_day].append({
                    'group': group_name,
                    'subgroup': subgroup,
                    'lesson_number': lesson_number,
                    'week_type': week_type,
                    'time_start': time_start,
                    'time_end': time_end,
                    'cell_text': cell_text
                })
    
    # Показываем статистику
    for day, lessons in days_data.items():
        if lessons:
            print(f"  {day}: {len(lessons)} занятий")
    
    # Шаг 3: Парсим каждый день с LLM (батчами по 15 занятий)
    print(f"\nПарсим дни с помощью LLM...\n")
    
    all_lessons = []
    total_tokens = 0
    BATCH_SIZE = 15  # Максимум занятий в одном запросе
    
    for day, day_lessons in days_data.items():
        if not day_lessons:
            continue
        
        # Разбиваем на батчи если много занятий
        num_batches = (len(day_lessons) + BATCH_SIZE - 1) // BATCH_SIZE
        
        if num_batches == 1:
            print(f"  {day} ({len(day_lessons)} занятий)...", end=' ')
            parsed_lessons, tokens = parse_day_with_llm(day, day_lessons)
            total_tokens += tokens
            
            if parsed_lessons:
                all_lessons.extend(parsed_lessons)
                print(f"OK {len(parsed_lessons)} распарсено, {tokens} токенов")
            else:
                print(f"ОШИБКА")
        else:
            print(f"  {day} ({len(day_lessons)} занятий, {num_batches} батчей):")
            
            for batch_idx in range(num_batches):
                start_idx = batch_idx * BATCH_SIZE
                end_idx = min(start_idx + BATCH_SIZE, len(day_lessons))
                batch = day_lessons[start_idx:end_idx]
                
                print(f"    Батч {batch_idx + 1}/{num_batches} ({len(batch)} занятий)...", end=' ')
                
                parsed_lessons, tokens = parse_day_with_llm(f"{day} (батч {batch_idx + 1})", batch)
                total_tokens += tokens
                
                if parsed_lessons:
                    all_lessons.extend(parsed_lessons)
                    print(f"OK {len(parsed_lessons)}, {tokens} токенов")
                else:
                    print(f"ОШИБКА")
    
    cost = total_tokens * 0.00000014
    
    print(f"\n{'='*80}")
    print(f"Парсинг завершен!")
    print(f"Всего занятий: {len(all_lessons)}")
    print(f"Токенов: {total_tokens}, Стоимость: ${cost:.6f}")
    
    # ВАЛИДАЦИЯ: проверяем общее количество
    total_expected = sum(len(lessons) for lessons in days_data.values())
    if len(all_lessons) != total_expected:
        print(f"\n⚠️  ВНИМАНИЕ: Ожидалось {total_expected} занятий, получено {len(all_lessons)}")
        print(f"Разница: {total_expected - len(all_lessons)} занятий пропущено!")
    
    print(f"{'='*80}")
    
    return all_lessons

if __name__ == "__main__":
    import sys
    
    test_file = sys.argv[1] if len(sys.argv) > 1 else "../../schedules/1GP01.docx"
    
    if not os.path.exists(test_file):
        print(f"Файл не найден: {test_file}")
    else:
        lessons = parse_schedule_batch(test_file)
        
        if lessons:
            # Показываем примеры
            print(f"\n{'='*80}")
            print(f"ПРИМЕРЫ ЗАНЯТИЙ:")
            print(f"{'='*80}\n")
            
            for lesson in lessons[:5]:
                print(f"Группа: {lesson['group']} (подгр. {lesson['subgroup']})")
                print(f"Пара: {lesson['lesson_number']}, {lesson['week_type']}")
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
            
            # Сохраняем результат
            output_file = f"parsed_{os.path.basename(test_file)}.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(lessons, f, ensure_ascii=False, indent=2)
            print(f"Результат сохранен в {output_file}")
