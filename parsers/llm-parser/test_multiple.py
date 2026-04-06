"""
Тестирование парсера на нескольких файлах
"""
import os
import time
from batch_parser import parse_schedule_batch

# Файлы для тестирования
test_files = [
    "../../schedules/25SZH01_02.docx",  # 25СЖ01, 25СЖ02
    "../../schedules/25EN01_02.docx",   # 25ЭН01, 25ЭН02
    "../../schedules/25PG08_11.docx",   # 25ПГ08-11
]

print("="*80)
print("ТЕСТИРОВАНИЕ ПАРСЕРА НА НЕСКОЛЬКИХ ФАЙЛАХ")
print("="*80)

total_start = time.time()
results = []

for file_path in test_files:
    if not os.path.exists(file_path):
        print(f"\nФайл не найден: {file_path}")
        continue
    
    print(f"\n{'='*80}")
    print(f"Обрабатываем: {os.path.basename(file_path)}")
    print(f"{'='*80}")
    
    start_time = time.time()
    
    try:
        lessons = parse_schedule_batch(file_path)
        elapsed = time.time() - start_time
        
        results.append({
            'file': os.path.basename(file_path),
            'lessons': len(lessons),
            'time': elapsed,
            'success': True
        })
        
        print(f"\nВремя обработки: {elapsed:.1f} сек")
        
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"\nОШИБКА: {e}")
        print(f"Время до ошибки: {elapsed:.1f} сек")
        
        results.append({
            'file': os.path.basename(file_path),
            'lessons': 0,
            'time': elapsed,
            'success': False,
            'error': str(e)
        })

total_elapsed = time.time() - total_start

print(f"\n{'='*80}")
print("ИТОГИ")
print(f"{'='*80}")

for result in results:
    status = "OK" if result['success'] else "ОШИБКА"
    print(f"{result['file']:30} | {status:8} | {result['lessons']:3} занятий | {result['time']:5.1f} сек")

print(f"\nОбщее время: {total_elapsed:.1f} сек ({total_elapsed/60:.1f} мин)")
print(f"Успешно: {sum(1 for r in results if r['success'])}/{len(results)}")
