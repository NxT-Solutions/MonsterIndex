<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        @php
            $seoTitle = __('MonsterIndex - Compare Monster Energy Deals');
            $seoDescription = __('Compare live Monster Energy prices across stores, track best offers, and find the strongest per-can value with public snapshots.');
            $baseUrl = rtrim(config('app.url', 'https://monsterindex.app'), '/');
            $siteUrl = $baseUrl !== '' ? $baseUrl.'/' : '/';
            $canonical = request()->url();
            $ogImage = $baseUrl !== '' ? $baseUrl.'/brand/monsterindex-og.png' : '/brand/monsterindex-og.png';
            $vite = app(\Illuminate\Foundation\Vite::class);
            $shouldRenderViteAssets = ! app()->runningUnitTests();
            $criticalFontPreloads = [
                'node_modules/@fontsource/oxanium/files/oxanium-latin-600-normal.woff2',
                'node_modules/@fontsource/oxanium/files/oxanium-latin-700-normal.woff2',
                'node_modules/@fontsource/rajdhani/files/rajdhani-latin-400-normal.woff2',
                'node_modules/@fontsource/rajdhani/files/rajdhani-latin-500-normal.woff2',
                'node_modules/@fontsource/rajdhani/files/rajdhani-latin-600-normal.woff2',
            ];
            $websiteSchema = [
                '@context' => 'https://schema.org',
                '@type' => 'WebSite',
                'name' => 'MonsterIndex',
                'url' => $siteUrl,
                'description' => $seoDescription,
                'potentialAction' => [
                    '@type' => 'SearchAction',
                    'target' => $siteUrl.'?q={search_term_string}',
                    'query-input' => 'required name=search_term_string',
                ],
            ];
        @endphp

        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="description" content="{{ $seoDescription }}">
        <meta name="keywords" content="{{ __('Monster Energy, price tracker, energy drink deals, compare prices, per can price, Monster offers') }}">
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1">
        <meta name="author" content="MonsterIndex">
        <meta name="theme-color" content="#8CEB00">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
        <meta name="apple-mobile-web-app-title" content="MonsterIndex">

        <title inertia>{{ config('app.name', 'MonsterIndex') }}</title>

        <link rel="manifest" href="/site.webmanifest">
        <link rel="icon" type="image/svg+xml" href="/favicon.svg">
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
        <link rel="canonical" href="{{ $canonical }}">
        @if ($shouldRenderViteAssets)
            @foreach ($criticalFontPreloads as $fontAsset)
                <link rel="preload" href="{{ $vite->asset($fontAsset) }}" as="font" type="font/woff2" crossorigin>
            @endforeach
        @endif

        <meta property="og:type" content="website">
        <meta property="og:site_name" content="MonsterIndex">
        <meta property="og:title" content="{{ $seoTitle }}">
        <meta property="og:description" content="{{ $seoDescription }}">
        <meta property="og:url" content="{{ $canonical }}">
        <meta property="og:image" content="{{ $ogImage }}">
        <meta property="og:image:width" content="1200">
        <meta property="og:image:height" content="630">

        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="{{ $seoTitle }}">
        <meta name="twitter:description" content="{{ $seoDescription }}">
        <meta name="twitter:image" content="{{ $ogImage }}">

        <script>
            (function () {
                try {
                    var key = 'monsterindex_theme';
                    var stored = window.localStorage.getItem(key);
                    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    var theme = stored === 'light' || stored === 'dark'
                        ? stored
                        : (prefersDark ? 'dark' : 'light');

                    document.documentElement.classList.toggle('dark', theme === 'dark');
                    document.documentElement.style.colorScheme = theme;
                } catch (error) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                }
            })();
        </script>

        <script type="application/ld+json">
            {!! json_encode($websiteSchema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) !!}
        </script>

        <!-- Scripts -->
        @routes
        @if ($shouldRenderViteAssets)
            @viteReactRefresh
            @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @endif
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
