"""
Парсинг расписания из Word файлов с помощью LLM (DeepSeek)
"""
import os
import json
import requests
from docx import Document
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
OPENROUTER_MODEL = os.getenv('OPENROUTER_MODEL', 'deepseek/deepseek-chat')
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

SYSTEM_PROMPT = """Ты эксперт по извлечению структурированных данных из расписаний занятий университета.

ВАЖНЫЕ ПРАВИЛА:
1. Извлекай ВСЕ занятия из расписания
2. Обрабатывай подгруппы отдельно (если есть колонки "Подгруппа 1", "Подгруппа 2")
3. Учитывай четные/нечетные недели
4. Извлекай преподавателей, аудитории, тип занятия
5. Если занятие начинается с определенной даты - укажи start_date
6. Верни ТОЛЬКО валидный JSON без дополнительного текста

Формат ответа:
{
  "groups": ["список групп из заголовков таблицы"],
  "lessons": [
    {
      "group": "название группы",
      "subgroup": 1 или 2 или null,
      "day": "понедельник/вторник/среда/четверг/пятница/суббота",
      "week": "четная/нечетная/обе",
      "time_start": "HH:MM",
      "time_end": "HH:MM",
      "subject": "название предмета",
      "teacher": "ФИО преподавателя или null",
      "room": "аудитория или null",
      "type": "Лекции/Практические/Лабораторные/null",
      "start_date": "YYYY-MM-DD или null"
    }
  ]
}

ПРИМЕРЫ:
- "Математика (Лекции) проф. Иванов И.И. 2-203" → subject: "Математика", type: "Лекции", teacher: "Иванов И.И.", room: "2-203"
- "Подгруппа 1" в заголовке → subgroup: 1
- "Чет" → week: "четная", "Неч" → week: "нечетная"
- "8:00:00 - 9:30:00" → time_start: "08:00", time_end: "09:30"
- "с 02.02.2026" → start_date: "2026-02-02"
"""

def extract_text_from_docx(file_path):
    """Извлекает текст из Word файла (только таблицы с расписанием)"""
    doc = Document(file_path)
    
    # Ищем самую большую таблицу (это обычно расписание)
    main_table = None
    max_rows = 0
    
    for table in doc.tables:
        if len(table.rows) > max_rows:
            max_rows = len(table.rows)
            main_table = table
    
    if not main_table:
        return ""
    
    # Извлекаем текст из таблицы
    text_parts = []
    for row in main_table.rows:
        row_text = []
        for cell in row.cells:
            cell_text = cell.text.strip().replace('\n', ' ')
            row_text.append(cell_text)
        text_parts.append(" | ".join(row_text))
    
    return "\n".join(text_parts)

def parse_schedule_with_llm(text, filename=None):
    """Парсит расписание с помощью LLM"""
    
    url = "https://openrouter.ai/api/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    user_message = f"Извлеки расписание из этого текста:\n\n{text}"
    if filename:
        user_message += f"\n\nИмя файла: {filename}"
    
    data = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message}
        ],
        "temperature": 0.1,
        "max_tokens": 8000
    }
    
    print(f"🤖 Отправляем запрос к LLM...")
    
    try:
        response = requests.post(url, headers=headers, json=data, timeout=120)
        response.raise_for_status()
        
        result = response.json()
        answer = result['choices'][0]['message']['content']
        
        # Извлекаем JSON
        answer = answer.strip()
        if answer.startswith('```json'):
            answer = answer[7:]
        if answer.startswith('```'):
            answer = answer[3:]
        if answer.endswith('```'):
            answer = answer[:-3]
        answer = answer.strip()
        
        schedule_data = json.loads(answer)
        
        tokens_used = result.get('usage', {}).get('total_tokens', 0)
        cost = tokens_used * 0.00000014  # ~$0.14 за 1M токенов
        
        print(f"✅ Парсинг успешен!")
        print(f"📊 Токенов: {tokens_used}, Стоимость: ${cost:.6f}")
        print(f"📚 Найдено занятий: {len(schedule_data.get('lessons', []))}")
        
        return schedule_data
        
    except json.JSONDecodeError as e:
        print(f"❌ Ошибка парсинга JSON: {e}")
        print(f"   Ответ LLM: {answer[:500]}...")
        return None
    except requests.exceptions.RequestException as e:
        print(f"❌ Ошибка запроса к API: {e}")
        return None

def parse_schedule_file(file_path):
    """Парсит файл расписания"""
    
    print(f"\n{'='*60}")
    print(f"📄 Обрабатываем файл: {os.path.basename(file_path)}")
    print(f"{'='*60}")
    
    # Извлекаем название группы из имени файла
    group_name = os.path.splitext(os.path.basename(file_path))[0]
    
    # Извлекаем текст
    print(f"📖 Извлекаем текст из документа...")
    text = extract_text_from_docx(file_path)
    
    if not text:
        print(f"❌ Не удалось извлечь текст из файла")
        return None
    
    print(f"📝 Извлечено символов: {len(text)}")
    
    # Парсим с помощью LLM
    schedule_data = parse_schedule_with_llm(text, group_name)
    
    return schedule_data

if __name__ == "__main__":
    # Тестируем на одном файле
    test_file = "../../schedules/1AP01_03.docx"
    
    if os.path.exists(test_file):
        result = parse_schedule_file(test_file)
        
        if result:
            print(f"\n{'='*60}")
            print(f"📊 РЕЗУЛЬТАТ:")
            print(f"{'='*60}")
            print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(f"❌ Файл не найден: {test_file}")
        print(f"   Укажите путь к существующему файлу расписания")


def load_to_test_db(schedule_data, filename):
    """Загружает данные в тестовую таблицу lessons_test"""
    
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print(f"\n📤 Загружаем данные в lessons_test...")
    
    lessons_to_insert = []
    
    for lesson in schedule_data.get('lessons', []):
        # Получаем group_id
        group_code = lesson.get('group')
        if not group_code:
            continue
        
        # Ищем группу в БД
        group_response = supabase.table('groups').select('id').eq('code', group_code).execute()
        if not group_response.data:
            print(f"⚠️  Группа {group_code} не найдена в БД")
            continue
        
        group_id = group_response.data[0]['id']
        
        # Формируем запись
        lesson_record = {
            'group_id': group_id,
            'subgroup': lesson.get('subgroup'),
            'day_of_week': lesson.get('day'),
            'week_type': lesson.get('week'),
            'time_start': lesson.get('time_start'),
            'time_end': lesson.get('time_end'),
            'subject': lesson.get('subject'),
            'teacher': lesson.get('teacher'),
            'room': lesson.get('room'),
            'lesson_type': lesson.get('type'),
            'start_date': lesson.get('start_date')
        }
        
        lessons_to_insert.append(lesson_record)
    
    if not lessons_to_insert:
        print(f"❌ Нет данных для загрузки")
        return False
    
    # Загружаем пачками по 100
    batch_size = 100
    total_inserted = 0
    
    for i in range(0, len(lessons_to_insert), batch_size):
        batch = lessons_to_insert[i:i+batch_size]
        try:
            supabase.table('lessons_test').insert(batch).execute()
            total_inserted += len(batch)
            print(f"  ✅ Загружено {total_inserted}/{len(lessons_to_insert)}")
        except Exception as e:
            print(f"  ❌ Ошибка загрузки батча: {e}")
    
    print(f"\n✅ Загрузка завершена! Всего записей: {total_inserted}")
    return True

if __name__ == "__main__":
    import sys
    
    # Можно указать файл как аргумент
    test_file = sys.argv[1] if len(sys.argv) > 1 else "../../schedules/1AP01_03.docx"
    
    if os.path.exists(test_file):
        result = parse_schedule_file(test_file)
        
        if result:
            print(f"\n{'='*60}")
            print(f"📊 РЕЗУЛЬТАТ:")
            print(f"{'='*60}")
            print(json.dumps(result, ensure_ascii=False, indent=2))
            
            # Спрашиваем загрузить ли в БД
            answer = input("\n💾 Загрузить в lessons_test? (y/n): ")
            if answer.lower() == 'y':
                load_to_test_db(result, os.path.basename(test_file))
    else:
        print(f"❌ Файл не найден: {test_file}")
