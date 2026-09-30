<?php

namespace Tests\Support;

// Imagens mínimas em bytes: o container não tem GD, e o finfo reconhece o tipo pelos primeiros bytes.
final class ImageFixtures
{
    public static function png(): string
    {
        return base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
    }

    public static function jpeg(): string
    {
        return "\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xFF\xD9";
    }

    public static function webp(): string
    {
        return 'RIFF'.pack('V', 26).'WEBPVP8L'.pack('V', 14)."\x2f\x00\x00\x00\x00\x07\x10\x11\x11\x88\x88\xfe\x07\x00";
    }

    public static function gif(): string
    {
        return "GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;";
    }

    // Completa com bytes nulos até o tamanho pedido; o tipo detectado continua o mesmo.
    public static function padTo(string $bytes, int $size): string
    {
        return $bytes.str_repeat("\0", $size - strlen($bytes));
    }

    public static function dataUri(string $mime, string $bytes): string
    {
        return "data:{$mime};base64,".base64_encode($bytes);
    }
}
