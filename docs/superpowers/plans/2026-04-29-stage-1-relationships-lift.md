# Stage 1 Relationships Lift Implementation Plan

> Continuation of the Stage 1 EAV foundation work. Adds the relationship side of EAV: entry-to-entry connections via typed relationship blueprints, plus the dynamic relationship magic (`$entry->characters`, `$entry->parentScenes`).

**Goal:** Lift `EntryRelationship` + `RelationshipBlueprint` models, the `HasDynamicRelationships` trait, and Entry's `__call` magic method from `alexandria-legacy` into `alexandria-core`. Lift the four supporting pieces the trait depends on: `RelationshipKey` (value object), `RelationshipKeyParser` (parses `parentScenes;limit=10` keys), `RelationshipRepository` (query builder), `RelationshipWriter` (create/remove edges).

**Architecture:** Single-row bidirectional storage (one row per relationship, with `parent_label`/`child_label` for both viewing perspectives). The trait exposes `$entry->getDynamicRelationship('key')` + `$entry->callDynamicRelationship('key', [...])` which delegate to the Repository/Writer services. Entry's `__call` magic catches undefined method calls and routes them to `callDynamicRelationship`. Direction encoding: keys starting with `parent` are incoming (e.g., `parentScenes` finds entries that have THIS entry as a child); other keys are outgoing.

**Approach:** Maximize verbatim copies. Most of these files are pure framework code with no Spatie/AI/media coupling — just namespace edits.

**Tech stack:** unchanged from the EAV foundation slice.

---

## File Structure

**Created in `alexandria-core/`:**

```
src/
├── Models/System/
│   ├── EntryRelationship.php          (modeled after legacy)
│   └── RelationshipBlueprint.php      (modeled after legacy)
├── Services/Relationships/
│   ├── RelationshipRepository.php     (copy + namespace)
│   └── RelationshipWriter.php         (copy + namespace)
├── Support/
│   ├── RelationshipKey.php            (copy + namespace)
│   └── RelationshipKeyParser.php      (copy + namespace)
└── Traits/System/
    └── HasDynamicRelationships.php    (copy + namespace)

database/
├── migrations/
│   ├── 0001_01_01_000050_create_entry_relationships_table.php       (copy + strip)
│   └── 0001_01_01_000055_create_relationship_blueprints_table.php   (copy + strip)
└── factories/System/
    ├── EntryRelationshipFactory.php       (copy + namespace)
    └── RelationshipBlueprintFactory.php   (copy + namespace)

tests/Feature/
├── Models/
│   ├── EntryRelationshipTest.php
│   └── RelationshipBlueprintTest.php
├── Eav/
│   └── HasDynamicRelationshipsTest.php
└── Support/
    └── RelationshipKeyParserTest.php
```

**Modified:**
- `src/Models/System/Entry.php` — add `HasDynamicRelationships` trait, add `__call` magic method, update PHPDoc with new relations (`childRelationships`, `parentRelationships`)
- `config/alexandria.php` — add `entry_relationship` and `relationship_blueprint` model bindings

---

## Tasks

### Task 1: RelationshipBlueprint (migration + model + factory + tests)

Lift `relationship_blueprints` migration, the `RelationshipBlueprint` model, its factory. Project-scoped via FK to two blueprints (from + to). No EAV magic — straight Eloquent.

**Files:**
- Copy migration: `cp ../alexandria-legacy/database/migrations/0090_alexandria_foundation/0090_01_01_000055_create_relationship_blueprints_table.php database/migrations/0001_01_01_000055_create_relationship_blueprints_table.php`
- Copy factory: `cp ../alexandria-legacy/database/factories/System/RelationshipBlueprintFactory.php database/factories/System/RelationshipBlueprintFactory.php`
- Write fresh model at `src/Models/System/RelationshipBlueprint.php` (lift legacy's logic: `forBlueprint`, `shouldTriggerForContent`, `getRequiredForBlueprint`, `fromBlueprint`/`toBlueprint` BelongsTo) — strip the `@REVIEWED` block and Eloquent doc-comment imports.
- Write tests at `tests/Feature/Models/RelationshipBlueprintTest.php` (5 tests: creates with from/to FK, fromBlueprint/toBlueprint relationships, forBlueprint static method, shouldTriggerForContent with context_triggers, soft delete).

### Task 2: EntryRelationship (migration + model + factory + tests)

Lift `entry_relationships` migration (single-row bidirectional with `parent_entry_id` / `child_entry_id` / `relationship_type` slug / `parent_label` / `child_label` / `metadata` JSON / `archived_at` / `cascade_archived_by` self-FK). Lift the model (clean — no AI/Spatie/media). Lift factory.

**Files:**
- Copy migration + factory.
- Write fresh model at `src/Models/System/EntryRelationship.php` — lift archive helpers (`archive()`, `unarchive()`, `isArchived()`), `ofType` scope, `active`/`archived` scopes, `parent`/`child`/`blueprint` BelongsTo (blueprint joins `relationship_type` slug to Blueprint's `slug`).
- Tests cover: scoped creation, multi-row same-type intentional, parent/child relationships, `ofType` scope, archive/unarchive/isArchived, soft delete.

### Task 3: Support layer (RelationshipKey + RelationshipKeyParser + tests)

Pure copy + namespace edits. `RelationshipKey` is a final readonly value object, `RelationshipKeyParser` parses `parentScenes;limit=10;order=name` style keys.

**Files:**
- `cp ../alexandria-legacy/app/Support/RelationshipKey.php src/Support/RelationshipKey.php`
- `cp ../alexandria-legacy/app/Support/RelationshipKeyParser.php src/Support/RelationshipKeyParser.php`
- Tests at `tests/Feature/Support/RelationshipKeyParserTest.php` covering: outgoing key parses, incoming key (`parent` prefix) parses, slug normalization (PascalCase → snake_case), filter parsing (`limit`, `order`, `dir`), invalid filters throw, empty key throws.

### Task 4: Service layer (RelationshipRepository + RelationshipWriter)

Pure copy + namespace edits. No tests — these get exercised end-to-end in Task 5.

**Files:**
- `cp ../alexandria-legacy/app/Services/Relationships/RelationshipRepository.php src/Services/Relationships/RelationshipRepository.php`
- `cp ../alexandria-legacy/app/Services/Relationships/RelationshipWriter.php src/Services/Relationships/RelationshipWriter.php`

### Task 5: HasDynamicRelationships trait + Entry's __call magic + integration tests

The centerpiece. Lift the 244-line trait verbatim with namespace edits. Add to Entry. Add Entry's `__call` magic that catches `BadMethodCallException` from parent::__call and delegates to `callDynamicRelationship`.

**Files:**
- `cp ../alexandria-legacy/app/Traits/System/HasDynamicRelationships.php src/Traits/System/HasDynamicRelationships.php`
- Modify `src/Models/System/Entry.php`:
  - Add `use Alexandria\Core\Traits\System\HasDynamicRelationships;` import
  - Add `use HasDynamicRelationships;` to class
  - Add `__call($method, $parameters)` magic method (lifted from legacy lines 370-380)
  - Update `@property-read` PHPDoc to add `childRelationships` and `parentRelationships`
- Tests at `tests/Feature/Eav/HasDynamicRelationshipsTest.php` covering:
  - `$entry->addRelationship($child, 'home')` creates an EntryRelationship row
  - `$entry->getDynamicRelationship('children')` returns Collection of related Entries (outgoing)
  - `$entry->parentScenes` resolves via `__call` to the incoming-direction query (legacy parent prefix)
  - Multi-relationship support (no unique constraint)
  - Filter parsing: `$entry->callDynamicRelationship('characters', ['limit' => 5])` returns at most 5
  - Remove relationship via `removeRelationship`

### Task 6: Wire config + bindings + smoke test

Add `entry_relationship` and `relationship_blueprint` to `config/alexandria.php` per ADR-006. Add a host-app smoke test in alexandria-app.

**Files:**
- `config/alexandria.php` — add two more entries to the `models` array
- `tests/Feature/ConfigPublishingTest.php` — add an assertion for the new bindings
- `../alexandria-app/tests/Feature/AlexandriaCoreSmokeTest.php` — extend to create two entries + a relationship between them, assert `$parent->getDynamicRelationship('home')` returns the child entry

---

## Self-review checklist

- All tests pass: `cd alexandria-core && vendor/bin/pest`
- Pint passes: `vendor/bin/pint --test`
- Push core branch + alexandria-app branch, watch CI go green
- No `App\` namespace references in `src/`
- No factory uses world-specific names (Faker only)
- The HasDynamicRelationships trait depends on services bound in the container — they are in `src/Services/Relationships/` and use no service-provider registration (resolved automatically via container's autowiring since they have constructor-promoted dependencies)

---

## What's deferred (next slices)

- View registry
- AI subsystem
- Media library
- Permissions + activity log
- Notes subsystem
- Frontend extraction
