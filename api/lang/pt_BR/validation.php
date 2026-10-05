<?php

// Só as chaves que esta API usa; o que faltar cai no inglês do framework (APP_FALLBACK_LOCALE=en).
return [
    'after_or_equal' => 'O campo :attribute deve ser uma data igual ou posterior a :date.',
    'date_format' => 'O campo :attribute deve ser uma data no formato AAAA-MM-DD.',
    'boolean' => 'O campo :attribute deve ser verdadeiro ou falso.',
    'confirmed' => 'A confirmação do campo :attribute não confere.',
    'current_password' => 'A senha atual está incorreta.',
    'email' => 'O campo :attribute deve ser um e-mail válido.',
    'enum' => 'O :attribute selecionado é inválido.',
    'integer' => 'O campo :attribute deve ser um número inteiro.',
    'max' => [
        'string' => 'O campo :attribute não pode ter mais de :max caracteres.',
    ],
    'min' => [
        'numeric' => 'O campo :attribute deve ser no mínimo :min.',
        'string' => 'O campo :attribute deve ter pelo menos :min caracteres.',
    ],
    'not_in' => 'O :attribute selecionado é inválido.',
    'password' => [
        'letters' => 'O campo :attribute deve conter pelo menos uma letra.',
        'mixed' => 'O campo :attribute deve conter pelo menos uma letra maiúscula e uma minúscula.',
        'numbers' => 'O campo :attribute deve conter pelo menos um número.',
        'symbols' => 'O campo :attribute deve conter pelo menos um símbolo.',
    ],
    'prohibited' => 'O campo :attribute não é permitido.',
    'required' => 'O campo :attribute é obrigatório.',
    'string' => 'O campo :attribute deve ser um texto.',
    'unique' => 'Este :attribute já está em uso.',

    // Regras próprias (app/Rules).
    'cpf' => 'O :attribute informado é inválido.',

    'regex' => 'O formato do campo :attribute é inválido.',

    'custom' => [
        'password' => [
            'not_in' => 'A nova senha não pode ser igual à senha padrão.',
        ],
        'username' => [
            'regex' => 'O usuário deve ter de 3 a 30 caracteres: letras minúsculas sem acento, números, ponto, hífen ou sublinhado.',
        ],
    ],

    'attributes' => [
        'category' => 'categoria',
        'created_from' => 'de',
        'created_to' => 'até',
        'cpf' => 'CPF',
        'current_password' => 'senha atual',
        'description' => 'descrição',
        'email' => 'e-mail',
        'is_active' => 'situação',
        'login' => 'usuário ou e-mail',
        'name' => 'nome',
        'page' => 'página',
        'password' => 'senha',
        'remember' => 'lembrar-me',
        'requester_id' => 'solicitante',
        'role' => 'perfil',
        'search' => 'busca',
        'status' => 'status',
        'title' => 'título',
        'username' => 'usuário',
    ],
];
