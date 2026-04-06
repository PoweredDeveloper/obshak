"""
Тест подключения к OpenRouter API с DeepSeek
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
OPENROUTER_MODEL = os.getenv('OPENROUTER_MODEL', 'deepseek/deepseek-v3')

def test_openrouter():
    """Тестирует подключение к OpenRouter"""
    
    url = "https://openrouter.ai/api/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {
                "role": "user",
                "content": "Привет! Ответь одним словом: работает ли API?"
            }
        ]
    }
    
    print(f"🔄 Тестируем подключение к OpenRouter...")
    print(f"📦 Модель: {OPENROUTER_MODEL}")
    
    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        
        result = response.json()
        answer = result['choices'][0]['message']['content']
        
        print(f"✅ Подключение успешно!")
        print(f"💬 Ответ модели: {answer}")
        print(f"\n📊 Статистика:")
        print(f"   Токенов использовано: {result.get('usage', {}).get('total_tokens', 'N/A')}")
        
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Ошибка подключения: {e}")
        if hasattr(e.response, 'text'):
            print(f"   Детали: {e.response.text}")
        return False

if __name__ == "__main__":
    test_openrouter()
