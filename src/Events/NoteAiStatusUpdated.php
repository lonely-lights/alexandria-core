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
use RuntimeException;

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
     * @throws RuntimeException when neither $userId nor $note->user_id is set —
     *                          would otherwise broadcast to "user." with no subscribers.
     */
    public function __construct(
        public Note $note,
        public string $status,
        public ?string $error = null,
        public ?int $userId = null,
    ) {
        $this->userId = $userId ?? $note->user_id;

        if ($this->userId === null) {
            throw new RuntimeException(
                'NoteAiStatusUpdated: cannot derive a broadcast channel — '
                .'$userId was not supplied and the note has no user_id.'
            );
        }
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
            // Null-safe: in queued-broadcast contexts the note may have been
            // deleted between dispatch and the worker firing the broadcast.
            // We still emit the event so consumers see the final status; the
            // ai_notes snapshot is just unavailable in that case.
            'ai_notes' => $this->note->fresh()?->ai_notes,
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
