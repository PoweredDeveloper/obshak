#!/usr/bin/env python3
"""
Скрипт для загрузки расписаний в базу данных Supabase
"""
from pathlib import Path
from parse_schedule_word import parse_schedule_docx
from supabase import create_client

def load_env():
    """Загружает переменные окружения из .env"""
    env_path = Path('classmate-connect/.env')
    env_vars = {}
    if env_path.exists():
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key] = value.strip('"').strip("'")
    return env_vars

def get_group_id_map(supabase):
    """Получает маппинг имя группы -> ID группы"""
    result = supabase.table('groups').select('id, name').execute()
    return {g['name']: g['id'] for g in result.data}

def clear_lessons(supabase):
    """Очищает таблицу lessons"""
    print("🗑️  Очистка таблицы lessons...")
    supabase.table('lessons').delete().neq('id', 0).execute()
    print("✓ Таблица очищена")

def load_lessons_to_db(supabase, lessons, group_id_map):
    """Загружает занятия в базу данных"""
    
    lessons_to_insert = []
    skipped = 0
    
    for lesson in lessons:
        group_name = lesson['group_name']
        group_id = group_id_map.get(group_name)
        
        if not group_id:
            print(f"  ⚠️  Группа {group_name} не найдена в базе")
            skipped += 1
            continue
        
        lessons_to_insert.append({
            'group_id': group_id,
            'subgroup': lesson['subgroup'],
            'subject': lesson['subject'],
            'type': lesson['type'],
            'teacher': lesson['teacher'],
            'room': lesson['room'],
            'day_of_week': lesson['day_of_week'],
            'lesson_number': lesson['lesson_number'],
            'time_start': lesson['time_start'],
            'time_end': lesson['time_end'],
            'week_type': lesson['week_type'],
            'semester': 'Весенний'  # Пока хардкодим
        })
    
    # Загружаем батчами по 100
    batch_size = 100
    loaded = 0
    
    for i in range(0, len(lessons_to_insert), batch_size):
        batch = lessons_to_insert[i:i + batch_size]
        result = supabase.table('lessons').insert(batch).execute()
        loaded += len(result.data)
        print(f"  Загружено: {loaded}/{len(lessons_to_insert)}")
    
    return loaded, skipped

def main():
    print("="*60)
    print("📥 ЗАГРУЗКА РАСПИСАНИЙ В БАЗУ ДАННЫХ")
    print("="*60)
    
    # Подключаемся к Supabase
    print("\n🔌 Подключение к Supabase...")
    env_vars = load_env()
    supabase_url = env_vars.get('VITE_SUPABASE_URL')
    supabase_key = env_vars.get('VITE_SUPABASE_PUBLISHABLE_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Не найдены переменные окружения Supabase")
        return
    
    supabase = create_client(supabase_url, supabase_key)
    print("✓ Подключено")
    
    # Получаем маппинг групп
    print("\n📋 Получение списка групп...")
    group_id_map = get_group_id_map(supabase)
    print(f"✓ Найдено групп в базе: {len(group_id_map)}")
    
    # Очищаем таблицу lessons
    clear_lessons(supabase)
    
    # Получаем все .docx файлы
    schedules_dir = Path('schedules')
    if not schedules_dir.exists():
        print("❌ Папка schedules не найдена")
        return
    
    docx_files = list(schedules_dir.glob('*.docx'))
    print(f"\n📂 Найдено файлов расписаний: {len(docx_files)}")
    
    # Парсим и загружаем
    total_loaded = 0
    total_skipped = 0
    files_processed = 0
    
    for file_path in docx_files:
        print(f"\n📖 Обработка: {file_path.name}")
        
        try:
            # Парсим файл
            lessons = parse_schedule_docx(str(file_path))
            
            if not lessons:
                print("  ⚠️  Занятия не найдены")
                continue
            
            print(f"  ✓ Распарсено занятий: {len(lessons)}")
            
            # Загружаем в базу
            loaded, skipped = load_lessons_to_db(supabase, lessons, group_id_map)
            
            total_loaded += loaded
            total_skipped += skipped
            files_processed += 1
            
            print(f"  ✅ Загружено: {loaded}, пропущено: {skipped}")
            
        except Exception as e:
            print(f"  ❌ Ошибка: {e}")
    
    # Итоговая статистика
    print("\n" + "="*60)
    print("📊 ИТОГОВАЯ СТАТИСТИКА")
    print("="*60)
    print(f"Обработано файлов: {files_processed}/{len(docx_files)}")
    print(f"Загружено занятий: {total_loaded}")
    print(f"Пропущено: {total_skipped}")
    print("="*60)

if __name__ == '__main__':
    main()
