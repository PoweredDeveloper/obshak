#!/usr/bin/env python3
"""
Загрузка расписаний в Postgres.

Подключение: DATABASE_URL, либо POSTGRES_HOST/POSTGRES_PORT/POSTGRES_PASSWORD/POSTGRES_DB
(по умолчанию localhost:54322 — локальный `supabase start`).

Перед вставкой занятий создаёт недостающие строки в `groups` по именам из .docx
(можно восстановить БД без предзаполненных групп).
"""
import os
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_batch

from parse_schedule_word_v2 import parse_schedule_docx


def load_env():
    """Загружает переменные окружения из .env (родительская папка проекта)."""
    for base in (Path(__file__).resolve().parent.parent, Path('.').resolve()):
        env_path = base / '.env'
        if not env_path.exists():
            continue
        env_vars = {}
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key] = value.strip('"').strip("'")
        return env_vars
    return {}


def connect():
    url = os.environ.get('DATABASE_URL')
    if url:
        return psycopg2.connect(url)
    env = load_env()
    pw = env.get('POSTGRES_PASSWORD', 'postgres')
    host = env.get('POSTGRES_HOST', '127.0.0.1')
    port = env.get('POSTGRES_PORT', '54322')
    db = env.get('POSTGRES_DB', 'postgres')
    user = env.get('POSTGRES_USER', 'postgres')
    return psycopg2.connect(
        f"postgresql://{user}:{pw}@{host}:{port}/{db}",
    )


def get_group_id_map(cur):
    cur.execute("SELECT id::text, name FROM groups")
    return {row[1]: row[0] for row in cur.fetchall()}


def collect_group_names_from_files(docx_files):
    names = set()
    for file_path in docx_files:
        try:
            lessons = parse_schedule_docx(str(file_path))
            for lesson in lessons or []:
                g = lesson.get('group_name')
                if g:
                    names.add(g)
        except Exception as e:
            print(f"  ⚠️  Пропуск {file_path.name} при сборе групп: {e}")
    return names


def ensure_groups_exist(cur, names):
    if not names:
        return 0
    cur.execute("SELECT name FROM groups")
    existing = {row[0] for row in cur.fetchall()}
    added = 0
    for name in sorted(names):
        if name not in existing:
            cur.execute("INSERT INTO groups (name) VALUES (%s)", (name,))
            added += 1
            existing.add(name)
    if added:
        print(f"✓ Добавлено групп в БД: {added}")
    return added


def clear_lessons(cur):
    print("🗑️  Очистка таблицы lessons...")
    cur.execute("TRUNCATE lessons RESTART IDENTITY CASCADE")
    print("✓ Таблица очищена")


def load_lessons_to_db(cur, lessons, group_id_map):
    lessons_to_insert = []
    skipped = 0

    for lesson in lessons:
        group_name = lesson['group_name']
        group_id = group_id_map.get(group_name)

        if not group_id:
            print(f"  ⚠️  Группа {group_name} не найдена в базе")
            skipped += 1
            continue

        lessons_to_insert.append(
            (
                group_id,
                lesson['subgroup'],
                lesson['subject'],
                lesson['type'],
                lesson['teacher'],
                lesson['room'],
                lesson['day_of_week'],
                lesson['lesson_number'],
                lesson['time_start'],
                lesson['time_end'],
                lesson['week_type'],
                'Весенний',
                lesson.get('start_date'),
                lesson.get('end_date'),
            )
        )

    sql = """
        INSERT INTO lessons (
            group_id, subgroup, subject, type, teacher, room,
            day_of_week, lesson_number, time_start, time_end,
            week_type, semester, start_date, end_date
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """
    execute_batch(cur, sql, lessons_to_insert, page_size=100)
    return len(lessons_to_insert), skipped


def main():
    print("=" * 60)
    print("📥 ЗАГРУЗКА РАСПИСАНИЙ В POSTGRES")
    print("=" * 60)

    print("\n🔌 Подключение...")
    conn = connect()
    conn.autocommit = False
    cur = conn.cursor()
    print("✓ Подключено")

    schedules_dir = Path(__file__).resolve().parent / 'schedules'
    if not schedules_dir.exists():
        print("❌ Папка parsers/schedules не найдена")
        return

    docx_files = sorted(
        set(schedules_dir.glob('*.docx')) | set(schedules_dir.glob('*.doc'))
    )
    pdf_count = len(list(schedules_dir.glob('*.pdf')))
    if pdf_count:
        print(f"ℹ️  Пропущено PDF (парсер Word): {pdf_count}")
    print(f"\n📂 Найдено файлов Word: {len(docx_files)}")
    if not docx_files:
        print(
            "❌ Нет .docx/.doc — положи файлы в parsers/schedules или запусти "
            "parsers/download_schedules_index.py"
        )
        cur.close()
        conn.close()
        return

    print("\n📋 Имена групп из файлов → создание строк в groups при необходимости...")
    group_names = collect_group_names_from_files(docx_files)
    ensure_groups_exist(cur, group_names)
    conn.commit()

    group_id_map = get_group_id_map(cur)
    print(f"✓ Групп в базе: {len(group_id_map)}")

    clear_lessons(cur)
    conn.commit()

    total_loaded = 0
    total_skipped = 0
    files_processed = 0

    for file_path in docx_files:
        print(f"\n📖 Обработка: {file_path.name}")

        try:
            lessons = parse_schedule_docx(str(file_path))

            if not lessons:
                print("  ⚠️  Занятия не найдены")
                continue

            print(f"  ✓ Распарсено занятий: {len(lessons)}")

            loaded, skipped = load_lessons_to_db(cur, lessons, group_id_map)
            conn.commit()

            total_loaded += loaded
            total_skipped += skipped
            files_processed += 1

            print(f"  ✅ Загружено: {loaded}, пропущено: {skipped}")

        except Exception as e:
            conn.rollback()
            print(f"  ❌ Ошибка: {e}")

    cur.close()
    conn.close()

    print("\n" + "=" * 60)
    print("📊 ИТОГОВАЯ СТАТИСТИКА")
    print("=" * 60)
    print(f"Обработано файлов: {files_processed}/{len(docx_files)}")
    print(f"Загружено занятий: {total_loaded}")
    print(f"Пропущено: {total_skipped}")
    print("=" * 60)


if __name__ == '__main__':
    main()
