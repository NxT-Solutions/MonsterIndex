<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('analytics_page_views', function (Blueprint $table) {
            $table->id();
            $table->string('visitor_id', 64)->index();
            $table->string('browser_session_id', 64)->index();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('route_name')->nullable()->index();
            $table->string('page_component')->nullable()->index();
            $table->string('page_kind', 32)->nullable()->index();
            $table->string('path', 255)->index();
            $table->text('url');
            $table->string('title')->nullable();
            $table->string('referrer_host')->nullable()->index();
            $table->text('referrer_url')->nullable();
            $table->string('channel', 32)->nullable()->index();
            $table->string('utm_source')->nullable()->index();
            $table->string('utm_medium')->nullable()->index();
            $table->string('utm_campaign')->nullable()->index();
            $table->string('device_type', 32)->nullable()->index();
            $table->string('browser_family', 64)->nullable()->index();
            $table->string('os_family', 64)->nullable()->index();
            $table->string('locale', 16)->nullable();
            $table->boolean('is_authenticated')->default(false)->index();
            $table->unsignedSmallInteger('viewport_width')->nullable();
            $table->unsignedSmallInteger('viewport_height')->nullable();
            $table->unsignedSmallInteger('max_scroll_depth')->default(0);
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->timestamp('viewed_at')->index();
            $table->timestamp('engaged_at')->nullable()->index();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            $table->index(['viewed_at', 'page_kind']);
            $table->index(['viewed_at', 'channel']);
            $table->index(['viewed_at', 'device_type']);
        });

        Schema::create('analytics_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('analytics_page_view_id')
                ->nullable()
                ->constrained('analytics_page_views')
                ->nullOnDelete();
            $table->string('visitor_id', 64)->index();
            $table->string('browser_session_id', 64)->index();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('event_name', 64)->index();
            $table->string('route_name')->nullable()->index();
            $table->string('page_kind', 32)->nullable()->index();
            $table->string('path', 255)->nullable()->index();
            $table->string('label')->nullable();
            $table->string('target_host')->nullable()->index();
            $table->text('target_url')->nullable();
            $table->unsignedSmallInteger('scroll_depth')->nullable();
            $table->json('properties')->nullable();
            $table->timestamp('occurred_at')->index();
            $table->timestamps();

            $table->index(['event_name', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analytics_events');
        Schema::dropIfExists('analytics_page_views');
    }
};
