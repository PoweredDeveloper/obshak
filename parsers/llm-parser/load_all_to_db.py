"""
Массовая загрузка всех распарсенных JSON файлов в БД
"""
import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

def load_all_jsons_to_db(json_folder, target_table='lessons'):
    """Загружает все JSON файлы из папки в БД"""
    
    print(f"\n{'='*80}")
    print(f"Массовая загрузка в таблицу {target_table}")
    print(f"{'='*80}\n")
    
    # Подключаемся к Supabase
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Находим все JSON файлы
    json_files = [f for f in os.listdir(json_folder) if f.endswith('.json')]
    
    if not json_files:
        print(f"❌ Нет JSON файлов в папке {json_folder}")
        return
    
    print(f"Найдено JSON файлов: {len(json_files)}\n")
    
    # Маппинг дней недели
    day_name_to_num = {
        'Понедельник': 1,
        'Вторник': 2,
        'Среда': 3,
        'Четверг': 4,
        'Пятница': 5,
        'Суббота': 6,
        'Воскресенье': 7
    }
    
    # Получаем все группы из БД
    print("📋 Загружаем список групп из БД...")
    groups_response = supabase.table('groups').select('id, name').execute()
    group_map = {g['name']: g['id'] for g in groups_response.data}
    print(f"Групп в БД: {len(group_map)}\n")
    
    total_loaded = 0
    total_skipped = 0
    processed_groups = set()
    
    for json_file in json_files:
        file_path = os.path.join(json_folder, json_file)
        
        print(f"📄 {json_file}...")
        
        try:
            with open(file_path, 'r', encoding='utf-8-sig') as f:
                lessons = json.load(f)
            
            if not lessons:
                print(f"  ⚠️  Пустой файл, пропускаем")
                continue
            
            # Определяем группы в файле
            file_groups = list(set(l['group'] for l in lessons))
            
            # Формируем записи
            lessons_to_insert = []
            skipped = 0
            
            for lesson in lessons:
                group_code = lesson['group']
                
                if group_code not in group_map:
                    skipped += 1
                    continue
                
                # Определяем день недели
                day_of_week = None
                if isinstance(lesson.get('day_of_week'), int):
                    day_of_week = lesson['day_of_week']
                elif isinstance(lesson.get('day_of_week'), str):
                    day_of_week = day_name_to_num.get(lesson['day_of_week'])
                
                if not day_of_week:
                    skipped += 1
                    continue
                
                # Функция для конвертации "null" строк в None
                def clean_value(val):
                    if val == "null" or val == "":
                        return None
                    return val
                
                # Пропускаем записи без предмета
                subject = clean_value(lesson['subject'])
                if not subject:
                    skipped += 1
                    continue
                
                record = {
                    'group_id': group_map[group_code],
                    'subgroup': lesson.get('subgroup') or 0,
                    'day_of_week': day_of_week,
                    'lesson_number': lesson['lesson_number'],
                    'time_start': lesson['time_start'],
                    'time_end': lesson['time_end'],
                    'week_type': lesson['week_type'],
                    'subject': subject,
                    'type': clean_value(lesson.get('type')),
                    'teacher': clean_value(lesson.get('teacher')),
                    'room': clean_value(lesson.get('room')),
                    'start_date': clean_value(lesson.get('start_date')),
                    'end_date': clean_value(lesson.get('end_date'))
                }
                
                lessons_to_insert.append(record)
            
            if not lessons_to_insert:
                print(f"  ⚠️  Нет данных для загрузки")
                total_skipped += skipped
                continue
            
            # Удаляем старые данные этих групп
            for group_code in file_groups:
                if group_code in group_map and group_code not in processed_groups:
                    supabase.table(target_table).delete().eq('group_id', group_map[group_code]).execute()
                    processed_groups.add(group_code)
            
            # Загружаем пачками
            batch_size = 100
            loaded = 0
            
            for i in range(0, len(lessons_to_insert), batch_size):
                batch = lessons_to_insert[i:i+batch_size]
                try:
                    supabase.table(target_table).insert(batch).execute()
                    loaded += len(batch)
                except Exception as e:
                    print(f"  ❌ Ошибка загрузки батча: {e}")
            
            print(f"  ✅ Загружено: {loaded}, пропущено: {skipped}, группы: {', '.join(file_groups)}")
            total_loaded += loaded
            total_skipped += skipped
            
        except Exception as e:
            print(f"  ❌ Ошибка обработки файла: {e}")
    
    print(f"\n{'='*80}")
    print(f"ИТОГО:")
    print(f"  Файлов обработано: {len(json_files)}")
    print(f"  Групп обновлено: {len(processed_groups)}")
    print(f"  Занятий загружено: {total_loaded}")
    print(f"  Записей пропущено: {total_skipped}")
    print(f"{'='*80}")

if __name__ == "__main__":
    import sys
    
    json_folder = sys.argv[1] if len(sys.argv) > 1 else "parsed_results"
    target_table = sys.argv[2] if len(sys.argv) > 2 else "lessons_test"
    
    if not os.path.exists(json_folder):
        print(f"❌ Папка не найдена: {json_folder}")
        print(f"\nИспользование:")
        print(f"  python load_all_to_db.py <папка_с_json> [таблица]")
        print(f"\nПример:")
        print(f"  python load_all_to_db.py parsed_results lessons")
        print(f"  python load_all_to_db.py parsed_results lessons_test")
        sys.exit(1)
    
    load_all_jsons_to_db(json_folder, target_table)
