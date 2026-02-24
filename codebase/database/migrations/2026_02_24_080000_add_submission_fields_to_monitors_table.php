<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('monitors', function (Blueprint $table) {
            $table->string('submission_status', 32)->default('approved')->after('active');
            $table->string('validation_status', 32)->default('success')->after('submission_status');
            $table->timestamp('validation_checked_at')->nullable()->after('validation_status');
            $table->json('validation_result')->nullable()->after('validation_checked_at');
            $table->string('canonical_product_url', 2048)->nullable()->after('product_url');

            $table->foreignId('created_by_user_id')
                ->nullable()
                ->after('monster_id')
                ->constrained('users')
                ->nullOnDelete();
            $table->foreignId('approved_by_user_id')
                ->nullable()
                ->after('created_by_user_id')
                ->constrained('users')
                ->nullOnDelete();
            $table->foreignId('rejected_by_user_id')
                ->nullable()
                ->after('approved_by_user_id')
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('approved_at')->nullable()->after('approved_by_user_id');
            $table->timestamp('rejected_at')->nullable()->after('rejected_by_user_id');
            $table->text('review_note')->nullable()->after('rejected_at');

            $table->index(['submission_status', 'active'], 'monitors_submission_status_active_index');
            $table->index(['created_by_user_id', 'submission_status'], 'monitors_owner_status_index');
            $table->index(['canonical_product_url'], 'monitors_canonical_url_index');
            $table->index(
                ['monster_id', 'currency', 'canonical_product_url'],
                'monitors_duplicate_lookup_index',
            );
        });

        DB::table('monitors')->update([
            'submission_status' => 'approved',
            'validation_status' => 'success',
            'canonical_product_url' => DB::raw('COALESCE(canonical_product_url, product_url)'),
            'approved_at' => DB::raw('COALESCE(approved_at, created_at)'),
            'validation_checked_at' => DB::raw('COALESCE(validation_checked_at, created_at)'),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('monitors', function (Blueprint $table) {
            $table->dropIndex('monitors_submission_status_active_index');
            $table->dropIndex('monitors_owner_status_index');
            $table->dropIndex('monitors_canonical_url_index');
            $table->dropIndex('monitors_duplicate_lookup_index');

            $table->dropForeign(['created_by_user_id']);
            $table->dropForeign(['approved_by_user_id']);
            $table->dropForeign(['rejected_by_user_id']);

            $table->dropColumn([
                'submission_status',
                'validation_status',
                'validation_checked_at',
                'validation_result',
                'canonical_product_url',
                'created_by_user_id',
                'approved_by_user_id',
                'rejected_by_user_id',
                'approved_at',
                'rejected_at',
                'review_note',
            ]);
        });
    }
};
