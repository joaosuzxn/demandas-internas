<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Throwable;

class HealthCheck
{
    public function database(): bool
    {
        try {
            DB::connection()->select('select 1');

            return true;
        } catch (Throwable) {
            return false;
        }
    }
}
