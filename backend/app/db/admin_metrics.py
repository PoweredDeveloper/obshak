"""Server-side aggregation for admin user metrics (replaces frontend `use-users-stats`)."""

from __future__ import annotations

from typing import Any

import asyncpg

_BOT_EVENT_TYPES = ("update_received", "start_command", "help_callback")


async def _table_exists(conn: asyncpg.Connection, name: str) -> bool:
    return bool(
        await conn.fetchval(
            """
            SELECT EXISTS (
              SELECT 1 FROM information_schema.tables
              WHERE table_schema = 'public' AND table_name = $1
            )
            """,
            name,
        )
    )


async def compute_user_stats(conn: asyncpg.Connection) -> dict[str, Any]:
    """Return a dict compatible with `UserStats` schema."""

    moscow_day_start = await conn.fetchval(
        """
        SELECT ((now() AT TIME ZONE 'Europe/Moscow')::date)
               AT TIME ZONE 'Europe/Moscow'
        """
    )

    total_users = await conn.fetchval("SELECT COUNT(*)::int FROM public.profiles") or 0
    new_users_today = (
        await conn.fetchval(
            "SELECT COUNT(*)::int FROM public.profiles WHERE created_at >= $1",
            moscow_day_start,
        )
        or 0
    )
    active_today = (
        await conn.fetchval(
            """
            SELECT COUNT(*)::int FROM public.profiles
            WHERE last_active IS NOT NULL AND last_active >= $1
            """,
            moscow_day_start,
        )
        or 0
    )
    active_week = (
        await conn.fetchval(
            """
            SELECT COUNT(*)::int FROM public.profiles
            WHERE last_active IS NOT NULL AND last_active >= (now() - interval '7 days')
            """
        )
        or 0
    )
    active_month = (
        await conn.fetchval(
            """
            SELECT COUNT(*)::int FROM public.profiles
            WHERE last_active IS NOT NULL AND last_active >= (now() - interval '30 days')
            """
        )
        or 0
    )

    by_institute_rows = await conn.fetch(
        """
        SELECT institute AS institute, COUNT(*)::int AS count
        FROM public.profiles
        WHERE institute IS NOT NULL AND trim(institute) <> ''
        GROUP BY institute
        ORDER BY count DESC
        """
    )
    by_group_rows = await conn.fetch(
        """
        SELECT group_name AS group_name, COUNT(*)::int AS count
        FROM public.profiles
        WHERE group_name IS NOT NULL AND trim(group_name) <> ''
        GROUP BY group_name
        ORDER BY count DESC
        LIMIT 15
        """
    )

    blocked_users = 0
    unrecognized_requests = 0
    bot_crashes = 0
    day1_retention_pct = 0.0
    week1_retention_pct = 0.0

    has_bot_events = await _table_exists(conn, "bot_events")
    has_bot_status = await _table_exists(conn, "bot_user_status")

    if has_bot_status:
        blocked_users = (
            await conn.fetchval(
                """
                SELECT COUNT(*)::int FROM public.bot_user_status
                WHERE is_blocked = true
                """
            )
            or 0
        )

    if has_bot_events:
        unrecognized_requests = (
            await conn.fetchval(
                """
                SELECT COUNT(*)::int FROM public.bot_events
                WHERE event_type = 'unrecognized_request'
                """
            )
            or 0
        )
        bot_crashes = (
            await conn.fetchval(
                """
                SELECT COUNT(*)::int FROM public.bot_events
                WHERE event_type = 'bot_crash'
                """
            )
            or 0
        )

        ret = await conn.fetchrow(
            """
            WITH act AS (
              SELECT DISTINCT be.telegram_id::bigint AS telegram_id,
                     (be.created_at AT TIME ZONE 'UTC')::date AS dday
              FROM public.bot_events be
              WHERE be.event_type = ANY($1::text[])
                AND be.telegram_id IS NOT NULL
                AND be.created_at IS NOT NULL
            ),
            prof AS (
              SELECT p.telegram_id::bigint AS telegram_id,
                     (p.created_at AT TIME ZONE 'UTC')::date AS cday
              FROM public.profiles p
              WHERE p.telegram_id IS NOT NULL
            ),
            eligible AS (
              SELECT p.telegram_id, p.cday
              FROM prof p
              WHERE EXISTS (SELECT 1 FROM act a WHERE a.telegram_id = p.telegram_id)
            )
            SELECT
              COUNT(*)::int AS base_users,
              COUNT(*) FILTER (
                WHERE EXISTS (
                  SELECT 1 FROM act a
                  WHERE a.telegram_id = e.telegram_id AND a.dday = e.cday + 1
                )
              )::int AS retained_day1,
              COUNT(*) FILTER (
                WHERE EXISTS (
                  SELECT 1 FROM act a
                  WHERE a.telegram_id = e.telegram_id AND a.dday = e.cday + 7
                )
              )::int AS retained_week1
            FROM eligible e
            """,
            list(_BOT_EVENT_TYPES),
        )
        if ret:
            base_users = int(ret["base_users"] or 0)
            d1 = int(ret["retained_day1"] or 0)
            w1 = int(ret["retained_week1"] or 0)
            if base_users > 0:
                day1_retention_pct = round((d1 / base_users) * 1000) / 10.0
                week1_retention_pct = round((w1 / base_users) * 1000) / 10.0

    safe_blocked = blocked_users or 0
    blocked_pct = round((safe_blocked / total_users) * 1000) / 10.0 if total_users > 0 else 0.0

    return {
        "totalUsers": int(total_users),
        "newUsersToday": int(new_users_today),
        "activeToday": int(active_today),
        "activeWeek": int(active_week),
        "activeMonth": int(active_month),
        "day1RetentionPct": float(day1_retention_pct),
        "week1RetentionPct": float(week1_retention_pct),
        "blockedUsers": int(safe_blocked),
        "blockedUsersPct": float(blocked_pct),
        "unrecognizedRequests": int(unrecognized_requests),
        "botCrashes": int(bot_crashes),
        "byInstitute": [{"institute": r["institute"], "count": int(r["count"])} for r in by_institute_rows],
        "byGroup": [{"group_name": r["group_name"], "count": int(r["count"])} for r in by_group_rows],
    }
