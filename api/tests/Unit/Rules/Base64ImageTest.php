<?php

namespace Tests\Unit\Rules;

use App\Rules\Base64Image;
use Illuminate\Support\Facades\Validator;
use Tests\Support\ImageFixtures;
use Tests\TestCase;

class Base64ImageTest extends TestCase
{
    private function validator(mixed $value): \Illuminate\Validation\Validator
    {
        return Validator::make(['photo' => $value], ['photo' => ['nullable', new Base64Image]]);
    }

    public function test_accepts_jpeg_png_and_webp(): void
    {
        $images = [
            'image/png' => ImageFixtures::png(),
            'image/jpeg' => ImageFixtures::jpeg(),
            'image/webp' => ImageFixtures::webp(),
        ];

        foreach ($images as $mime => $bytes) {
            $this->assertTrue($this->validator(ImageFixtures::dataUri($mime, $bytes))->passes(), $mime);
        }
    }

    public function test_accepts_null(): void
    {
        $this->assertTrue($this->validator(null)->passes());
    }

    public function test_rejects_gif(): void
    {
        $this->assertFalse($this->validator(ImageFixtures::dataUri('image/gif', ImageFixtures::gif()))->passes());
    }

    public function test_rejects_missing_data_uri_prefix(): void
    {
        $this->assertFalse($this->validator(base64_encode(ImageFixtures::png()))->passes());
    }

    public function test_rejects_corrupted_base64(): void
    {
        $this->assertFalse($this->validator('data:image/png;base64,@@@not-base64@@@')->passes());
    }

    public function test_rejects_text_declared_as_png(): void
    {
        $this->assertFalse($this->validator(ImageFixtures::dataUri('image/png', 'just some text'))->passes());
    }

    public function test_rejects_png_declared_as_jpeg(): void
    {
        $this->assertFalse($this->validator(ImageFixtures::dataUri('image/jpeg', ImageFixtures::png()))->passes());
    }

    public function test_accepts_exactly_the_size_limit(): void
    {
        $bytes = ImageFixtures::padTo(ImageFixtures::png(), Base64Image::MAX_BYTES);

        $this->assertTrue($this->validator(ImageFixtures::dataUri('image/png', $bytes))->passes());
    }

    public function test_rejects_one_byte_over_the_size_limit_with_portuguese_message(): void
    {
        $bytes = ImageFixtures::padTo(ImageFixtures::png(), Base64Image::MAX_BYTES + 1);
        $validator = $this->validator(ImageFixtures::dataUri('image/png', $bytes));

        $this->assertTrue($validator->fails());
        $this->assertSame('A foto não pode ter mais de 512 KB.', $validator->errors()->first('photo'));
    }

    public function test_format_message_is_in_portuguese(): void
    {
        $this->assertSame(
            'A foto deve ser uma imagem JPEG, PNG ou WebP em base64.',
            $this->validator('not-an-image')->errors()->first('photo'),
        );
    }
}
