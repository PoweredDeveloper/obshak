"""
Загрузка распарсенных данных в тестовую таблицу lessons_test
"""
import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

def load_to_test_db(json_file):
    """Загружает данные из JSON в lessons_test"""
    
    print(f"\n{'='*80}")
    print(f"Загрузка данных в lessons_test")
    print(f"{'='*80}\n")
    
    # Читаем JSON
    with open(json_file, 'r', encoding='utf-8') as f:
        lessons = json.load(f)
    
    print(f"Прочитано занятий из JSON: {len(lessons)}")
    
    # Подключаемся к Supabase
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Получаем ID групп
    group_codes = list(set(l['group'] for l in lessons))
    print(f"\nГруппы в файле: {', '.join(group_codes)}")
    
    # Маппинг group_code -> group_id
    group_map = {}
    for code in group_codes:
        response = supabase.table('groups').select('id').eq('name', code).execute()
        if response.data:
            group_map[code] = response.data[0]['id']
            print(f"  {code} -> ID {group_map[code]}")
        else:
            print(f"  ⚠️  Группа {code} не найдена в БД!")
    
    # Маппинг дней недели (название -> номер)
    day_name_to_num = {
        'Понедельник': 1,
        'Вторник': 2,
        'Среда': 3,
        'Четверг': 4,
        'Пятница': 5,
        'Суббота': 6,
        'Воскресенье': 7
    }
    
    # Формируем записи для вставки
    lessons_to_insert = []
    skipped = 0
    
    for lesson in lessons:
        group_code = lesson['group']
        
        if group_code not in group_map:
            skipped += 1
            continue
        
        # Определяем день недели (должен быть integer)
        day_of_week = None
        
        # lesson может содержать либо номер дня, либо название
        if isinstance(lesson.get('day_of_week'), int):
            day_of_week = lesson['day_of_week']
        elif isinstance(lesson.get('day_of_week'), str):
            day_of_week = day_name_to_num.get(lesson['day_of_week'])
        
        # Если день не найден, пропускаем
        if not day_of_week:
            skipped += 1
            continue
        
        record = {
            'group_id': group_map[group_code],
            'subgroup': lesson.get('subgroup') or 0,
            'day_of_week': day_of_week,  # integer
            'lesson_number': lesson['lesson_number'],
            'time_start': lesson['time_start'],
            'time_end': lesson['time_end'],
            'week_type': lesson['week_type'],
            'subject': lesson['subject'],
            'type': lesson.get('type'),  # Исправлено: type вместо lesson_type
            'teacher': lesson.get('teacher'),
            'room': lesson.get('room'),
            'start_date': lesson.get('start_date'),
            'end_date': lesson.get('end_date')
        }
        
        lessons_to_insert.append(record)
    
    print(f"\nПодготовлено к загрузке: {len(lessons_to_insert)}")
    print(f"Пропущено: {skipped}")
    
    if not lessons_to_insert:
        print("\n❌ Нет данных для загрузки!")
        return False
    
    # Сначала удаляем старые данные этих групп из тестовой таблицы
    print(f"\nУдаляем старые данные групп {', '.join(group_codes)} из lessons_test...")
    for group_code in group_codes:
        if group_code in group_map:
            supabase.table('lessons_test').delete().eq('group_id', group_map[group_code]).execute()
    
    # Загружаем пачками по 100
    print(f"\nЗагружаем данные в lessons_test...")
    batch_size = 100
    total_inserted = 0
    
    for i in range(0, len(lessons_to_insert), batch_size):
        batch = lessons_to_insert[i:i+batch_size]
        try:
            supabase.table('lessons_test').insert(batch).execute()
            total_inserted += len(batch)
            print(f"  Загружено: {total_inserted}/{len(lessons_to_insert)}")
        except Exception as e:
            print(f"  ❌ Ошибка загрузки батча: {e}")
    
    print(f"\n✅ Загрузка завершена!")
    print(f"Всего записей в lessons_test: {total_inserted}")
    
    return True

if __name__ == "__main__":
    import sys
    
    json_file = sys.argv[1] if len(sys.argv) > 1 else "parsed_25SZH01_02.docx.json"
    
    if not os.path.exists(json_file):
        print(f"❌ Файл не найден: {json_file}")
    else:
        load_to_test_db(json_file)
