from docx import Document
import sys

doc = Document('schedules/25PG08_11.docx')

print("Проверка расписания 25ПГ08")
print("="*80)

# Ищем таблицу с расписанием
for table_idx, table in enumerate(doc.tables):
    print(f"\nТаблица {table_idx + 1}:")
    
    # Печатаем первые 20 строк
    for row_idx, row in enumerate(table.rows[:20]):
        cells_text = [cell.text.strip().replace('\n', ' ')[:50] for cell in row.cells[:10]]
        print(f"  Строка {row_idx}: {cells_text}")
