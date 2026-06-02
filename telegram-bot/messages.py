from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class BotCopy:
    start_message: str
    help_message: str
    open_button_text: str = "🎓 Открыть Obshak"
    help_button_text: str = "📱 Как добавить на главный экран?"
    help_callback_data: str = "help_home_screen"


def get_bot_copy(first_name: str) -> BotCopy:
    name = first_name or "друг"
    open_label = "🎓 Открыть Obshak"

    start_message = (
        f"👋 Привет, {name}!\n\n"
        f"🎓 Добро пожаловать в Obshak — платформу для студентов КГАСУ!\n\n"
        f"Здесь ты можешь:\n"
        f"• 📆 Смотреть расписание своей группы\n"
        f"• 👥 Смотреть расписание друзей\n"
        f"• 👨‍🏫 Оценивать преподавателей\n"
        f"• 🛠️ Находить услуги от студентов\n\n"
        f"Нажми *кнопку ниже* 👇\n"
    )

    help_message = (
        "📱 *Как добавить Obshak на главный экран*\n\n"
        "*На Android:*\n"
        "1. Открой приложение через кнопку выше\n"
        "2. Нажми на три точки (⋮) в правом верхнем углу\n"
        "3. Выбери \"Добавить на главный экран\"\n"
        "4. Готово! Теперь можно открывать как обычное приложение 🎉\n\n"
        "*На iPhone:*\n"
        "1. Открой приложение через кнопку выше\n"
        "2. Нажми на \"Поделиться\" (квадрат со стрелкой)\n"
        "3. Выбери \"На экран Домой\"\n"
        "4. Готово! Иконка появится на главном экране 🎉\n\n"
        "💡 После добавления приложение будет открываться мгновенно!"
    )

    return BotCopy(start_message=start_message, help_message=help_message)

