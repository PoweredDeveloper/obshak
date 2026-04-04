#!/usr/bin/env python3
"""
Скрипт для загрузки преподавателей в базу данных Supabase
"""
from pathlib import Path
from parse_teachers import parse_teachers
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

def main():
    print("="*60)
    print("📥 ЗАГРУЗКА ПРЕПОДАВАТЕЛЕЙ В БАЗУ ДАННЫХ")
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
    
    # Парсим преподавателей
    print("\n📖 Парсинг преподавателей с сайта КГАСУ...")
    teachers = parse_teachers()
    
    if not teachers:
        print("❌ Преподаватели не найдены")
        return
    
    # Очищаем таблицу teachers
    print("\n🗑️  Очистка таблицы teachers...")
    try:
        supabase.table('teachers').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
        print("✓ Таблица очищена")
    except Exception as e:
        print(f"⚠️  Ошибка при очистке: {e}")
    
    # Загружаем преподавателей
    print("\n📥 Загрузка преподавателей в базу...")
    
    teachers_to_insert = []
    for teacher in teachers:
        teachers_to_insert.append({
            'full_name': teacher['full_name'],
            'department': teacher.get('department'),
            'email': teacher.get('email')
        })
    
    # Загружаем батчами по 100
    batch_size = 100
    loaded = 0
    
    for i in range(0, len(teachers_to_insert), batch_size):
        batch = teachers_to_insert[i:i + batch_size]
        try:
            result = supabase.table('teachers').insert(batch).execute()
            loaded += len(result.data)
            print(f"  Загружено: {loaded}/{len(teachers_to_insert)}")
        except Exception as e:
            print(f"  ❌ Ошибка при загрузке батча: {e}")
    
    # Итоговая статистика
    print("\n" + "="*60)
    print("📊 ИТОГОВАЯ СТАТИСТИКА")
    print("="*60)
    print(f"Загружено преподавателей: {loaded}")
    print("="*60)

if __name__ == '__main__':
    main()
