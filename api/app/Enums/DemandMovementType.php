<?php

namespace App\Enums;

// O que aconteceu com a solicitação (item 0026). Os rótulos ficam na SPA, como os de DemandStatus.
enum DemandMovementType: string
{
    case Created = 'created';
    case Edited = 'edited';
    case Started = 'started';
    case Finished = 'finished';
    case Reopened = 'reopened';
}
