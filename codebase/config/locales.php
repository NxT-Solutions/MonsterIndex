<?php

return [
    'cookie_name' => env('APP_LOCALE_COOKIE', 'monsterindex_locale'),
    'fallback' => 'en',
    'supported' => [
        'en' => [
            'name' => 'English',
            'native_name' => 'English',
            'dir' => 'ltr',
            'bcp47' => 'en-US',
        ],
        'nl' => [
            'name' => 'Dutch',
            'native_name' => 'Nederlands',
            'dir' => 'ltr',
            'bcp47' => 'nl-BE',
        ],
        'fr' => [
            'name' => 'French',
            'native_name' => 'Français',
            'dir' => 'ltr',
            'bcp47' => 'fr-FR',
        ],
        'es' => [
            'name' => 'Spanish',
            'native_name' => 'Español',
            'dir' => 'ltr',
            'bcp47' => 'es-ES',
        ],
        'de' => [
            'name' => 'German',
            'native_name' => 'Deutsch',
            'dir' => 'ltr',
            'bcp47' => 'de-DE',
        ],
    ],
];
