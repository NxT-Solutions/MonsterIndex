<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

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

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
