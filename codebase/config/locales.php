<?php

return [
    'cookie_name' => env('APP_LOCALE_COOKIE', 'monsterindex_locale'),
    'fallback' => 'en',
    'supported' => [
        'en' => [
            'name' => 'English',
            'native_name' => 'English',
            'dir' => 'ltr',
        ],
        'nl' => [
            'name' => 'Dutch',
            'native_name' => 'Nederlands',
            'dir' => 'ltr',
        ],
    ],
];
