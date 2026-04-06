"""Реальный расчет стоимости на основе твоих данных"""

print("="*80)
print("РЕАЛЬНЫЙ РАСЧЕТ СТОИМОСТИ")
print("="*80)

# Твои реальные данные
print("\nРеальные данные из парсинга:")
print("  Большой файл (25SZH или 25PG): 1.20 руб")

# Предположим что это файл с 2-4 группами
# Из наших тестов: 25SZH01_02 = ~31000 токенов

# Если 1 большой файл = 1.20 руб
# То цена за 1M токенов = 1.20 / (31000 / 1_000_000) = 1.20 / 0.031 = 38.7 руб за 1M

price_per_big_file = 1.20  # руб
tokens_per_big_file = 31000

price_per_1m = price_per_big_file / (tokens_per_big_file / 1_000_000)

print(f"\nРасчет цены за 1M токенов:")
print(f"  {price_per_big_file} руб / ({tokens_per_big_file} / 1,000,000)")
print(f"  = {price_per_1m:.2f} руб за 1M токенов")

print(f"\n{'='*80}")
print("ОЦЕНКА ДЛЯ 220 ФАЙЛОВ")
print(f"{'='*80}")

# Распределение файлов
# Из 220 файлов примерно:
# - 50% простые (1 группа) - в 4 раза меньше токенов
# - 30% средние (2 группы) - как 25SZH
# - 20% сложные (3-4 группы) - в 1.5 раза больше

simple_files = 110  # 1 группа
medium_files = 66   # 2 группы
complex_files = 44  # 3-4 группы

# Токены
simple_tokens = 7207    # из теста 1GP01
medium_tokens = 31000   # из теста 25SZH
complex_tokens = 45000  # примерно

# Стоимость
simple_cost = (simple_tokens / 1_000_000) * price_per_1m
medium_cost = (medium_tokens / 1_000_000) * price_per_1m
complex_cost = (complex_tokens / 1_000_000) * price_per_1m

print(f"\nРаспределение файлов:")
print(f"  Простые (1 группа): {simple_files} файлов × {simple_cost:.2f} руб = {simple_files * simple_cost:.2f} руб")
print(f"  Средние (2 группы): {medium_files} файлов × {medium_cost:.2f} руб = {medium_files * medium_cost:.2f} руб")
print(f"  Сложные (3-4 группы): {complex_files} файлов × {complex_cost:.2f} руб = {complex_files * complex_cost:.2f} руб")

total_cost = (
    simple_files * simple_cost +
    medium_files * medium_cost +
    complex_files * complex_cost
)

print(f"\nИТОГО: {total_cost:.2f} руб")

# Альтернативный расчет - если все файлы как большой
print(f"\n{'='*80}")
print("АЛЬТЕРНАТИВНЫЙ РАСЧЕТ (если все файлы сложные)")
print(f"{'='*80}")

all_big_cost = 220 * price_per_big_file
print(f"\n220 файлов × {price_per_big_file} руб = {all_big_cost:.2f} руб")

print(f"\n{'='*80}")
print("ВЫВОД")
print(f"{'='*80}")
print(f"\nРеалистичная оценка: {total_cost:.0f} руб")
print(f"Максимальная оценка (если все сложные): {all_big_cost:.0f} руб")
print(f"\nДиапазон: {total_cost:.0f} - {all_big_cost:.0f} руб")
