<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class Cpf implements ValidationRule
{
    // Com máscara (123.456.789-09) ou só dígitos (12345678909); qualquer outro formato é recusado.
    private const FORMAT = '/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/';

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! self::isValid($value)) {
            $fail('validation.cpf')->translate();
        }
    }

    public static function isValid(string $value): bool
    {
        if (! preg_match(self::FORMAT, $value)) {
            return false;
        }

        $digits = self::normalize($value);

        // Sequências repetidas passam no cálculo do dígito, mas não são CPFs válidos.
        if (preg_match('/^(\d)\1{10}$/', $digits)) {
            return false;
        }

        return self::withCheckDigits(substr($digits, 0, 9)) === $digits;
    }

    public static function normalize(string $value): string
    {
        return preg_replace('/\D/', '', $value) ?? '';
    }

    // Recebe os 9 primeiros dígitos e devolve os 11, com os dois dígitos verificadores calculados.
    public static function withCheckDigits(string $nineDigits): string
    {
        $digits = $nineDigits;

        foreach ([10, 11] as $weight) {
            $sum = 0;

            for ($i = 0; $i < $weight - 1; $i++) {
                $sum += (int) $digits[$i] * ($weight - $i);
            }

            $digits .= (string) ((($sum * 10) % 11) % 10);
        }

        return $digits;
    }
}
