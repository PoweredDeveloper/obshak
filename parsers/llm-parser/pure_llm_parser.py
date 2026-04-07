"""
Чистый LLM парсер - отправляет всю таблицу в LLM без Python предобработки
"""
import os
import json
import requests
from docx import Document
from dotenv import load_dotenv

load_dotenv()

POLZA_API_KEY = os.getenv('POLZA_API_KEY')
POLZA_MODEL = os.getenv('POLZA_MODEL', 'nex-agi/deepseek-v3.1-nex-n1')
POLZA_API_URL = os.getenv('POLZA_API_URL', 'https://polza.ai/api/v1/chat/completions')

SYSTEM_PROMPT = """Ты парсишь расписание занятий университета из таблицы Word.

Я дам тебе таблицу в текстовом формате. Каждая строка - это одна строка таблицы.
Формат: День | Пара | Неделя | Время | Группа1_Подгр1 | Группа1_Подгр2 | Группа2_Подгр1 | ...

Верни ТОЛЬКО JSON массив занятий для указанной группы (без markdown, без текста):
[
  {
    "group": "код группы",
    "subgroup": число (0 если для всей группы, 1/2/3/4 для подгруппы),
    "day_of_week": "Понедельник/Вторник/Среда/Четверг/Пятница/Суббота",
    "lesson_number": число (1-8),
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
- Убери лишние пробелы, точки, звания (доц., проф., ст.преп.)
- Если информация отсутствует → null
- Если занятие для всей группы (не указана подгруппа) → subgroup = 0
- Если занятие в одной ячейке для нескольких подгрупп → создай отдельные записи для каждой
- Обрабатывай даты: "до 12.04" → end_date, "С 20.04" → start_date
- Верни массив для ВСЕХ занятий указанной группы"""

def extract_table_as_text(file_path):
    """Извлекает таблицу как текст"""
    doc = Document(file_path)
    
    # Находим таблицу с расписанием
    table = None
    for t in doc.tables:
        if len(t.rows) >= 3:
            table = t
            break
    
    if not table:
        return None
    
    # Извлекаем заголовок (группы)
    header_row = table.rows[0]
    header = []
    for i, cell in enumerate(header_row.cells):
        if i < 4:
            continue
        text = cell.text.strip()
        if text:
            header.append(text)
    
    # Извлекаем подгруппы
    subgroup_row = table.rows[1]
    subgroups = []
    for i, cell in enumerate(subgroup_row.cells):
        if i < 4:
            continue
        text = cell.text.strip()
        subgroups.append(text if text else "")
    
    # Извлекаем данные
    table_text = f"ЗАГОЛОВОК: {' | '.join(header)}\n"
    table_text += f"ПОДГРУППЫ: {' | '.join(subgroups)}\n\n"
    
    for row_idx in range(2, len(table.rows)):
        row = table.rows[row_idx]
        cells = row.cells
        
        if len(cells) < 4:
            continue
        
        row_data = []
        for i, cell in enumerate(cells):
            text = cell.text.strip().replace('\n', ' ')
            row_data.append(text if text else "-")
        
        table_text += " | ".join(row_data) + "\n"
    
    return table_text

def parse_with_pure_llm(file_path, group_name, max_retries=3):
    """Парсит расписание для указанной группы с помощью LLM"""
    
    print(f"\n{'='*80}")
    print(f"Файл: {os.path.basename(file_path)}")
    print(f"Группа: {group_name}")
    print(f"{'='*80}\n")
    
    # Извлекаем таблицу как текст
    print("📄 Извлекаем таблицу...")
    table_text = extract_table_as_text(file_path)
    
    if not table_text:
        print("❌ Не удалось извлечь таблицу")
        return []
    
    print(f"Размер таблицы: {len(table_text)} символов")
    
    # Формируем запрос
    user_prompt = f"Распарси расписание для группы {group_name}:\n\n{table_text}"
    
    headers = {
        "Authorization": f"Bearer {POLZA_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": POLZA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 8000
    }
    
    print(f"\n🤖 Отправляем в LLM...")
    
    for attempt in range(max_retries):
        try:
            response = requests.post(POLZA_API_URL, headers=headers, json=data, timeout=120)
            response.raise_for_status()
            
            result = response.json()
            answer = result['choices'][0]['message']['content'].strip()
            
            # Убираем markdown
            if answer.startswith('```json'):
                answer = answer[7:]
            if answer.startswith('```'):
                answer = answer[3:]
            if answer.endswith('```'):
                answer = answer[:-3]
            answer = answer.strip()
            
            lessons = json.loads(answer)
            tokens = result.get('usage', {}).get('total_tokens', 0)
            cost = tokens * 0.00000014
            
            print(f"\n✅ Парсинг завершен!")
            print(f"Занятий: {len(lessons)}")
            print(f"Токенов: {tokens}")
            print(f"Стоимость: ${cost:.6f}")
            
            return lessons
            
        except requests.exceptions.Timeout:
            if attempt < max_retries - 1:
                print(f"⏱️  Timeout, повтор {attempt + 2}/{max_retries}...")
                continue
            else:
                print(f"❌ Timeout после {max_retries} попыток")
                return []
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"⚠️  Ошибка, повтор {attempt + 2}/{max_retries}...")
                continue
            else:
                print(f"❌ Ошибка: {e}")
                return []
    
    return []

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print("Использование: python pure_llm_parser.py <файл> <группа>")
        print("Пример: python pure_llm_parser.py ../../schedules/25SZH01_02.docx 25СЖ02")
        sys.exit(1)
    
    file_path = sys.argv[1]
    group_name = sys.argv[2]
    
    if not os.path.exists(file_path):
        print(f"❌ Файл не найден: {file_path}")
        sys.exit(1)
    
    lessons = parse_with_pure_llm(file_path, group_name)
    
    if lessons:
        # Показываем примеры
        print(f"\n{'='*80}")
        print(f"ПРИМЕРЫ ЗАНЯТИЙ:")
        print(f"{'='*80}\n")
        
        for lesson in lessons[:3]:
            print(f"{lesson['day_of_week']}, пара {lesson['lesson_number']}, {lesson['week_type']}")
            print(f"  {lesson['subject']} ({lesson['type']})")
            print(f"  {lesson['teacher']} | {lesson['room']}")
            print()
        
        # Сохраняем
        output_file = f"pure_llm_{group_name}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(lessons, f, ensure_ascii=False, indent=2)
        print(f"💾 Сохранено в {output_file}")
