import type { Topic } from './types';
import { GETTING_STARTED_TOPICS } from './01-getting-started';
import { FUNCTIONS_TOPICS }       from './02-functions';
import { DATA_STRUCTURES_TOPICS } from './03-data-structures';
import { OOP_TOPICS }             from './04-oop';
import { ERRORS_FILES_TOPICS }    from './05-errors-files';
import { STDLIB_TOPICS }          from './06-stdlib';
import { ADVANCED_TOPICS }        from './07-advanced';

export * from './types';

/** Concatenated in CHAPTERS order — the curriculum-order test depends on this. */
export const PYTHON_TOPICS: Topic[] = [
  ...GETTING_STARTED_TOPICS,
  ...FUNCTIONS_TOPICS,
  ...DATA_STRUCTURES_TOPICS,
  ...OOP_TOPICS,
  ...ERRORS_FILES_TOPICS,
  ...STDLIB_TOPICS,
  ...ADVANCED_TOPICS,
];
