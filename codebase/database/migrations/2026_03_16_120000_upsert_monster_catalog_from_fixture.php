<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $catalog = $this->loadCatalog();
        $now = now();

        $rows = collect($catalog)
            ->map(fn (array $monster): array => [
                'name' => $monster['name'],
                'slug' => $monster['slug'],
                'size_label' => $monster['size_label'],
                'active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ])
            ->all();

        DB::table('monsters')->upsert(
            $rows,
            ['slug'],
            ['name', 'size_label', 'active', 'updated_at'],
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('monsters')
            ->whereIn('slug', array_column($this->loadCatalog(), 'slug'))
            ->delete();
    }

    /**
     * @return list<array{name: string, slug: string, size_label: string}>
     */
    private function loadCatalog(): array
    {
        $fixturePath = database_path('fixtures/monster-catalog.json');

        if (! File::exists($fixturePath)) {
            throw new \RuntimeException("Monster catalog fixture not found: {$fixturePath}");
        }

        $catalog = json_decode(File::get($fixturePath), true, 512, JSON_THROW_ON_ERROR);

        if (! is_array($catalog)) {
            throw new \RuntimeException('Monster catalog fixture must decode to an array.');
        }

        foreach ($catalog as $index => $monster) {
            if (! is_array($monster)) {
                throw new \RuntimeException("Monster catalog entry [{$index}] must be an object.");
            }

            foreach (['name', 'slug', 'size_label'] as $requiredKey) {
                if (! isset($monster[$requiredKey]) || ! is_string($monster[$requiredKey]) || trim($monster[$requiredKey]) === '') {
                    throw new \RuntimeException("Monster catalog entry [{$index}] is missing a valid {$requiredKey}.");
                }
            }
        }

        /** @var list<array{name: string, slug: string, size_label: string}> $catalog */
        return $catalog;
    }
};
