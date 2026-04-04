#!/usr/bin/env python3
"""
Парсер преподавателей КГАСУ с сайта
"""
import re
import requests
from bs4 import BeautifulSoup

def parse_teachers():
    """Парсит список преподавателей с сайта КГАСУ"""
    base_url = "https://www.kgasu.ru/universitet/person/prepodavateli/"
    
    all_teachers = []
    page = 1
    
    while True:
        url = f"{base_url}?PAGEN_1={page}" if page > 1 else base_url
        
        print(f"📥 Загрузка страницы {page}: {url}")
        response = requests.get(url)
        response.encoding = 'utf-8'
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Получаем чистый текст
        text = soup.get_text()
        
        teachers = []
        
        # Разбиваем текст на строки и очищаем
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        current_teacher = None
        next_is_email = False
        next_is_department = False
        
        for i, line in enumerate(lines):
            # Проверяем если это ФИО (начинается с заглавной буквы, содержит минимум 2 слова)
            if re.match(r'^[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+', line):
                # Проверяем что это не служебное слово или название института
                if any(x in line for x in ['Дисциплины:', 'Институт:', 'Телефон:', 'Ученая степень:', 'Ученое звание:', 'Кафедра:', 'E-mail:', 'Институт ', 'Минпросвещения']):
                    continue
                
                # Сохраняем предыдущего преподавателя
                if current_teacher and current_teacher.get('full_name'):
                    teachers.append(current_teacher)
                
                current_teacher = {
                    'full_name': line,
                    'department': None,
                    'email': None
                }
                next_is_email = False
                next_is_department = False
            
            # Проверяем маркеры
            elif line == 'E-mail:':
                next_is_email = True
            elif line == 'Кафедра:':
                next_is_department = True
            # Читаем значения после маркеров
            elif next_is_email and current_teacher:
                email = line.strip()
                if '@' in email:
                    # Берем только первый email
                    email = email.split(';')[0].split(',')[0].strip()
                    current_teacher['email'] = email
                next_is_email = False
            elif next_is_department and current_teacher:
                current_teacher['department'] = line
                next_is_department = False
        
        # Добавляем последнего преподавателя
        if current_teacher and current_teacher.get('full_name'):
            teachers.append(current_teacher)
        
        print(f"  ✅ Найдено на странице: {len(teachers)}")
        
        # Если на странице нет преподавателей, значит это последняя страница
        if len(teachers) == 0:
            print(f"  ℹ️  Достигнута последняя страница")
            break
        
        all_teachers.extend(teachers)
        page += 1
        
        # Защита от бесконечного цикла
        if page > 20:
            print(f"  ⚠️  Достигнут лимит страниц (20)")
            break
    
    print(f"\n✅ Всего найдено преподавателей: {len(all_teachers)}")
    
    # Выводим примеры
    print("\n📚 Примеры:")
    for teacher in all_teachers[:5]:
        print(f"\n  ФИО: {teacher['full_name']}")
        print(f"  Кафедра: {teacher.get('department', 'Не указана')}")
        print(f"  Email: {teacher.get('email', 'Не указан')}")
    
    return all_teachers

def main():
    print("="*60)
    print("📥 ПАРСИНГ ПРЕПОДАВАТЕЛЕЙ КГАСУ")
    print("="*60)
    
    teachers = parse_teachers()
    
    print("\n" + "="*60)
    print(f"📊 Всего преподавателей: {len(teachers)}")
    print("="*60)
    
    return teachers

if __name__ == '__main__':
    main()
