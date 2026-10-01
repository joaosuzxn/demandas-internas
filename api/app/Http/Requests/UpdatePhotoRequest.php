<?php

namespace App\Http\Requests;

use App\Rules\Base64Image;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePhotoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        // present + nullable: o campo precisa vir; null remove a foto.
        return [
            'photo' => ['present', 'nullable', 'string', new Base64Image],
        ];
    }
}
