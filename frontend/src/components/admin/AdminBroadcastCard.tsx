import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';

export function AdminBroadcastCard() {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const text = message.trim();
    if (!text) {
      toast.error('Введите текст рассылки');
      return;
    }
    if (!window.confirm('Отправить сообщение всем пользователям с telegram_id?')) {
      return;
    }

    setSending(true);
    const { data, error } = await supabase.functions.invoke('admin-broadcast', {
      body: { message: text },
    });
    setSending(false);

    if (error) {
      console.error(error);
      toast.error('Не удалось отправить рассылку');
      return;
    }

    const result = data as { sent?: number; failed?: number; total?: number; error?: string };
    if (result?.error) {
      toast.error(result.error);
      return;
    }

    toast.success(
      `Отправлено: ${result?.sent ?? 0}, ошибок: ${result?.failed ?? 0} (всего ${result?.total ?? 0})`,
    );
    setMessage('');
  }

  return (
    <Card className="p-4 space-y-3">
      <div>
        <h3 className="font-semibold">Рассылка в Telegram</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Отправит сообщение всем пользователям, у кого есть telegram_id в базе. В боте также:{' '}
          <code className="text-xs">/broadcast текст</code>
        </p>
      </div>
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Текст сообщения для всех пользователей..."
        rows={4}
        disabled={sending}
      />
      <Button onClick={handleSend} disabled={sending || !message.trim()} className="w-full sm:w-auto">
        {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
        Отправить рассылку
      </Button>
    </Card>
  );
}
