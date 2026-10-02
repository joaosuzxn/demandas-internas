<?php

namespace Tests\Support;

// CPFs fictícios, montados a partir de sequências óbvias. Nunca usar CPF real nos testes.
final class FictitiousCpf
{
    public const DEFAULT = '12345678909';

    public const DEFAULT_MASKED = '123.456.789-09';

    public const SECOND = '98765432100';

    public const SECOND_MASKED = '987.654.321-00';

    public const THIRD = '11122233396';

    public const FOURTH = '12312312387';

    public const INVALID_CHECK_DIGIT = '12345678900';

    public const REPEATED = '11111111111';
}
