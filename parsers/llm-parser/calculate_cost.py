"""Расчет стоимости парсинга"""

# Реальные данные из тестов
simple_file = {
    'name': '1GP01.docx',
    'groups': 1,
    'lessons': 26,
    'tokens': 7207,
    'cost': 0.001009
}

complex_file = {
    'name': '25SZH01_02.docx',
    'groups': 2,
    'lessons': 140,
    'tokens': 31000,  # Примерная оценка
    'cost': 0.00434   # 31000 * 0.00000014
}

print("="*80)
print("РАСЧЕТ СТОИМОСТИ ПАРСИНГА ВСЕХ ФАЙЛОВ")
print("="*80)

print(f"\nРеальные данные из тестов:")
print(f"\n1. Простой файл ({simple_file['name']}):")
print(f"   Групп: {simple_file['groups']}")
print(f"   Занятий: {simple_file['lessons']}")
print(f"   Токенов: {simple_file['tokens']}")
print(f"   Стоимость: ${simple_file['cost']:.6f}")

print(f"\n2. Сложный файл ({complex_file['name']}):")
print(f"   Групп: {complex_file['groups']}")
print(f"   Занятий: {complex_file['lessons']}")
print(f"   Токенов: {complex_file['tokens']}")
print(f"   Стоимость: ${complex_file['cost']:.6f}")

print(f"\n{'='*80}")
print("ОЦЕНКА ДЛЯ ВСЕХ 220 ФАЙЛОВ")
print(f"{'='*80}")

# Распределение файлов по сложности (примерная оценка)
distributions = [
    {
        'name': 'Консервативная оценка',
        'simple': 100,  # 1 группа
        'medium': 80,   # 2 группы
        'complex': 40,  # 3-4 группы
    },
    {
        'name': 'Средняя оценка',
        'simple': 120,
        'medium': 70,
        'complex': 30,
    },
    {
        'name': 'Оптимистичная оценка',
        'simple': 140,
        'medium': 60,
        'complex': 20,
    }
]

# Стоимость по типам файлов
costs = {
    'simple': simple_file['cost'],      # 1 группа
    'medium': 0.002,                     # 2 группы
    'complex': complex_file['cost'],     # 3-4 группы
}

for dist in distributions:
    total_cost = (
        dist['simple'] * costs['simple'] +
        dist['medium'] * costs['medium'] +
        dist['complex'] * costs['complex']
    )
    
    print(f"\n{dist['name']}:")
    print(f"  Простые файлы (1 группа): {dist['simple']} × ${costs['simple']:.6f} = ${dist['simple'] * costs['simple']:.2f}")
    print(f"  Средние файлы (2 группы): {dist['medium']} × ${costs['medium']:.6f} = ${dist['medium'] * costs['medium']:.2f}")
    print(f"  Сложные файлы (3-4 группы): {dist['complex']} × ${costs['complex']:.6f} = ${dist['complex'] * costs['complex']:.2f}")
    print(f"  ИТОГО: ${total_cost:.2f}")

print(f"\n{'='*80}")
print("СРАВНЕНИЕ С ДРУГИМИ МОДЕЛЯМИ")
print(f"{'='*80}")

# Цены других моделей (за 1M токенов)
models = {
    'DeepSeek V3 (Polza)': 0.14,
    'GPT-4o-mini': 0.375,  # (0.15 + 0.60) / 2
    'Claude 3.5 Sonnet': 9.0,  # (3 + 15) / 2
    'GPT-4o': 6.25,  # (2.5 + 10) / 2
}

# Средний файл: ~15000 токенов
avg_tokens = 15000
total_tokens = avg_tokens * 220

print(f"\nСредний файл: {avg_tokens} токенов")
print(f"Всего токенов для 220 файлов: {total_tokens:,}")
print(f"\nСтоимость по моделям:")

for model, price_per_1m in sorted(models.items(), key=lambda x: x[1]):
    cost = (total_tokens / 1_000_000) * price_per_1m
    print(f"  {model:30} ${cost:.2f}")

print(f"\n{'='*80}")
print("ВЫВОД")
print(f"{'='*80}")
print(f"\nDeepSeek V3 через Polza AI - САМЫЙ ДЕШЕВЫЙ вариант!")
print(f"Экономия по сравнению с GPT-4o-mini: ~${(total_tokens / 1_000_000) * (0.375 - 0.14):.2f}")
print(f"Экономия по сравнению с Claude 3.5: ~${(total_tokens / 1_000_000) * (9.0 - 0.14):.2f}")
