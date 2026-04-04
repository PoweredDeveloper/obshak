#!/usr/bin/env python3
"""
Скрипт для скачивания расписания конкретной группы с сайта КГАСУ
"""
import requests
from bs4 import BeautifulSoup
import time
from pathlib import Path
import re

def search_group_schedule(group_name):
    """Ищет расписание для группы"""
    url = "https://www.kgasu.ru/student/raspisanie-zanyatiy/"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    params = {
        'arrFilter_ff[NAME]': group_name,
        'arrFilter_pf[TIP_RASP]': '107',  # Расписание занятий
        'arrFilter_pf[UCH_GOD]': '236',   # 2025-2026
        'arrFilter_pf[SEMESTR]': '94',    # Весенний
        'set_filter': 'Y'
    }
    
    print(f"🔍 Поиск расписания для группы: {group_name}")
    response = requests.get(url, params=params, headers=headers)
    response.encoding = 'utf-8'
    
    return response.text

def extract_download_links(html):
    """Извлекает ссылки на скачивание файлов расписания"""
    soup = BeautifulSoup(html, 'html.parser')
    
    links = []
    
    # Ищем ссылки на .docx и .pdf файлы
    for a in soup.find_all('a', href=True):
        href = a['href']
        if href.endswith('.docx') or href.endswith('.pdf'):
            # Делаем абсолютный URL
            if not href.startswith('http'):
                href = 'https://www.kgasu.ru' + href
            
            text = a.text.strip()
            links.append({
                'url': href,
                'text': text,
                'type': 'docx' if href.endswith('.docx') else 'pdf'
            })
    
    return links

def download_file(url, output_dir='schedules'):
    """Скачивает файл"""
    Path(output_dir).mkdir(exist_ok=True)
    
    filename = url.split('/')[-1]
    # Декодируем URL-encoded имя файла
    filename = requests.utils.unquote(filename)
    
    output_path = Path(output_dir) / filename
    
    print(f"📥 Скачивание: {filename}")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        with open(output_path, 'wb') as f:
            f.write(response.content)
        print(f"✅ Сохранено: {output_path}")
        return str(output_path)
    else:
        print(f"❌ Ошибка скачивания: {response.status_code}")
        return None

def main():
    # Тестируем на группе 25СЖ01
    group_name = '25СЖ01'
    
    html = search_group_schedule(group_name)
    
    # Сохраняем результат для анализа
    with open(f'search_result_{group_name}.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"💾 Результат поиска сохранен в search_result_{group_name}.html")
    
    # Извлекаем ссылки
    links = extract_download_links(html)
    
    print(f"\n📋 Найдено файлов: {len(links)}")
    for link in links:
        print(f"  - {link['type'].upper()}: {link['text']}")
        print(f"    URL: {link['url']}")
    
    # Скачиваем первый файл для теста
    if links:
        print("\n📥 Скачивание первого файла...")
        download_file(links[0]['url'])

if __name__ == '__main__':
    main()
