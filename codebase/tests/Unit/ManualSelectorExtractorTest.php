<?php

use Packages\PriceExtraction\Services\ManualSelectorExtractor;
use Packages\PriceExtraction\Services\MoneyParser;
use Packages\PriceExtraction\Services\SelectorTextExtractor;

it('extracts split price parts into a valid amount', function () {
    $extractor = new ManualSelectorExtractor(
        new SelectorTextExtractor,
        new MoneyParser,
    );

    $html = <<<'HTML'
<html>
  <body>
    <span class="whole">$32</span>
    <span class="fraction">99</span>
  </body>
</html>
HTML;

    $result = $extractor->extract($html, [
        'price' => [
            'parts' => [
                ['css' => '.whole', 'sample_text' => '$32'],
                ['css' => '.fraction', 'sample_text' => '99'],
            ],
        ],
    ]);

    expect($result->status)->toBe('ok')
        ->and($result->priceCents)->toBe(3299)
        ->and($result->effectiveTotalCents)->toBe(3299)
        ->and($result->currency)->toBe('USD');
});

it('extracts can count and computes price per can when quantity selector is provided', function () {
    $extractor = new ManualSelectorExtractor(
        new SelectorTextExtractor,
        new MoneyParser,
    );

    $html = <<<'HTML'
<html>
  <body>
    <span class="whole">$32</span>
    <span class="fraction">99</span>
    <span class="pack">12 pack</span>
  </body>
</html>
HTML;

    $result = $extractor->extract($html, [
        'price' => [
            'parts' => [
                ['css' => '.whole', 'sample_text' => '$32'],
                ['css' => '.fraction', 'sample_text' => '99'],
            ],
        ],
        'quantity' => [
            'css' => '.pack',
            'sample_text' => '12 pack',
        ],
    ]);

    expect($result->status)->toBe('ok')
        ->and($result->priceCents)->toBe(3299)
        ->and($result->canCount)->toBe(12)
        ->and($result->pricePerCanCents)->toBe(275);
});

it('uses manual shipping and manual can count when selector text is not parseable', function () {
    $extractor = new ManualSelectorExtractor(
        new SelectorTextExtractor,
        new MoneyParser,
    );

    $html = <<<'HTML'
<html>
  <body>
    <span class="price">$24.00</span>
    <div class="shipping-note">Shipping shown after checkout</div>
    <div class="pack-label">Case size</div>
  </body>
</html>
HTML;

    $result = $extractor->extract($html, [
        'price' => [
            'css' => '.price',
            'sample_text' => '$24.00',
        ],
        'shipping' => [
            'css' => '.shipping-note',
            'sample_text' => 'Shipping shown after checkout',
            'manual_value' => '4.50',
        ],
        'quantity' => [
            'css' => '.pack-label',
            'sample_text' => 'Case size',
            'manual_value' => '12',
        ],
    ]);

    expect($result->status)->toBe('ok')
        ->and($result->shippingCents)->toBe(450)
        ->and($result->effectiveTotalCents)->toBe(2850)
        ->and($result->canCount)->toBe(12)
        ->and($result->pricePerCanCents)->toBe(238);
});
