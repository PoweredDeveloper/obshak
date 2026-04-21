/**
 * Cloudflare Worker для Telegram бота
 * Обрабатывает webhook запросы от Telegram
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Обработка webhook от Telegram (принимаем на любом пути для POST запросов)
    if (request.method === 'POST') {
      try {
        const update = await request.json();
        console.log('Received update:', JSON.stringify(update));
        
        // Обрабатываем разные типы обновлений
        if (update.message) {
          console.log('Processing message from:', update.message.from.first_name);
          await handleMessage(update.message, env);
        } else if (update.callback_query) {
          console.log('Processing callback query');
          await handleCallback(update.callback_query, env);
        }
        
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Установка webhook (вызывается один раз)
    if (url.pathname === '/set-webhook') {
      const webhookUrl = url.origin; // Используем корневой URL
      const telegramUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook`;
      
      const response = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl })
      });
      
      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Telegram Bot is running', { status: 200 });
  }
};

async function handleMessage(message, env) {
  console.log('handleMessage called');
  console.log('env object:', Object.keys(env));
  const chatId = message.chat.id;
  const text = message.text;
  
  if (text === '/start') {
    await sendWelcomeMessage(chatId, message.from.first_name, env);
  }
}

async function handleCallback(callbackQuery, env) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  
  // Отвечаем на callback
  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQuery.id })
  });
  
  if (data === 'help_home_screen') {
    await sendHelpMessage(chatId, env);
  }
}

async function sendWelcomeMessage(chatId, firstName, env) {
  console.log('Sending welcome message to:', chatId);
  console.log('BOT_TOKEN exists:', !!env.BOT_TOKEN);
  console.log('MINI_APP_URL:', env.MINI_APP_URL);
  
  const message = `👋 Привет, ${firstName}!

🎓 Добро пожаловать в Obshak — платформу для студентов КГАСУ!

⚠️ *Сейчас идет бета-тестирование*
Если приложение не загружается, попробуй включить VPN.
Скоро исправим! 🔧

Здесь ты можешь:
• 📆 Смотреть расписание своей группы
• 👥 Смотреть расписание друзей
• 👨‍🏫 Оценивать преподавателей

Нажми на кнопку ниже, чтобы начать! 👇`;

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: '🎓 Открыть Obshak',
          web_app: { url: env.MINI_APP_URL }
        }
      ],
      [
        {
          text: '📱 Как добавить на главный экран?',
          callback_data: 'help_home_screen'
        }
      ]
    ]
  };
  
  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    })
  });
}

async function sendHelpMessage(chatId, env) {
  const message = `📱 *Как добавить Obshak на главный экран*

*На Android:*
1. Открой приложение через кнопку выше
2. Нажми на три точки (⋮) в правом верхнем углу
3. Выбери "Добавить на главный экран"
4. Готово! Теперь можно открывать как обычное приложение 🎉

*На iPhone:*
1. Открой приложение через кнопку выше
2. Нажми на "Поделиться" (квадрат со стрелкой)
3. Выбери "На экран Домой"
4. Готово! Иконка появится на главном экране 🎉

💡 После добавления приложение будет открываться мгновенно!`;

  // file_id фото (получите через getUpdates после отправки фото боту)
  const photoFileId = env.HELP_IMAGE_FILE_ID || 'PASTE_FILE_ID_HERE';
  
  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoFileId,
      caption: message,
      parse_mode: 'Markdown'
    })
  });
}
