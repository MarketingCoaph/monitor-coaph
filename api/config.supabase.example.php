<?php
return [
    'DB_DRIVER' => 'pgsql',
    // Copy host/user/port from Connect > Session pooler (IPv4 compatible).
    'DB_HOST' => getenv('DB_HOST') ?: 'db.umpkqbganfxnqzjpfaof.supabase.co',
    'DB_PORT' => getenv('DB_PORT') ?: 5432,
    'DB_NAME' => 'postgres',
    'DB_USER' => getenv('DB_USER') ?: 'postgres',
    'DB_PASSWORD' => getenv('DB_PASSWORD') ?: '',
    'DB_SSLMODE' => 'require',
    'CRON_SECRET' => getenv('CRON_SECRET') ?: '',
    'APP_ENV' => 'production',
    'APP_TIMEZONE' => 'America/Sao_Paulo',
];
