<?php

namespace Tests\Unit\Rules;

use App\Rules\Cpf;
use Illuminate\Support\Facades\Validator;
use Tests\Support\FictitiousCpf;
use Tests\TestCase;

class CpfTest extends TestCase
{
    private function passes(mixed $value): bool
    {
        return Validator::make(['cpf' => $value], ['cpf' => [new Cpf]])->passes();
    }

    public function test_accepts_valid_cpf_with_and_without_mask(): void
    {
        foreach ([FictitiousCpf::DEFAULT, FictitiousCpf::DEFAULT_MASKED, FictitiousCpf::SECOND, '111.222.333-96'] as $cpf) {
            $this->assertTrue($this->passes($cpf), $cpf);
        }
    }

    public function test_rejects_wrong_check_digit(): void
    {
        foreach ([FictitiousCpf::INVALID_CHECK_DIGIT, '123.456.789-00', '98765432101'] as $cpf) {
            $this->assertFalse($this->passes($cpf), $cpf);
        }
    }

    public function test_rejects_repeated_sequences(): void
    {
        foreach (range(0, 9) as $digit) {
            $this->assertFalse($this->passes(str_repeat((string) $digit, 11)), (string) $digit);
        }
    }

    public function test_rejects_wrong_length(): void
    {
        $this->assertFalse($this->passes('1234567890'));
        $this->assertFalse($this->passes('123456789091'));
    }

    public function test_rejects_letters_and_other_formats(): void
    {
        foreach (['12345678909abc', 'a12345678909', '123.456.789/09', '123 456 789 09', 'abc'] as $cpf) {
            $this->assertFalse($this->passes($cpf), $cpf);
        }

        // Valor vazio o validador nem passa à regra (quem barra é o required); a regra em si recusa.
        $this->assertFalse(Cpf::isValid(''));
    }

    public function test_rejects_non_string(): void
    {
        $this->assertFalse($this->passes(12345678909));
    }

    public function test_error_message_is_in_portuguese(): void
    {
        $validator = Validator::make(['cpf' => '123'], ['cpf' => [new Cpf]]);

        $this->assertSame('O CPF informado é inválido.', $validator->errors()->first('cpf'));
    }

    public function test_builds_check_digits_and_normalizes(): void
    {
        $this->assertSame(FictitiousCpf::DEFAULT, Cpf::withCheckDigits('123456789'));
        $this->assertSame(FictitiousCpf::SECOND, Cpf::withCheckDigits('987654321'));
        $this->assertSame(FictitiousCpf::DEFAULT, Cpf::normalize(FictitiousCpf::DEFAULT_MASKED));
    }
}
