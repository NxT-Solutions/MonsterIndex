<?php

it('ships standalone install metadata and app shortcuts', function () {
    $manifest = json_decode(
        file_get_contents(public_path('site.webmanifest')),
        true,
        512,
        JSON_THROW_ON_ERROR,
    );

    expect($manifest['id'])->toBe('/')
        ->and($manifest['start_url'])->toBe('/')
        ->and($manifest['scope'])->toBe('/')
        ->and($manifest['display'])->toBe('standalone')
        ->and($manifest['orientation'])->toBe('portrait-primary')
        ->and($manifest['shortcuts'])->toHaveCount(2)
        ->and(collect($manifest['shortcuts'])->pluck('url')->all())
        ->toContain('/#live-offers', '/dashboard');
});
