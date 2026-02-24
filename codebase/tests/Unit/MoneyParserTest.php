<?php

use Packages\PriceExtraction\Services\MoneyParser;

it('parses common price formats into cents', function (string $input, int $expected) {
    $parser = app(MoneyParser::class);

    $result = $parser->parse($input, 'USD');

    expect($result['cents'])->toBe($expected);
})->with([
    ['$19.99', 1999],
    ['19,99', 1999],
    ['€ 1,73*', 173],
    ['USD 20', 2000],
    ['1,299.50', 129950],
]);

it('returns null cents for invalid input', function () {
    $parser = app(MoneyParser::class);

    $result = $parser->parse('not-a-price', 'USD');

    expect($result['cents'])->toBeNull();
});
