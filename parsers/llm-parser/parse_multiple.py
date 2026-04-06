"""
Парсинг нескольких файлов расписания
"""
import os
import json
from batch_parser import parse_schedule_batch

# Файлы для парсинга
files_to_parse = [
    "../../schedules/25EN01_02.docx",
    "../../schedules/25PG08_11.docx", 
    "../../schedules/23ST01.docx"
]

all_results = []
total_tokens = 0

for file_path in files_to_parse:
    if not os.path.exists(file_path):
        print(f"❌ Файл не найден: {file_path}")
        continue
    
    print(f"\n{'='*80}")
    print(f"Парсинг: {os.path.basename(file_path)}")
    print(f"{'='*80}")
    
    lessons = parse_schedule_batch(file_path)
    
    if lessons:
        # Сохраняем результат
        output_file = f"parsed_{os.path.basename(file_path)}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(lessons, f, ensure_ascii=False, indent=2)
        print(f"✅ Сохранено в {output_file}")
        
        all_results.append({
            'file': os.path.basename(file_path),
            'lessons': len(lessons),
            'output': output_file
        })

print(f"\n{'='*80}")
print(f"ИТОГО:")
print(f"{'='*80}")
for result in all_results:
    print(f"  {result['file']}: {result['lessons']} занятий → {result['output']}")
print(f"{'='*80}")
