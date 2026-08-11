<?php

declare(strict_types=1);

namespace Alexandria\Core\Http\Controllers;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Notable\Note;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController
{
    /**
     * Upper bound on how many recent items the dashboard ships per kind.
     * The user's `Recent` toggle filters + caps client-side; the server
     * just needs to hand over enough to satisfy any combination of
     * `filter ∈ {both, entries, notes}` × `limit ∈ {5..25}` without a
     * round-trip on every flip. 25 of each keeps the prop payload small
     * (~5KB compressed) while comfortably exceeding the 25-item ceiling.
     */
    private const int RECENT_FETCH_CEILING = 25;

    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $projects = Project::query()
            ->where(function ($query) use ($user) {
                $query->where('owner_id', $user->id)
                    ->orWhereHas('users', fn ($q) => $q->where('users.id', $user->id));
            })
            ->withCount(['entries', 'users'])
            ->with('media')
            ->orderBy('name')
            ->get();

        $projectIds = $projects->pluck('id');

        $recentEntries = Entry::query()
            ->whereIn('project_id', $projectIds)
            ->with(['type:id,name,slug,icon', 'project:id,name,slug'])
            ->latest('updated_at')
            ->limit(self::RECENT_FETCH_CEILING)
            ->get(['id', 'name', 'slug', 'summary', 'blueprint_id', 'project_id', 'updated_at']);

        // Notes are user-owned, not project-scoped at the column level —
        // a Note can attach to a project / blueprint / entry through the
        // polymorphic `notable_pivots`, but the canonical authorship is
        // `notes.user_id`. We surface the user's own recent active notes
        // and look up the first project link for routing context where
        // available; orphan notes (no project pivot) still render but
        // route only to the global drawer.
        $recentNotes = Note::query()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->latest('updated_at')
            ->limit(self::RECENT_FETCH_CEILING)
            ->get(['id', 'title', 'text', 'updated_at']);

        // One pivot lookup for all notes at once instead of N+1.
        //
        // Table names are inlined as string literals (rather than the
        // `Note::PIVOT_TABLE` constant) so IDE database tooling can
        // statically resolve the joins. The model still owns the truth
        // — if Note::PIVOT_TABLE ever changes from 'notables', this
        // controller will need a matching update.
        $notableProjects = [];
        if ($recentNotes->isNotEmpty()) {
            $notableProjects = DB::table('notables')
                ->whereIn('note_id', $recentNotes->pluck('id'))
                ->where('notable_type', Project::class)
                ->join('projects', 'projects.id', '=', 'notables.notable_id')
                ->select('notables.note_id', 'projects.name', 'projects.slug')
                ->get()
                ->groupBy('note_id')
                ->map(fn ($rows) => $rows->first())
                ->all();
        }

        $stats = [
            'projects' => $projects->count(),
            'entries' => Entry::whereIn('project_id', $projectIds)->count(),
            'blueprints' => Blueprint::whereIn('project_id', $projectIds)->count(),
        ];

        // Per-project "last activity" — the max(updated_at) across both
        // entries and notes scoped to the project. Notes live in their
        // own table with no direct project_id; they attach via the
        // polymorphic `notable_pivots` (notable_type=Project), so the
        // note lookup joins through there. Two batched group-by queries
        // replace what would otherwise be N+1 per-project lookups.
        // Drop to the query builder rather than `Entry::query()` so the
        // result rows come back as plain `stdClass` instead of partial
        // Entry models. Two wins: `pluck('last_at', ...)` would trip
        // IDE schema inspections (last_at is a selectRaw alias, not a
        // real column), AND `Entry::query()->get()->mapWithKeys(...)`
        // would route `$row->last_at` through Eloquent's __get magic
        // — which the IDE flags as a polymorphic call because it can't
        // tell which accessor chain resolves it. `DB::table()` returns
        // stdClass rows; dynamic property access on stdClass is plain,
        // no magic, no warning.
        $entryActivity = DB::table('entries')
            ->whereIn('project_id', $projectIds)
            ->selectRaw('project_id, MAX(updated_at) as last_at')
            ->groupBy('project_id')
            ->get()
            ->mapWithKeys(fn ($row) => [$row->project_id => $row->last_at]);

        // Inline `'notables'` (= Note::PIVOT_TABLE) so the IDE can
        // resolve the join columns. See the same trade-off note on the
        // recent-notes lookup above.
        $noteActivity = DB::table('notables')
            ->join('notes', 'notes.id', '=', 'notables.note_id')
            ->where('notables.notable_type', Project::class)
            ->whereIn('notables.notable_id', $projectIds)
            ->selectRaw('notables.notable_id as project_id, MAX(notes.updated_at) as last_at')
            ->groupBy('notables.notable_id')
            ->get()
            ->mapWithKeys(fn ($row) => [$row->project_id => $row->last_at]);

        $projectLastActivity = $projectIds->mapWithKeys(function ($projectId) use ($entryActivity, $noteActivity) {
            $candidates = collect([
                $entryActivity->get($projectId),
                $noteActivity->get($projectId),
            ])
                ->filter()
                ->map(fn ($raw) => Carbon::parse((string) $raw));

            return [$projectId => $candidates->max()];
        });

        // Greeting time is computed client-side (browser local hour) for accuracy.
        // See Dashboard.tsx — we only pass the user's display name here.
        $greeting = [
            'name' => $user->display_name ?? $user->name,
        ];

        return Inertia::render('Dashboard', [
            'projects' => $projects->map(function (Project $project) use ($projectLastActivity) {
                $blueprintCount = Blueprint::where('project_id', $project->id)->count();
                /** @var Carbon|null $lastAt */
                $lastAt = $projectLastActivity->get($project->id);

                return [
                    'id' => $project->id,
                    'name' => $project->name,
                    'slug' => $project->slug,
                    'logline' => $project->logline,
                    'entries_count' => $project->entries_count,
                    'blueprints_count' => $blueprintCount,
                    'members_count' => max($project->users_count, 1),
                    'page_image_url' => $project->page_image_url,
                    'banner_url' => $project->banner_desktop_url,
                    'last_activity' => $lastAt?->diffForHumans(),
                    'last_activity_timestamp' => $lastAt?->timestamp,
                ];
            }),
            'recentEntries' => $recentEntries->map(fn (Entry $entry) => [
                'id' => $entry->id,
                'name' => $entry->name,
                'slug' => $entry->slug,
                'summary' => $entry->summary,
                'blueprint_name' => $entry->type?->name,
                // The URL segment is the blueprint's own slug — lowercasing
                // the display name is not equivalent once a blueprint is
                // multi-word or carries a hand-edited slug.
                'blueprint_slug' => $entry->type?->slug,
                'blueprint_icon' => $entry->type?->icon,
                'project_name' => $entry->project?->name,
                'project_slug' => $entry->project?->slug,
                'updated_at' => $entry->updated_at?->diffForHumans(),
                // Unix timestamp so the frontend can interleave entries +
                // notes by recency when the user picks the "Both" filter.
                'updated_at_ts' => $entry->updated_at?->timestamp,
            ]),
            'recentNotes' => $recentNotes->map(function (Note $note) use ($notableProjects) {
                $project = $notableProjects[$note->id] ?? null;
                // Short preview from the body — strip extra whitespace
                // and truncate so the row doesn't blow up vertically.
                $preview = $note->text
                    ? trim(preg_replace('/\s+/', ' ', strip_tags($note->text)) ?? '')
                    : null;
                if ($preview !== null && mb_strlen($preview) > 140) {
                    $preview = mb_substr($preview, 0, 137).'…';
                }

                return [
                    'id' => $note->id,
                    'title' => $note->title,
                    'preview' => $preview,
                    'project_name' => $project?->name,
                    'project_slug' => $project?->slug,
                    'updated_at' => $note->updated_at?->diffForHumans(),
                    'updated_at_ts' => $note->updated_at?->timestamp,
                ];
            }),
            'stats' => $stats,
            'greeting' => $greeting,
        ]);
    }
}
