@php
    $lang = request()->query('lang') === 'nl' ? 'nl' : 'en';
    $title = $lang === 'nl'
        ? 'MonsterIndex Selector Resultaat'
        : 'MonsterIndex Selector Capture';
    $successHeading = $lang === 'nl'
        ? 'Selector Opslag Gelukt'
        : 'Selector Capture Success';
    $errorHeading = $lang === 'nl'
        ? 'Selector Opslag Fout'
        : 'Selector Capture Error';
@endphp
<!DOCTYPE html>
<html lang="{{ $lang }}">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{{ $title }}</title>
        <style>
            body {
                margin: 0;
                min-height: 100vh;
                display: grid;
                place-items: center;
                font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
                background: #f1f5f9;
                color: #0f172a;
            }
            .card {
                max-width: 560px;
                width: calc(100% - 2rem);
                padding: 1.25rem;
                border-radius: 0.75rem;
                border: 1px solid #e2e8f0;
                background: #fff;
            }
            .ok { color: #047857; }
            .error { color: #b91c1c; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1 class="{{ $ok ? 'ok' : 'error' }}">
                {{ $ok ? $successHeading : $errorHeading }}
            </h1>
            <p>{{ $message }}</p>
        </div>
    </body>
</html>
