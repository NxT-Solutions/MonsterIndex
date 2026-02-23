<?php

return [
    'name' => env('BRAND_NAME', env('APP_NAME', 'MonsterIndex')),
    'tagline' => env('BRAND_TAGLINE', 'Track the best Monster offers in one place'),
    'hero_kicker' => env('BRAND_HERO_KICKER', 'Live price intelligence'),
    'hero_title' => env('BRAND_HERO_TITLE', 'Find your next Monster deal before it disappears.'),
    'hero_subtitle' => env(
        'BRAND_HERO_SUBTITLE',
        'Search your favorite Monster variants, compare live offers, and spot the strongest pack value in seconds.',
    ),
    'primary_cta_label' => env('BRAND_PRIMARY_CTA_LABEL', 'Browse Deals'),
    'secondary_cta_label' => env('BRAND_SECONDARY_CTA_LABEL', 'View Trending Tracks'),
    'accent_hex' => env('BRAND_ACCENT_HEX', '#9DFF00'),
    'github_url' => env('BRAND_GITHUB_URL'),
];
