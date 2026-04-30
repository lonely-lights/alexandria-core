<?php

declare(strict_types=1);

namespace Alexandria\Core\Events;

use Alexandria\Core\Models\Notable\Note;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Broadcast when a Note's AI categorization status changes.
 *
 * - Channel: PrivateChannel('user.<userId>') — userId defaults to the note's
 *   own user_id when not explicitly supplied.
 * - Event name: 'note.ai.status'
 * - Payload includes note_id, status, error, and a fresh ai_notes snapshot
 *   (re-read from DB so consumers see the latest routing/status JSON without
 *   a follow-up fetch).
 */
class NoteAiStatusUpdated implements ShouldBroadcast
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public Note $note,
        public string $status,
        public ?string $error = null,
        public ?int $userId = null,
    ) {
        $this->userId = $userId ?? $note->user_id;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.'.$this->userId),
        ];
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'note_id' => $this->note->id,
            'status' => $this->status,
            'error' => $this->error,
            'ai_notes' => $this->note->fresh()->ai_notes,
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'note.ai.status';
    }
}
