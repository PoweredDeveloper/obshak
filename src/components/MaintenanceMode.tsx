import { Wrench } from 'lucide-react';

export default function MaintenanceMode() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-5">
      <div className="max-w-md w-full text-center">
        {/* Иконка */}
        <div className="mb-6 flex justify-center">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <Wrench className="w-12 h-12 text-primary" />
          </div>
        </div>

        {/* Заголовок */}
        <h1 className="text-2xl font-bold text-foreground mb-3">
          Технические работы
        </h1>

        {/* Описание */}
        <p className="text-muted-foreground mb-6 leading-relaxed">
          Мы улучшаем Obshak для вас! Приложение временно недоступно.
          Скоро всё заработает.
        </p>

        {/* Эмодзи */}
        <div className="text-6xl mb-6">
          🛠️
        </div>

        {/* Дополнительная информация */}
        <div className="bg-card rounded-2xl p-4 border border-border">
          <p className="text-sm text-muted-foreground">
            Ожидаемое время: <span className="font-semibold text-foreground">~30 минут</span>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Спасибо за терпение! 💙
          </p>
        </div>
      </div>
    </div>
  );
}
