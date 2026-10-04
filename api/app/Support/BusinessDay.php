<?php

namespace App\Support;

use Illuminate\Support\Carbon;

// Dias inteiros no fuso do negócio (config app.business_timezone). Quem usa converte para UTC (o fuso em que o
// banco grava) depois de somar dias: somar antes, em UTC, erraria o fim do dia num fuso com horário de verão.
final class BusinessDay
{
    /** A meia-noite do dia `Y-m-d` no fuso do negócio. */
    public static function start(string $day): Carbon
    {
        return Carbon::createFromFormat('Y-m-d', $day, config('app.business_timezone'))->startOfDay();
    }

    /** A meia-noite de hoje no fuso do negócio. */
    public static function today(): Carbon
    {
        return Carbon::now(config('app.business_timezone'))->startOfDay();
    }
}
