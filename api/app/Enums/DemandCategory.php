<?php

namespace App\Enums;

// As cinco categorias fixas de solicitação. O rótulo em português é da tela.
enum DemandCategory: string
{
    case It = 'it';
    case Hr = 'hr';
    case Purchasing = 'purchasing';
    case Finance = 'finance';
    case Infrastructure = 'infrastructure';
}
