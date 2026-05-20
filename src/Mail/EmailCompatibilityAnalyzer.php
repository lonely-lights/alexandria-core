<?php

declare(strict_types=1);

namespace Alexandria\Core\Mail;

/**
 * Caniemail-style static analysis of rendered email HTML.
 *
 * Scans the rendered HTML for CSS properties + HTML features that
 * have known compatibility gaps in major email clients, and returns
 * a list of issues with severity + affected clients. Lighter weight
 * than Litmus / Email on Acid (no real rendering, no API costs), and
 * sufficient to catch the common "this is broken in Outlook" cases
 * during admin authoring.
 *
 * The compatibility data is a curated subset of caniemail.com signals
 * focused on the surface our branded layout actually uses. Updating
 * the data file is a manual chore — not auto-synced — by design, so
 * we control what shows up in the admin UI.
 */
class EmailCompatibilityAnalyzer
{
    /**
     * Each rule: regex that matches the feature in HTML/CSS, severity
     * label, human-readable description, and list of impacted clients.
     * Severity values: 'info', 'warning', 'critical'.
     *
     * @var list<array{regex: string, feature: string, severity: string, description: string, clients: list<string>}>
     */
    private const RULES = [
        [
            'regex' => '/border-radius\s*:/',
            'feature' => 'border-radius',
            'severity' => 'warning',
            'description' => 'Rounded corners drop to square in Outlook 2007-2019 on Windows. Buttons + cards render as rectangles for affected users.',
            'clients' => ['Outlook 2007', 'Outlook 2010', 'Outlook 2013', 'Outlook 2016', 'Outlook 2019'],
        ],
        [
            'regex' => '/background-image\s*:|<img[^>]+background/i',
            'feature' => 'background-image',
            'severity' => 'warning',
            'description' => 'Background images need VML fallback for Outlook on Windows. Without VML, the background is missing entirely (foreground content still readable).',
            'clients' => ['Outlook 2007-2019'],
        ],
        [
            'regex' => '/<svg/i',
            'feature' => 'inline SVG',
            'severity' => 'warning',
            'description' => 'Inline SVG renders in Apple Mail, iOS Mail, Gmail web. Stripped or shown as broken image in Outlook 2007-2019, Outlook.com web, and some Yahoo configurations.',
            'clients' => ['Outlook 2007-2019', 'Outlook.com', 'Yahoo Mail (partial)'],
        ],
        [
            'regex' => '/display\s*:\s*(flex|grid|inline-flex|inline-grid)/',
            'feature' => 'flexbox / grid',
            'severity' => 'critical',
            'description' => 'Flexbox + CSS Grid have no support in Outlook on Windows + spotty support elsewhere. Use table-based layouts for cross-client safety.',
            'clients' => ['Outlook 2007-2019', 'Outlook.com', 'Gmail (partial)'],
        ],
        [
            'regex' => '/position\s*:\s*(absolute|fixed|sticky)/',
            'feature' => 'absolute / fixed positioning',
            'severity' => 'critical',
            'description' => 'Positioning is stripped by Gmail + ignored by Outlook. Don\'t rely on it for layout.',
            'clients' => ['Gmail', 'Outlook 2007-2019', 'Outlook.com'],
        ],
        [
            'regex' => '/@media[^{]+\(prefers-color-scheme/',
            'feature' => 'prefers-color-scheme media query',
            'severity' => 'info',
            'description' => 'Dark-mode adaptation via prefers-color-scheme works in Apple Mail + iOS Mail. Other clients either auto-invert colors heuristically (Gmail, Outlook.com) or don\'t adapt at all.',
            'clients' => ['Apple Mail / iOS only'],
        ],
        [
            'regex' => '/@font-face|font-family[^;]*Cinzel|font-family[^;]*Fraunces|font-family[^;]*Inter/',
            'feature' => 'web fonts',
            'severity' => 'info',
            'description' => 'Custom web fonts only load in Apple Mail, iOS Mail, AOL, and Gmail web. Everywhere else falls back to the next font in the stack — always include a safe serif/sans fallback like Georgia or Arial.',
            'clients' => ['Apple Mail', 'iOS Mail', 'AOL', 'Gmail web only'],
        ],
        [
            'regex' => '/<style[^>]*>/i',
            'feature' => '<style> block',
            'severity' => 'info',
            'description' => 'Gmail strips <style> blocks from the <head> in some configurations (notably when forwarding). Inline styles on every element are the safest path; this layout already does that.',
            'clients' => ['Gmail (partial)'],
        ],
        [
            'regex' => '/<script/i',
            'feature' => '<script> tag',
            'severity' => 'critical',
            'description' => 'JavaScript is stripped by every modern email client. Scripts in email indicate something is wrong with the template.',
            'clients' => ['All clients'],
        ],
    ];

    /**
     * @return list<array{feature: string, severity: string, description: string, clients: list<string>}>
     */
    public function analyze(string $html): array
    {
        $issues = [];

        foreach (self::RULES as $rule) {
            if (preg_match($rule['regex'], $html) === 1) {
                $issues[] = [
                    'feature' => $rule['feature'],
                    'severity' => $rule['severity'],
                    'description' => $rule['description'],
                    'clients' => $rule['clients'],
                ];
            }
        }

        return $issues;
    }
}
