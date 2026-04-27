/**
 * JSONSchemas for each prep section, used as the `input_schema` of an
 * Anthropic tool_use call. Forcing the model through tool_use guarantees
 * we never get malformed JSON back — the SDK validates the structured
 * input before resolving, so the upstream "raw text dumped into summary"
 * failure path is eliminated by construction.
 *
 * Design notes:
 *   - additionalProperties is left open on most objects so the model can
 *     surface helpful side-fields (e.g. tradeoffs, gotchas) without the
 *     SDK refusing the call. The renderer has a generic catch-all so
 *     extra fields are never silently dropped.
 *   - Required arrays declare a sensible min so the model can't return
 *     a single-item placeholder.
 *   - The shape mirrors what LumoraDocsPanel's PrepContentRenderer
 *     already understands. Adding a field here without updating the
 *     renderer is fine — it'll fall through to GenericField.
 */

const abbreviation = {
  type: 'object',
  properties: {
    abbr: { type: 'string' },
    full: { type: 'string' },
  },
  required: ['abbr', 'full'],
  additionalProperties: false,
};

const abbreviationsArray = {
  type: 'array',
  description: 'Every acronym used anywhere in this section, expanded.',
  items: abbreviation,
};

const techStackEntry = {
  type: 'object',
  properties: {
    technology: { type: 'string' },
    category: { type: 'string' },
    experience: { type: 'string' },
    relevance: { type: 'string' },
  },
  required: ['technology', 'category', 'experience', 'relevance'],
  additionalProperties: true,
};

// ─────────────────────────────────────────────────────────────────────────
// Per-section schemas
// ─────────────────────────────────────────────────────────────────────────

const PITCH_SCHEMA = {
  type: 'object',
  properties: {
    pitchSections: {
      type: 'array',
      minItems: 5,
      maxItems: 5,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          duration: { type: 'string' },
          context: { type: 'string' },
          bullets: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4 },
        },
        required: ['title', 'duration', 'bullets'],
        additionalProperties: true,
      },
    },
    talkingPoints: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 },
    tips: { type: 'string' },
    techStack: { type: 'array', items: techStackEntry, minItems: 3 },
    abbreviations: abbreviationsArray,
  },
  required: ['pitchSections', 'talkingPoints', 'techStack'],
  additionalProperties: true,
};

const HR_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'Two to three sentences. No JSON, no headers.' },
    companyInsights: {
      type: 'object',
      properties: {
        interviewFormat: { type: 'string' },
        culture: { type: 'string' },
        values: { type: 'array', items: { type: 'string' }, minItems: 2 },
        recentNews: { type: 'string' },
      },
      required: ['interviewFormat', 'culture', 'values'],
      additionalProperties: true,
    },
    questions: {
      type: 'array',
      minItems: 6,
      maxItems: 10,
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          whyTheyAsk: { type: 'string' },
          suggestedAnswer: { type: 'string' },
          tips: { type: 'string' },
        },
        required: ['question', 'whyTheyAsk', 'suggestedAnswer', 'tips'],
        additionalProperties: true,
      },
    },
    salaryNegotiation: {
      type: 'object',
      properties: {
        companyContext: { type: 'string' },
        rangeEstimate: { type: 'string' },
        negotiationTips: { type: 'string' },
      },
      required: ['companyContext', 'rangeEstimate', 'negotiationTips'],
      additionalProperties: true,
    },
    questionsToAsk: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 6 },
    abbreviations: abbreviationsArray,
  },
  required: ['summary', 'companyInsights', 'questions', 'salaryNegotiation', 'questionsToAsk'],
  additionalProperties: true,
};

const HIRING_MANAGER_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    questions: {
      type: 'array',
      minItems: 6,
      maxItems: 10,
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          suggestedAnswer: { type: 'string' },
          tips: { type: 'string' },
        },
        required: ['question', 'suggestedAnswer', 'tips'],
        additionalProperties: true,
      },
    },
    questionsToAsk: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 6 },
    abbreviations: abbreviationsArray,
  },
  required: ['summary', 'questions', 'questionsToAsk'],
  additionalProperties: true,
};

const RRK_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    roleContext: {
      type: 'object',
      properties: {
        domain: { type: 'string' },
        seniority: { type: 'string' },
        focusAreas: { type: 'array', items: { type: 'string' }, minItems: 2 },
      },
      required: ['domain', 'seniority', 'focusAreas'],
      additionalProperties: true,
    },
    candidateStrengths: {
      type: 'array',
      minItems: 3,
      items: {
        type: 'object',
        properties: {
          area: { type: 'string' },
          evidence: { type: 'string' },
          howToLeverage: { type: 'string' },
        },
        required: ['area', 'evidence', 'howToLeverage'],
        additionalProperties: true,
      },
    },
    questions: {
      type: 'array',
      minItems: 4,
      maxItems: 8,
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          category: { type: 'string' },
          whatTheyTest: { type: 'string' },
          structuredAnswer: {
            type: 'object',
            properties: {
              setup: { type: 'string' },
              technicalDepth: { type: 'string' },
              tradeoffs: { type: 'string' },
              impact: { type: 'string' },
              companyRelevance: { type: 'string' },
            },
            additionalProperties: true,
          },
          followUps: { type: 'array', items: { type: 'object', additionalProperties: true } },
          tips: { type: 'string' },
        },
        required: ['question', 'whatTheyTest', 'structuredAnswer'],
        additionalProperties: true,
      },
    },
    questionsToAsk: { type: 'array', items: { type: 'object', additionalProperties: true } },
    generalTips: { type: 'array', items: { type: 'string' } },
    abbreviations: abbreviationsArray,
  },
  required: ['summary', 'roleContext', 'questions'],
  additionalProperties: true,
};

const CODING_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    companyInsights: { type: 'string' },
    keyTopics: {
      type: 'array',
      minItems: 4,
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          frequency: { type: 'string' },
          whyImportant: { type: 'string' },
        },
        required: ['topic', 'whyImportant'],
        additionalProperties: true,
      },
    },
    questions: {
      type: 'array',
      minItems: 4,
      maxItems: 7,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          difficulty: { type: 'string' },
          frequency: { type: 'string' },
          problemStatement: { type: 'string' },
          examples: { type: 'array', items: { type: 'object', additionalProperties: true } },
          approaches: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                timeComplexity: { type: 'string' },
                spaceComplexity: { type: 'string' },
                code: { type: 'string' },
                lineByLine: { type: 'array', items: { type: 'object', additionalProperties: true } },
              },
              required: ['name', 'timeComplexity', 'spaceComplexity', 'code'],
              additionalProperties: true,
            },
          },
          edgeCases: { type: 'array', items: { type: 'object', additionalProperties: true } },
          commonMistakes: { type: 'array', items: { type: 'string' } },
          followUpQuestions: { type: 'array', items: { type: 'string' } },
        },
        required: ['title', 'problemStatement', 'approaches'],
        additionalProperties: true,
      },
    },
    practiceRecommendations: { type: 'array', items: { type: 'object', additionalProperties: true } },
    ascendTips: { type: 'array', items: { type: 'string' } },
    abbreviations: abbreviationsArray,
  },
  required: ['summary', 'questions'],
  additionalProperties: true,
};

const SYSTEM_DESIGN_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    companyContext: { type: 'string' },
    ascendFramework: { type: 'object', additionalProperties: true },
    questions: {
      type: 'array',
      minItems: 3,
      maxItems: 5,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          frequency: { type: 'string' },
          timeLimit: { type: 'string' },
          clarifyingQuestions: { type: 'array', items: { type: 'string' } },
          requirements: {
            type: 'object',
            properties: {
              functional: { type: 'array', items: { type: 'string' }, minItems: 3 },
              nonFunctional: { type: 'array', items: { type: 'string' }, minItems: 3 },
            },
            required: ['functional', 'nonFunctional'],
            additionalProperties: true,
          },
          capacityEstimation: { type: 'object', additionalProperties: true },
          architecture: {
            type: 'object',
            properties: {
              diagramDescription: { type: 'string' },
              components: { type: 'array', items: { type: 'object', additionalProperties: true }, minItems: 3 },
            },
            required: ['diagramDescription', 'components'],
            additionalProperties: true,
          },
          databaseDesign: { type: 'object', additionalProperties: true },
          apiDesign: { type: 'array', items: { type: 'object', additionalProperties: true } },
          tradeOffs: { type: 'array', items: { type: 'object', additionalProperties: true } },
          scalabilityConsiderations: { type: 'array', items: { type: 'object', additionalProperties: true } },
          followUpQuestions: { type: 'array', items: { type: 'string' } },
        },
        required: ['title', 'requirements', 'architecture'],
        additionalProperties: true,
      },
    },
    generalTips: { type: 'array', items: { type: 'string' } },
    techStackReference: { type: 'object', additionalProperties: true },
    abbreviations: abbreviationsArray,
  },
  required: ['summary', 'questions'],
  additionalProperties: true,
};

const BEHAVIORAL_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    companyContext: {
      type: 'object',
      properties: {
        interviewFormat: { type: 'string' },
        whatTheyLookFor: { type: 'array', items: { type: 'string' }, minItems: 2 },
        knownQuestions: { type: 'array', items: { type: 'string' } },
        culturalFit: { type: 'string' },
      },
      additionalProperties: true,
    },
    questions: {
      type: 'array',
      minItems: 6,
      maxItems: 10,
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          whyThisCompanyAsks: { type: 'string' },
          companyValue: { type: 'string' },
          category: { type: 'string' },
          situation: { type: 'string' },
          task: { type: 'string' },
          action: { type: 'string' },
          result: { type: 'string' },
          companyConnection: { type: 'string' },
          tips: { type: 'string' },
        },
        required: ['question', 'situation', 'task', 'action', 'result'],
        additionalProperties: true,
      },
    },
    keyThemes: { type: 'array', items: { type: 'string' } },
    generalTips: { type: 'array', items: { type: 'string' } },
    abbreviations: abbreviationsArray,
  },
  required: ['summary', 'questions'],
  additionalProperties: true,
};

const TECHSTACK_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    companyTechContext: { type: 'string' },
    technologies: {
      type: 'array',
      minItems: 2,
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          importance: { type: 'string' },
          whyImportant: { type: 'string' },
          conceptsToKnow: { type: 'array', items: { type: 'object', additionalProperties: true } },
          questions: {
            type: 'array',
            minItems: 2,
            items: {
              type: 'object',
              properties: {
                question: { type: 'string' },
                difficulty: { type: 'string' },
                answer: { type: 'string' },
                codeExample: { type: 'string' },
                followUps: { type: 'array', items: { type: 'string' } },
                commonMistakes: { type: 'array', items: { type: 'string' } },
              },
              required: ['question', 'answer'],
              additionalProperties: true,
            },
          },
          bestPractices: { type: 'array', items: { type: 'object', additionalProperties: true } },
          antiPatterns: { type: 'array', items: { type: 'object', additionalProperties: true } },
          performanceTopics: { type: 'array', items: { type: 'string' } },
        },
        required: ['name', 'questions'],
        additionalProperties: true,
      },
    },
    architectureTopics: { type: 'array', items: { type: 'object', additionalProperties: true } },
    systemIntegrations: { type: 'array', items: { type: 'object', additionalProperties: true } },
    abbreviations: abbreviationsArray,
  },
  required: ['summary', 'technologies'],
  additionalProperties: true,
};

const CUSTOM_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    documentInsights: { type: 'object', additionalProperties: true },
    questions: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          category: { type: 'string' },
          difficulty: { type: 'string' },
          answer: { type: 'string' },
          keyPoints: { type: 'array', items: { type: 'string' } },
          followUps: { type: 'array', items: { type: 'string' } },
          documentReference: { type: 'string' },
        },
        required: ['question', 'answer'],
        additionalProperties: true,
      },
    },
    practiceScenarios: { type: 'array', items: { type: 'object', additionalProperties: true } },
    quickReference: { type: 'array', items: { type: 'object', additionalProperties: true } },
    studyTips: { type: 'array', items: { type: 'string' } },
    abbreviations: abbreviationsArray,
  },
  required: ['summary', 'questions'],
  additionalProperties: true,
};

export const SECTION_SCHEMAS = {
  pitch: PITCH_SCHEMA,
  hr: HR_SCHEMA,
  'hiring-manager': HIRING_MANAGER_SCHEMA,
  rrk: RRK_SCHEMA,
  coding: CODING_SCHEMA,
  'system-design': SYSTEM_DESIGN_SCHEMA,
  behavioral: BEHAVIORAL_SCHEMA,
  techstack: TECHSTACK_SCHEMA,
  custom: CUSTOM_SCHEMA,
};

/**
 * Resolve a schema for a section id. Custom sections (custom-*, custom_*)
 * all share the CUSTOM_SCHEMA so user-uploaded docs always get the same
 * shape on the frontend.
 */
export function getSchemaForSection(sectionId) {
  if (!sectionId) return null;
  if (SECTION_SCHEMAS[sectionId]) return SECTION_SCHEMAS[sectionId];
  if (sectionId.startsWith('custom')) return CUSTOM_SCHEMA;
  return null;
}
