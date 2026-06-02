#!/usr/bin/env python3
"""
Download all schedule .doc/.docx files from the KGASU public index
(raspisanie-zanyatiy, учебный год 2025–2026).

Use when the DB has no groups yet — no need to query `groups` first.
After download, run: python parsers/load_schedules_to_db.py
"""
import re
import time
from pathlib import Path
from urllib.parse import unquote

import requests
from bs4 import BeautifulSoup

SCHEDULE_URL = 'https://www.kgasu.ru/student/raspisanie-zanyatiy/'
OUTPUT_DIR = Path(__file__).resolve().parent / 'schedules'
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}


def normalize_href(href: str) -> str:
    if href.startswith('http'):
        return href
    if href.startswith('/'):
        return 'https://www.kgasu.ru' + href
    return 'https://st.kgasu.ru/' + href.lstrip('/')


def fetch_page(page: int) -> str:
    params = {
        'arrFilter_pf[TIP_RASP]': '107',
        'arrFilter_pf[UCH_GOD]': '236',
        'set_filter': 'Y',
    }
    if page > 1:
        params['PAGEN_1'] = str(page)
    resp = requests.get(SCHEDULE_URL, params=params, headers=HEADERS, timeout=30)
    resp.encoding = 'utf-8'
    resp.raise_for_status()
    return resp.text


def extract_file_links(html: str) -> list[tuple[str, str]]:
    soup = BeautifulSoup(html, 'html.parser')
    out: list[tuple[str, str]] = []
    for a in soup.find_all('a', href=True):
        href = a['href']
        if not href.endswith(('.doc', '.docx')):
            continue
        label = (a.get_text() or '').strip() or unquote(href.split('/')[-1])
        out.append((normalize_href(href), label))
    return out


def download_file(url: str, dest: Path) -> bool:
    if dest.exists() and dest.stat().st_size > 0:
        return True
    resp = requests.get(url, headers=HEADERS, timeout=60)
    if resp.status_code != 200:
        print(f'  ❌ HTTP {resp.status_code}: {url}')
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(resp.content)
    return True


def main() -> None:
    print('=' * 60)
    print('📥 СКАЧИВАНИЕ РАСПИСАНИЙ С ИНДЕКСА КГАСУ')
    print('=' * 60)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    seen_urls: set[str] = set()
    page = 1
    downloaded = 0
    skipped = 0
    errors = 0

    while page <= 100:
        print(f'\n📄 Страница {page}...')
        html = fetch_page(page)
        links = extract_file_links(html)
        new_links = [(u, t) for u, t in links if u not in seen_urls]
        for u, _ in links:
            seen_urls.add(u)

        if not links:
            print('  Пустая страница — конец.')
            break
        if not new_links and page > 1:
            print(f'  Новых ссылок нет (всего уникальных: {len(seen_urls)}).')
            break

        for url, label in new_links:
            name = unquote(url.split('/')[-1])
            dest = OUTPUT_DIR / name
            print(f'  → {label[:50]} ({name})')
            if download_file(url, dest):
                if dest.stat().st_size > 0:
                    downloaded += 1
                else:
                    skipped += 1
            else:
                errors += 1
            time.sleep(0.3)

        page += 1
        time.sleep(0.5)

    print('\n' + '=' * 60)
    print(f'Уникальных URL: {len(seen_urls)}')
    print(f'Скачано файлов: {downloaded}')
    print(f'Пропущено (уже были): {skipped}')
    print(f'Ошибок: {errors}')
    print(f'Папка: {OUTPUT_DIR}')
    print('=' * 60)
    print('\nДалее: python parsers/load_schedules_to_db.py')


if __name__ == '__main__':
    main()
