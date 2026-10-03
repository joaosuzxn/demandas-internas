<?php

namespace App\Enums;

// Toda demanda nasce pendente; só start, close e reopen mudam o status (DemandService).
enum DemandStatus: string
{
    case Pending = 'pending';
    case InProgress = 'in_progress';
    case Finished = 'finished';
}
