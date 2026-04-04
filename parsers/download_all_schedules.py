#!/usr/bin/env python3
"""
Скрипт для скачивания расписаний всех групп КГАСУ
"""
import requests
from bs4 import BeautifulSoup
import time
from pathlib import Path
import re
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

def get_all_groups_from_db():
    """Получает список всех групп из базы данных"""
    env_vars = load_env()
    supabase_url = env_vars.get('VITE_SUPABASE_URL')
    supabase_key = env_vars.get('VITE_SUPABASE_PUBLISHABLE_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Не найдены переменные окружения Supabase")
        return []
    
    supabase = create_client(supabase_url, supabase_key)
    
    result = supabase.table('groups').select('name').execute()
    
    groups = [g['name'] for g in result.data]
    return sorted(groups)

def search_group_schedule(group_name, semester=''):
    """Ищет расписание для группы"""
    url = "https://www.kgasu.ru/student/raspisanie-zanyatiy/"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    params = {
        'arrFilter_ff[NAME]': group_name,
        'arrFilter_pf[TIP_RASP]': '107',  # Расписание занятий
        'arrFilter_pf[UCH_GOD]': '236',   # 2025-2026
        'arrFilter_pf[SEMESTR]': semester,  # Пустая строка = оба семестра
        'set_filter': 'Y'
    }
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.encoding = 'utf-8'
        return response.text
    except Exception as e:
        print(f"  ❌ Ошибка запроса: {e}")
        return None

def extract_schedule_link(html, group_name):
    """Извлекает ссылку на файл расписания"""
    soup = BeautifulSoup(html, 'html.parser')
    
    # Ищем div с результатами
    news_list = soup.find('div', class_='news-list')
    
    if not news_list:
        return None
    
    # Ищем ссылки на файлы внутри news-list
    for a in news_list.find_all('a', href=True):
        href = a['href']
        text = a.text.strip()
        
        # Проверяем расширение файла
        if href.endswith('.pdf') or href.endswith('.docx') or href.endswith('.doc'):
            # Делаем абсолютный URL
            if not href.startswith('http'):
                if href.startswith('/'):
                    href = 'https://www.kgasu.ru' + href
                else:
                    href = 'https://st.kgasu.ru/' + href
            
            # Определяем тип файла
            file_type = 'pdf' if href.endswith('.pdf') else ('docx' if href.endswith('.docx') else 'doc')
            
            return {
                'url': href,
                'text': text if text else group_name,
                'type': file_type
            }
    
    return None

def download_file(url, output_dir='schedules'):
    """Скачивает файл"""
    Path(output_dir).mkdir(exist_ok=True)
    
    filename = url.split('/')[-1]
    # Декодируем URL-encoded имя файла
    filename = requests.utils.unquote(filename)
    
    output_path = Path(output_dir) / filename
    
    # Если файл уже существует, пропускаем
    if output_path.exists():
        return str(output_path)
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        
        if response.status_code == 200:
            with open(output_path, 'wb') as f:
                f.write(response.content)
            return str(output_path)
        else:
            print(f"  ❌ Ошибка скачивания: {response.status_code}")
            return None
    except Exception as e:
        print(f"  ❌ Ошибка: {e}")
        return None

def main():
    print("="*60)
    print("📥 СКАЧИВАНИЕ РАСПИСАНИЙ ВСЕХ ГРУПП КГАСУ")
    print("="*60)
    
    # Получаем список групп из базы данных
    print("\n📋 Получение списка групп из базы данных...")
    groups = get_all_groups_from_db()
    
    if not groups:
        print("❌ Группы не найдены в базе данных")
        return
    
    print(f"✅ Найдено групп: {len(groups)}")
    
    # Статистика
    downloaded = 0
    not_found = 0
    errors = 0
    
    # Скачиваем расписания
    for i, group_name in enumerate(groups, 1):
        print(f"\n[{i}/{len(groups)}] 🔍 Группа: {group_name}")
        
        group_downloaded = False
        
        # Пробуем оба семестра: сначала весенний, потом осенний
        for semester_id, semester_name in [('94', 'Весенний'), ('95', 'Осенний')]:
            # Ищем расписание
            html = search_group_schedule(group_name, semester_id)
            if not html:
                continue
            
            # Извлекаем ссылку
            link = extract_schedule_link(html, group_name)
            
            if link:
                print(f"  📄 {semester_name} семестр: {link['text']} ({link['type'].upper()})")
                
                # Скачиваем
                file_path = download_file(link['url'])
                
                if file_path:
                    print(f"  ✅ Сохранено: {file_path}")
                    downloaded += 1
                    group_downloaded = True
                else:
                    errors += 1
                
                # Задержка между запросами
                time.sleep(0.5)
        
        if not group_downloaded:
            print(f"  ⚠️  Расписание не найдено ни в одном семестре")
            not_found += 1
        
        # Задержка между группами
        time.sleep(1)
    
    # Итоговая статистика
    print("\n" + "="*60)
    print("📊 СТАТИСТИКА")
    print("="*60)
    print(f"Всего групп: {len(groups)}")
    print(f"Скачано: {downloaded}")
    print(f"Не найдено: {not_found}")
    print(f"Ошибок: {errors}")
    print("="*60)

if __name__ == '__main__':
    main()
