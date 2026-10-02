<?php

namespace App\Rules;

use Closure;
use finfo;
use Illuminate\Contracts\Validation\ValidationRule;

class Base64Image implements ValidationRule
{
    public const MAX_BYTES = 512 * 1024;

    private const DATA_URI = '#^data:(image/(?:jpeg|png|webp));base64,(.+)$#s';

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null) {
            return;
        }

        if (! is_string($value) || ! preg_match(self::DATA_URI, $value, $matches)) {
            $fail('validation.base64_image.format')->translate();

            return;
        }

        $bytes = base64_decode($matches[2], true);

        if ($bytes === false || $bytes === '') {
            $fail('validation.base64_image.format')->translate();

            return;
        }

        if (strlen($bytes) > self::MAX_BYTES) {
            $fail('validation.base64_image.size')->translate();

            return;
        }

        // O tipo declarado no prefixo precisa ser o tipo real do conteúdo.
        if ((new finfo(FILEINFO_MIME_TYPE))->buffer($bytes) !== $matches[1]) {
            $fail('validation.base64_image.format')->translate();
        }
    }
}
