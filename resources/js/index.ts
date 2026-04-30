// alexandria-core frontend exports
//
// Consumers import directly from the subpath aliases — e.g.
//   import { cn } from '@alexandria/lib/utils';
//   import type { Entry } from '@alexandria/types/models';
//
// We deliberately do not re-export from this barrel. Subpath imports
// give consumers tree-shakeable, self-documenting paths and avoid
// pulling React-using hooks into modules that only need types. See
// docs/integration/frontend-setup.md for the full recipe.
export {};
