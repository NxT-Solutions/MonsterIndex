<?php

namespace App\Policies;

use App\Models\MonsterSuggestion;
use App\Models\User;

class MonsterSuggestionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('monster-suggestion.submit') || $user->can('monster-suggestion.review');
    }

    public function view(User $user, MonsterSuggestion $suggestion): bool
    {
        if ($user->can('monster-suggestion.review')) {
            return true;
        }

        return $user->can('monster-suggestion.view.own')
            && (int) $suggestion->user_id === (int) $user->id;
    }

    public function create(User $user): bool
    {
        return $user->can('monster-suggestion.submit');
    }

    public function review(User $user): bool
    {
        return $user->can('monster-suggestion.review');
    }
}
