<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\System;

use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\System\EntryHistory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EntryHistory>
 */
class EntryHistoryFactory extends Factory
{
    protected $model = EntryHistory::class;

    public function definition(): array
    {
        return [
            'entry_id' => Entry::factory(),
            'user_id' => null,
            'change_type' => 'field_update',
            'field_name' => 'name',
            'previous_value' => 'old name',
            'new_value' => 'new name',
            'change_summary' => 'Updated Name',
            'context' => ['blueprint' => 'Test', 'entry_name' => 'Test Entry'],
        ];
    }
}
