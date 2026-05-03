<?php

declare(strict_types=1);

namespace Alexandria\Core\Http\Controllers;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController
{
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

        $recentEntries = Entry::query()
            ->whereIn('project_id', $projects->pluck('id'))
            ->with(['type:id,name,icon', 'project:id,name,slug'])
            ->latest('updated_at')
            ->limit(10)
            ->get(['id', 'name', 'slug', 'summary', 'blueprint_id', 'project_id', 'updated_at']);

        $stats = [
            'projects' => $projects->count(),
            'entries' => Entry::whereIn('project_id', $projects->pluck('id'))->count(),
            'blueprints' => Blueprint::whereIn('project_id', $projects->pluck('id'))->count(),
        ];

        // Greeting time is computed client-side (browser local hour) for accuracy.
        // See Dashboard.tsx — we only pass the user's display name here.
        $greeting = [
            'name' => $user->display_name ?? $user->name,
        ];

        return Inertia::render('Dashboard', [
            'projects' => $projects->map(function (Project $project) {
                $blueprintCount = Blueprint::where('project_id', $project->id)->count();
                $lastEntry = Entry::where('project_id', $project->id)
                    ->latest('updated_at')
                    ->first(['updated_at']);

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
                    'last_activity' => $lastEntry?->updated_at?->diffForHumans(),
                    'last_activity_timestamp' => $lastEntry?->updated_at?->timestamp,
                ];
            }),
            'recentEntries' => $recentEntries->map(fn (Entry $entry) => [
                'id' => $entry->id,
                'name' => $entry->name,
                'slug' => $entry->slug,
                'summary' => $entry->summary,
                'blueprint_name' => $entry->type?->name,
                'blueprint_icon' => $entry->type?->icon,
                'project_name' => $entry->project?->name,
                'project_slug' => $entry->project?->slug,
                'updated_at' => $entry->updated_at?->diffForHumans(),
            ]),
            'stats' => $stats,
            'greeting' => $greeting,
        ]);
    }
}
