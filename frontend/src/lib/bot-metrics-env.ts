/** `bot_events` / `bot_user_status` — migration `20260427091500_add_bot_metrics_tables.sql`. Default off → no HEAD/GET 404. Set `VITE_BOT_METRICS=true` after tables exist. */
export const USE_BOT_METRICS_TABLES = import.meta.env.VITE_BOT_METRICS === 'true';
