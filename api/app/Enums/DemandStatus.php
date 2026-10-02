<?php

namespace App\Enums;

// Toda solicitação nasce aberta; só close e reopen mudam o status (DemandService).
enum DemandStatus: string
{
    case Open = 'open';
    case Closed = 'closed';
}
