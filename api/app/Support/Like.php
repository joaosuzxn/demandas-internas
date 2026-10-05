<?php

namespace App\Support;

// Padrão de LIKE/ILIKE para "contém o termo": %, _ e \ do termo valem como texto, não como curinga.
final class Like
{
    public static function contains(string $term): string
    {
        return '%'.addcslashes($term, '%_\\').'%';
    }
}
