"""Тест парсинга одной ячейки"""
import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
OPENROUTER_MODEL = 'deepseek/deepseek-chat'

CELL_PARSE_PROMPT = """Ты парсишь ячейку расписания университета.

Формат: "Предмет (Тип) Преподаватель Аудитория"

Примеры:
- "Математика (Лекции) проф. Иванов И.И. 2-203"
- "Физика (Практические)доц. Петров2-305"
- "Химия (Лабораторные) до 12.04. доц. Сидоров 1-36"
- "История (Лекции) С 20.04. проф. Смирнов 3-208"
- "Физкультура (Практические) СК «Тезуче» доц. Калманович В.Л., доц. Архипов Е.Ю."

Верни ТОЛЬКО JSON (без markdown):
{
  "subject": "название предмета",
  "type": "Лекции/Практические/Лабораторные",
  "teacher": "ФИО или null",
  "room": "аудитория или null",
  "start_date": "YYYY-MM-DD или null",
  "end_date": "YYYY-MM-DD или null"
}

Правила:
- Год не указан → 2026
- Несколько преподавателей → через запятую
- Убери лишние пробелы"""

# Тестовые ячейки
test_cells = [
    "Информационные и маркетинговые технологии в градостроительстве (Лекции) доц. Зарипова А. В.    3-305",
    "Градостроительное проектирование проектирование (2 уровень) (Практические) доц. Закиева Л. Ф.  НОЦ УРБАН  3-414",
    "Математика (Лекции) проф. Тимергалиев С. Н.2-203",
    "Химия (Практические) до 12.04. доц. Валиева А. Ф. 1-36",
    "Элективные курсы по физической культуре и спорту (Практические) СК «Тезуче» доц. Калманович В.Л.,  доц. Архипов Е.Ю."
]

def parse_cell(cell_text):
    url = "https://openrouter.ai/api/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": CELL_PARSE_PROMPT},
            {"role": "user", "content": cell_text}
        ],
        "temperature": 0.1,
        "max_tokens": 200
    }
    
    response = requests.post(url, headers=headers, json=data, timeout=30)
    response.raise_for_status()
    
    result = response.json()
    answer = result['choices'][0]['message']['content'].strip()
    
    # Убираем markdown
    if answer.startswith('```'):
        answer = answer.split('\n', 1)[1]
    if answer.endswith('```'):
        answer = answer.rsplit('\n', 1)[0]
    
    tokens = result.get('usage', {}).get('total_tokens', 0)
    
    return json.loads(answer), tokens

print("🧪 Тестируем парсинг ячеек\n")

total_tokens = 0

for i, cell in enumerate(test_cells, 1):
    print(f"{'='*80}")
    print(f"ТЕСТ {i}")
    print(f"{'='*80}")
    print(f"Вход: {cell}\n")
    
    try:
        result, tokens = parse_cell(cell)
        total_tokens += tokens
        
        print(f"Выход:")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        print(f"\nТокенов: {tokens}")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
    
    print()

print(f"{'='*80}")
print(f"Всего токенов: {total_tokens}")
print(f"Стоимость: ${total_tokens * 0.00000014:.6f}")
