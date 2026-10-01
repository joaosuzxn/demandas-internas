<?php

namespace App\Enums;

// Os dois perfis fixos do projeto (spec de autenticação §2).
enum Role: string
{
    case Admin = 'admin';
    case Employee = 'employee';
}
