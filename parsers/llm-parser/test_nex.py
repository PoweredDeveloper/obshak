"""
Тест подключения к Polza AI API
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

POLZA_API_KEY = os.getenv('POLZA_API_KEY')
POLZA_MODEL = os.getenv('POLZA_MODEL', 'nex-agi/deepseek-v3.1-nex-n1')
POLZA_API_URL = os.getenv('POLZA_API_URL', 'https://polza.ai/api/v1/chat/completions')

def test_polza():
    """Тестирует подключение к Polza AI"""
    
    headers = {
        "Authorization": f"Bearer {POLZA_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": POLZA_MODEL,
        "messages": [
            {
                "role": "user",
                "content": "Привет! Ответь одним словом: работает ли API?"
            }
        ]
    }
    
    print(f"Тестируем подключение к Polza AI...")
    print(f"URL: {POLZA_API_URL}")
    print(f"Модель: {POLZA_MODEL}")
    
    try:
        response = requests.post(POLZA_API_URL, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        answer = result['choices'][0]['message']['content']
        
        print(f"\nПодключение успешно!")
        print(f"Ответ модели: {answer}")
        print(f"\nСтатистика:")
        print(f"   Токенов использовано: {result.get('usage', {}).get('total_tokens', 'N/A')}")
        
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"\nОшибка подключения: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"   Статус: {e.response.status_code}")
            print(f"   Детали: {e.response.text}")
        return False

if __name__ == "__main__":
    test_polza()
