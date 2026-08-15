// SQL Quick Reference cards.
//
// Same contract as the Python cards: unique titles (duplicates collapse into
// language tabs), `language: 'sql'`, and code that is copy-ready.
//
// Dialect policy: ANSI SQL by default, with PostgreSQL as the reference
// implementation. Where MySQL / SQLite / SQL Server differ in a way that
// actually bites, the difference is called out inline or in card 37.
//
// NOTE: MySQL back-quoted identifiers are deliberately avoided in the snippets
// (a back-quote would terminate the JS template literal); double-quoted ANSI
// identifiers are used instead, and card 37 documents the quoting per dialect.

export const sqlCards = [
  // ─────────────────────────────────────────────────────────────
  // Query fundamentals
  // ─────────────────────────────────────────────────────────────
  {
    title: '01 · Logical Query Processing Order',
    language: 'sql',
    description: 'The single most useful mental model in SQL. Clauses do NOT execute in the order you write them, which is why you cannot use a SELECT alias in WHERE but can in ORDER BY.',
    code: `-- WRITTEN order            EXECUTION order
-- SELECT                   5.  SELECT      (aliases created HERE)
-- FROM                     1.  FROM / JOIN (rows assembled)
-- WHERE                    2.  WHERE       (filter rows)
-- GROUP BY                 3.  GROUP BY    (collapse into groups)
-- HAVING                   4.  HAVING      (filter groups)
-- ORDER BY                 6.  ORDER BY    (aliases usable HERE)
-- LIMIT                    7.  LIMIT / OFFSET

-- Consequence 1: WHERE cannot see a SELECT alias (it runs BEFORE SELECT)
SELECT salary * 12 AS annual
FROM   employees
-- WHERE annual > 100000            -- ERROR: column "annual" does not exist
WHERE  salary * 12 > 100000;        -- repeat the expression...
-- ...or wrap it:
SELECT * FROM (SELECT salary * 12 AS annual FROM employees) t WHERE annual > 100000;

-- Consequence 2: ORDER BY *can* see the alias (it runs AFTER SELECT)
SELECT salary * 12 AS annual FROM employees ORDER BY annual DESC;

-- Consequence 3: WHERE filters ROWS, HAVING filters GROUPS
SELECT   dept_id, COUNT(*) AS headcount
FROM     employees
WHERE    active = TRUE          -- drop rows first (cheaper)
GROUP BY dept_id
HAVING   COUNT(*) > 5;          -- then drop groups

-- Consequence 4: you cannot reference an aggregate in WHERE
-- WHERE COUNT(*) > 5           -- ERROR: aggregates are not allowed here

-- Consequence 5: LIMIT applies LAST, so ORDER BY without a deterministic
-- tiebreaker returns arbitrary rows across runs.
SELECT * FROM employees ORDER BY salary DESC, id ASC LIMIT 10;`,
  },
  {
    title: '02 · SELECT, DISTINCT & Aliases',
    language: 'sql',
    description: 'DISTINCT applies to the whole row of the select list, not to one column — a misreading that silently returns too many rows.',
    code: `SELECT * FROM employees;                     -- avoid in production code
SELECT id, name, salary FROM employees;      -- be explicit

SELECT name AS employee_name,                -- AS is optional but readable
       salary * 12 AS annual_salary,
       'active' AS status                    -- literal column
FROM   employees e;                          -- table alias

-- DISTINCT applies to the ENTIRE select list
SELECT DISTINCT dept_id FROM employees;              -- distinct departments
SELECT DISTINCT dept_id, role FROM employees;        -- distinct PAIRS, not
                                                     -- distinct dept_id
-- PostgreSQL only: one row per dept, chosen by ORDER BY
SELECT DISTINCT ON (dept_id) dept_id, name, salary
FROM   employees
ORDER  BY dept_id, salary DESC;              -- highest earner per dept

-- COUNT variants
SELECT COUNT(*)              FROM employees;  -- all rows
SELECT COUNT(manager_id)     FROM employees;  -- NON-NULL values only
SELECT COUNT(DISTINCT dept_id) FROM employees;

-- Quoting: unquoted identifiers fold case (PostgreSQL -> lower, Oracle -> upper)
SELECT "myColumn" FROM "MyTable";            -- ANSI / PostgreSQL
-- SQL Server uses [brackets]; MySQL uses back-quotes (see card 37)

-- Comments
-- line comment
/* block
   comment */`,
  },
  {
    title: '03 · WHERE & Comparison Operators',
    language: 'sql',
    description: 'BETWEEN is inclusive on both ends — a frequent off-by-one with timestamps, where you almost always want a half-open range instead.',
    code: `SELECT * FROM employees
WHERE  salary > 50000
  AND  dept_id = 3
  AND  (role = 'eng' OR role = 'sre')       -- parenthesise mixed AND/OR

-- Operators:  =  <>  !=  <  <=  >  >=
WHERE salary <> 0                            -- <> is the ANSI form

WHERE dept_id IN (1, 2, 3)                   -- set membership
WHERE dept_id NOT IN (1, 2)                  -- DANGER if the list can be NULL
WHERE salary BETWEEN 50000 AND 90000         -- INCLUSIVE of both bounds

-- Timestamps: BETWEEN silently drops the last day's rows after midnight
WHERE created_at BETWEEN '2026-01-01' AND '2026-01-31'   -- misses 31st 00:00:01+
WHERE created_at >= '2026-01-01'
  AND created_at <  '2026-02-01'             -- half-open: correct and sargable

-- LIKE:  %  = any run of chars,  _ = exactly one char
WHERE name LIKE 'A%'                         -- starts with A (index-usable)
WHERE name LIKE '%son'                       -- ends with son (NO index)
WHERE name LIKE '_o%'                        -- 'o' in position 2
WHERE name ILIKE 'a%'                        -- case-insensitive (PostgreSQL)
WHERE name LIKE '50\\%%' ESCAPE '\\'           -- literal percent sign

-- Regex:  PostgreSQL ~ / ~*   MySQL REGEXP   SQL Server: no native regex
WHERE email ~ '^[a-z]+@example\\.com$'

WHERE manager_id IS NULL                     -- NEVER  = NULL  (see card 04)
WHERE deleted_at IS NOT NULL

-- Row constructors compare left to right
WHERE (dept_id, salary) > (3, 50000);`,
  },
  {
    title: '04 · NULL & Three-Valued Logic',
    language: 'sql',
    description: 'NULL means "unknown", not "empty". Every comparison with it yields UNKNOWN, and WHERE keeps only TRUE — which is why NOT IN with a NULL returns zero rows.',
    code: `-- NULL is never equal to anything, including itself
SELECT NULL = NULL;        -- NULL (not TRUE)
SELECT NULL <> NULL;       -- NULL
SELECT NULL = 0;           -- NULL
WHERE  col = NULL          -- matches NOTHING, ever
WHERE  col IS NULL         -- the correct test
WHERE  col IS NOT DISTINCT FROM other   -- NULL-safe equality (PostgreSQL)
WHERE  col <=> other                    -- NULL-safe equality (MySQL)

-- WHERE keeps only TRUE. UNKNOWN is discarded like FALSE.
-- So these two do NOT cover all rows:
WHERE status = 'active'
WHERE status <> 'active'   -- rows where status IS NULL appear in NEITHER
WHERE status IS DISTINCT FROM 'active'   -- ...this one includes the NULLs

-- THE NOT IN TRAP: one NULL in the subquery kills the whole result
SELECT * FROM employees
WHERE  dept_id NOT IN (SELECT id FROM departments);   -- 0 rows if any id IS NULL
--   dept_id NOT IN (1, 2, NULL)
-- = dept_id<>1 AND dept_id<>2 AND dept_id<>NULL
-- = TRUE AND TRUE AND UNKNOWN = UNKNOWN -> filtered out

-- Fixes, best first:
WHERE NOT EXISTS (SELECT 1 FROM departments d WHERE d.id = e.dept_id)  -- NULL-safe
WHERE dept_id NOT IN (SELECT id FROM departments WHERE id IS NOT NULL)

-- Aggregates SKIP NULLs (except COUNT(*))
-- rows: 10, 20, NULL
SELECT COUNT(*),  -- 3
       COUNT(v),  -- 2   <-- NULL not counted
       SUM(v),    -- 30
       AVG(v);    -- 15  <-- 30/2, NOT 30/3
SELECT AVG(COALESCE(v, 0));   -- 10, if you want NULL to count as zero

-- NULL handling helpers
COALESCE(a, b, c)          -- first non-NULL           (ANSI)
NULLIF(a, b)               -- NULL when a = b; guards division by zero:
  total / NULLIF(count, 0)
IFNULL(a, b)               -- MySQL / SQLite
ISNULL(a, b)               -- SQL Server

-- Sorting: NULLs sort last in PostgreSQL ASC, first in MySQL. Be explicit:
ORDER BY salary DESC NULLS LAST;

-- UNIQUE constraints allow MULTIPLE NULLs (they are not "equal" to each other).`,
  },
  {
    title: '05 · ORDER BY, LIMIT & Pagination',
    language: 'sql',
    description: 'OFFSET makes the database scan and discard every skipped row, so page 10,000 is thousands of times slower than page 1. Keyset pagination is the fix.',
    code: `SELECT * FROM employees
ORDER  BY dept_id ASC, salary DESC, id ASC   -- id = deterministic tiebreaker
LIMIT  10 OFFSET 20;                         -- PostgreSQL / MySQL / SQLite

-- Dialects
LIMIT 10 OFFSET 20;                            -- PG, MySQL, SQLite
OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;        -- ANSI, SQL Server 2012+, Oracle
SELECT TOP 10 * FROM employees;                -- SQL Server

ORDER BY salary DESC NULLS LAST;               -- explicit NULL placement
ORDER BY 2;                                    -- by select-list position (fragile)
ORDER BY CASE role WHEN 'lead' THEN 0 ELSE 1 END, name;   -- custom ordering

-- OFFSET pagination: simple, but O(offset). Also SKIPS/DUPLICATES rows when
-- the underlying data changes between pages.
SELECT * FROM events ORDER BY created_at DESC LIMIT 20 OFFSET 200000;  -- slow

-- KEYSET (cursor / seek) pagination: O(log n) per page, stable under writes.
-- Page 1
SELECT * FROM events
ORDER  BY created_at DESC, id DESC
LIMIT  20;
-- Page N: pass the last row's sort key back as the cursor
SELECT * FROM events
WHERE  (created_at, id) < ('2026-08-14 10:00:00', 918273)   -- row comparison
ORDER  BY created_at DESC, id DESC
LIMIT  20;
-- Needs an index on (created_at DESC, id DESC) to be fast.
-- Trade-off: no random access to "page 500", only next/prev.

-- Total count for a paginated UI is expensive; prefer an approximate count
-- or "load more" over rendering an exact page count.`,
  },

  // ─────────────────────────────────────────────────────────────
  // Aggregation
  // ─────────────────────────────────────────────────────────────
  {
    title: '06 · Aggregates, GROUP BY & HAVING',
    language: 'sql',
    description: 'Every non-aggregated column in the select list must appear in GROUP BY. MySQL historically let you break this rule and returned an arbitrary row.',
    code: `SELECT   dept_id,
         COUNT(*)        AS headcount,
         SUM(salary)     AS payroll,
         AVG(salary)     AS avg_salary,
         MIN(salary)     AS lowest,
         MAX(salary)     AS highest,
         COUNT(DISTINCT role) AS distinct_roles
FROM     employees
WHERE    active = TRUE          -- filters ROWS, before grouping
GROUP BY dept_id
HAVING   COUNT(*) > 5           -- filters GROUPS, after grouping
ORDER BY payroll DESC;

-- Every bare column must be grouped
-- SELECT dept_id, name, COUNT(*) FROM employees GROUP BY dept_id;  -- ERROR
-- (MySQL without ONLY_FULL_GROUP_BY returns an ARBITRARY name — a silent bug.)

-- Conditional aggregation ("pivot without PIVOT") — one pass, no self-joins
SELECT dept_id,
       COUNT(*) FILTER (WHERE role = 'eng')  AS engineers,   -- ANSI / PostgreSQL
       COUNT(*) FILTER (WHERE role = 'sre')  AS sres,
       SUM(CASE WHEN active THEN salary ELSE 0 END) AS active_payroll
FROM   employees
GROUP  BY dept_id;
-- Portable form of FILTER:
       SUM(CASE WHEN role = 'eng' THEN 1 ELSE 0 END) AS engineers,
       COUNT(CASE WHEN role = 'eng' THEN 1 END)      AS engineers_alt

-- String / array aggregation
STRING_AGG(name, ', ' ORDER BY name)     -- PostgreSQL, SQL Server 2017+
GROUP_CONCAT(name ORDER BY name)         -- MySQL, SQLite
ARRAY_AGG(name ORDER BY name)            -- PostgreSQL
JSON_AGG(row_to_json(t))                 -- PostgreSQL

-- Multiple grouping levels in one scan
GROUP BY ROLLUP (dept_id, role)          -- subtotals + grand total
GROUP BY CUBE (dept_id, role)            -- every combination
GROUP BY GROUPING SETS ((dept_id), (role), ())

-- GROUP BY with no rows returns NO rows; a bare aggregate returns one NULL row
SELECT SUM(salary) FROM employees WHERE 1=0;             -- one row, NULL
SELECT dept_id, SUM(salary) FROM employees WHERE 1=0 GROUP BY dept_id;  -- 0 rows
SELECT COALESCE(SUM(salary), 0) FROM employees WHERE 1=0;   -- one row, 0`,
  },

  // ─────────────────────────────────────────────────────────────
  // Joins
  // ─────────────────────────────────────────────────────────────
  {
    title: '07 · JOIN Types',
    language: 'sql',
    description: 'Pick the join by which side must survive. A missing ON clause silently degrades to a cross join and multiplies your row count.',
    code: `-- INNER: only rows matching on BOTH sides
SELECT e.name, d.name AS dept
FROM   employees e
JOIN   departments d ON d.id = e.dept_id;        -- "JOIN" == "INNER JOIN"

-- LEFT (OUTER): all LEFT rows; right columns become NULL when unmatched
SELECT e.name, d.name AS dept
FROM   employees e
LEFT JOIN departments d ON d.id = e.dept_id;     -- keeps employees with no dept

-- RIGHT: all RIGHT rows. Rare — flip the tables and use LEFT for readability.
-- FULL OUTER: all rows from both sides (not supported by MySQL — see card 37)
SELECT COALESCE(e.dept_id, d.id) AS dept_id
FROM   employees e
FULL OUTER JOIN departments d ON d.id = e.dept_id;

-- CROSS: cartesian product, every pair. Useful for generating grids.
SELECT * FROM sizes CROSS JOIN colours;          -- n * m rows
SELECT * FROM sizes, colours;                    -- implicit, same thing
-- An accidental cross join is usually a forgotten ON clause.

-- SELF JOIN: a table against itself, always aliased
SELECT e.name AS employee, m.name AS manager
FROM   employees e
LEFT JOIN employees m ON m.id = e.manager_id;    -- LEFT keeps the CEO

-- Multi-column and inequality joins
JOIN prices p ON p.sku = s.sku AND s.sold_at BETWEEN p.valid_from AND p.valid_to

-- USING when the column names match exactly (emits ONE merged column)
SELECT * FROM employees JOIN departments USING (dept_id);

-- NATURAL JOIN joins on every same-named column. Never use it: adding an
-- unrelated "created_at" to both tables silently changes the join condition.

-- Row-count intuition: a join emits one row per MATCHING PAIR. Joining to a
-- table with 3 matching rows triples your rows, and any SUM() then triples too.`,
  },
  {
    title: '08 · The LEFT JOIN + WHERE Trap',
    language: 'sql',
    description: 'A filter on the right table in WHERE runs AFTER the join and discards the NULL-extended rows, silently converting your LEFT JOIN into an INNER JOIN.',
    code: `-- GOAL: every employee, plus their 2026 orders if any

-- WRONG — WHERE runs after the join and kills the unmatched (NULL) rows
SELECT e.name, o.id
FROM   employees e
LEFT JOIN orders o ON o.employee_id = e.id
WHERE  o.year = 2026;              -- o.year IS NULL for unmatched -> filtered out
-- Result: behaves exactly like an INNER JOIN.

-- RIGHT — put the right-table condition in the ON clause
SELECT e.name, o.id
FROM   employees e
LEFT JOIN orders o ON o.employee_id = e.id
                  AND o.year = 2026;     -- filters BEFORE/DURING the join
-- Employees with no 2026 order still appear, with o.id NULL.

-- Left-table conditions belong in WHERE either way
WHERE e.active = TRUE

-- The exception: testing for NULL in WHERE is the ANTI-JOIN idiom
SELECT e.name
FROM   employees e
LEFT JOIN orders o ON o.employee_id = e.id
WHERE  o.id IS NULL;               -- employees with NO orders at all

-- Three ways to write an anti-join
SELECT * FROM employees e WHERE NOT EXISTS (
  SELECT 1 FROM orders o WHERE o.employee_id = e.id);         -- clearest, NULL-safe
SELECT * FROM employees e LEFT JOIN orders o ON o.employee_id = e.id
WHERE o.id IS NULL;                                            -- LEFT JOIN / IS NULL
SELECT * FROM employees WHERE id NOT IN (
  SELECT employee_id FROM orders WHERE employee_id IS NOT NULL);  -- NULL-fragile

-- SEMI-JOIN: rows that HAVE a match, without duplicating them
SELECT * FROM employees e WHERE EXISTS (
  SELECT 1 FROM orders o WHERE o.employee_id = e.id);
-- A plain JOIN would emit one row per order, inflating the result.`,
  },
  {
    title: '09 · Subqueries & EXISTS vs IN',
    language: 'sql',
    description: 'EXISTS short-circuits on the first match and is NULL-safe; IN materialises the whole list and breaks on NULLs. Prefer EXISTS for correlated existence tests.',
    code: `-- SCALAR subquery — must return exactly one row and one column
SELECT name, salary,
       (SELECT AVG(salary) FROM employees) AS company_avg
FROM   employees;

-- IN subquery — set membership
SELECT * FROM employees
WHERE  dept_id IN (SELECT id FROM departments WHERE region = 'EU');

-- EXISTS — correlated; the SELECT list is irrelevant, use 1
SELECT * FROM employees e
WHERE  EXISTS (SELECT 1 FROM orders o
               WHERE o.employee_id = e.id AND o.total > 1000);

-- NOT EXISTS is NULL-safe; NOT IN is NOT (see card 04)
WHERE NOT EXISTS (SELECT 1 FROM departments d WHERE d.id = e.dept_id)

-- Derived table (subquery in FROM) — must be aliased
SELECT t.dept_id, t.avg_salary
FROM  (SELECT dept_id, AVG(salary) AS avg_salary
       FROM   employees GROUP BY dept_id) t
WHERE t.avg_salary > 80000;

-- LATERAL / CROSS APPLY — a subquery that can reference the outer row.
-- The idiomatic "top N rows per group".
SELECT d.name, top_emp.name, top_emp.salary
FROM   departments d
CROSS JOIN LATERAL (                       -- PostgreSQL; SQL Server: CROSS APPLY
  SELECT name, salary FROM employees e
  WHERE  e.dept_id = d.id
  ORDER  BY salary DESC
  LIMIT  3
) top_emp;
-- LEFT JOIN LATERAL ... ON TRUE keeps departments with no employees.

-- Subquery in SELECT runs once per output row — usually rewrite as a JOIN
-- or a window function:
SELECT name, salary,
       AVG(salary) OVER (PARTITION BY dept_id) AS dept_avg   -- one pass
FROM   employees;

-- ANY / ALL
WHERE salary > ALL (SELECT salary FROM employees WHERE dept_id = 2)   -- > max
WHERE salary > ANY (SELECT salary FROM employees WHERE dept_id = 2)   -- > min`,
  },
  {
    title: '10 · CTEs & Recursive Queries',
    language: 'sql',
    description: 'WITH names a subquery so a complex query reads top to bottom. Recursive CTEs walk hierarchies and generate series — always bound them or they run forever.',
    code: `-- Basic CTE — readability, and reuse of the same subquery
WITH dept_stats AS (
    SELECT dept_id, AVG(salary) AS avg_salary, COUNT(*) AS headcount
    FROM   employees
    GROUP  BY dept_id
)
SELECT d.name, s.avg_salary, s.headcount
FROM   dept_stats s
JOIN   departments d ON d.id = s.dept_id
WHERE  s.headcount > 5;

-- Multiple CTEs, each able to reference the previous ones
WITH active AS (
    SELECT * FROM employees WHERE active
), by_dept AS (
    SELECT dept_id, COUNT(*) AS n FROM active GROUP BY dept_id
)
SELECT * FROM by_dept WHERE n > 3;

-- RECURSIVE: anchor member, UNION ALL, recursive member referencing the CTE
WITH RECURSIVE org AS (
    SELECT id, name, manager_id, 1 AS depth,           -- anchor: the roots
           CAST(name AS VARCHAR(1000)) AS path
    FROM   employees WHERE manager_id IS NULL
  UNION ALL
    SELECT e.id, e.name, e.manager_id, o.depth + 1,    -- recursive step
           o.path || ' > ' || e.name
    FROM   employees e
    JOIN   org o ON e.manager_id = o.id
    WHERE  o.depth < 10                                -- ALWAYS bound the depth
)
SELECT depth, path FROM org ORDER BY path;

-- Generate a series (gap-filling a date axis)
WITH RECURSIVE days AS (
    SELECT DATE '2026-01-01' AS d
  UNION ALL
    SELECT d + 1 FROM days WHERE d < DATE '2026-01-31'
)
SELECT d.d, COALESCE(COUNT(e.id), 0) AS events
FROM   days d LEFT JOIN events e ON e.day = d.d
GROUP  BY d.d ORDER BY d.d;
-- PostgreSQL shortcut: SELECT generate_series('2026-01-01'::date,
--                                             '2026-01-31'::date, '1 day');

-- Materialisation: PostgreSQL 12+ inlines CTEs by default; force either way
WITH x AS MATERIALIZED     (...)    -- compute once, reuse
WITH x AS NOT MATERIALIZED (...)    -- inline into the outer query

-- Data-modifying CTE (PostgreSQL) — move rows in one statement
WITH moved AS (
    DELETE FROM staging RETURNING *
)
INSERT INTO final SELECT * FROM moved;`,
  },

  // ─────────────────────────────────────────────────────────────
  // Window functions
  // ─────────────────────────────────────────────────────────────
  {
    title: '11 · Window Functions: OVER & PARTITION BY',
    language: 'sql',
    description: 'A window function computes across a set of rows while KEEPING every row — that is the whole difference from GROUP BY, which collapses them.',
    code: `-- GROUP BY collapses rows; OVER keeps them
SELECT   dept_id, AVG(salary) FROM employees GROUP BY dept_id;   -- 1 row/dept
SELECT   name, dept_id, salary,
         AVG(salary) OVER (PARTITION BY dept_id) AS dept_avg      -- 1 row/employee
FROM     employees;

-- Anatomy:  fn() OVER (PARTITION BY ... ORDER BY ... frame)
--   PARTITION BY = the "GROUP BY" of the window (omit = one big partition)
--   ORDER BY     = ordering INSIDE the partition (required by ranking fns)
--   frame        = which rows in the partition are visible (card 13)

SELECT name, salary, dept_id,
       salary - AVG(salary) OVER (PARTITION BY dept_id)     AS vs_dept_avg,
       salary / SUM(salary) OVER ()                         AS pct_of_payroll,
       COUNT(*)             OVER (PARTITION BY dept_id)     AS dept_headcount,
       MAX(salary)          OVER (PARTITION BY dept_id)     AS dept_top
FROM   employees;

-- Named window, reused by several functions
SELECT name,
       ROW_NUMBER() OVER w AS rn,
       RANK()       OVER w AS rnk
FROM   employees
WINDOW w AS (PARTITION BY dept_id ORDER BY salary DESC);

-- Window functions run AFTER WHERE/GROUP BY/HAVING and BEFORE ORDER BY/LIMIT.
-- So you CANNOT filter on one directly — wrap it:
-- WHERE ROW_NUMBER() OVER (...) = 1          -- ERROR
SELECT * FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) rn
  FROM employees
) t WHERE rn = 1;                             -- top earner per department
-- PostgreSQL 15+ / SQL Server: QUALIFY rn = 1 (also Snowflake, BigQuery)

-- Aggregates usable as windows: SUM MIN MAX AVG COUNT, plus the
-- window-only ones: ROW_NUMBER RANK DENSE_RANK NTILE LAG LEAD
-- FIRST_VALUE LAST_VALUE NTH_VALUE PERCENT_RANK CUME_DIST`,
  },
  {
    title: '12 · Ranking: ROW_NUMBER / RANK / DENSE_RANK',
    language: 'sql',
    description: 'The three differ only in how they treat ties, and choosing wrong is the most common window-function bug. Pick by what should happen to duplicates.',
    code: `-- salaries: 100, 90, 90, 80
SELECT name, salary,
       ROW_NUMBER() OVER (ORDER BY salary DESC) AS rn,   -- 1, 2, 3, 4  no ties
       RANK()       OVER (ORDER BY salary DESC) AS rnk,  -- 1, 2, 2, 4  GAP after tie
       DENSE_RANK() OVER (ORDER BY salary DESC) AS drnk, -- 1, 2, 2, 3  NO gap
       NTILE(4)     OVER (ORDER BY salary DESC) AS quartile
FROM   employees;

-- ROW_NUMBER  -> "give me exactly one row per group" (dedupe, pagination)
-- RANK        -> competition ranking; 2 silver medals means no bronze
-- DENSE_RANK  -> "Nth distinct value" (the 2nd highest SALARY, not employee)

-- Top earner per department
SELECT * FROM (
  SELECT name, dept_id, salary,
         ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC, id) rn
  FROM   employees
) t WHERE rn = 1;

-- Top 3 per department: change to rn <= 3.
-- Use RANK() <= 3 instead if ties should all be included.

-- Second highest DISTINCT salary — DENSE_RANK is the correct tool
SELECT DISTINCT salary FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) dr FROM employees
) t WHERE dr = 2;
-- Alternatives:
SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees);
SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1;

-- Deduplicate, keeping the newest row per key
DELETE FROM events WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, kind
                                  ORDER BY created_at DESC) rn
    FROM events
  ) t WHERE rn > 1
);

-- Always add a deterministic tiebreaker to ORDER BY inside the window, or
-- ROW_NUMBER assigns arbitrarily across runs.`,
  },
  {
    title: '13 · LAG, LEAD & Frame Clauses',
    language: 'sql',
    description: 'The default frame is RANGE UNBOUNDED PRECEDING when you add ORDER BY — which makes running totals lump all tied rows together. Use ROWS when you mean rows.',
    code: `-- LAG / LEAD: reach into the previous / next row of the partition
SELECT day, revenue,
       LAG(revenue)      OVER (ORDER BY day) AS prev_day,
       LEAD(revenue)     OVER (ORDER BY day) AS next_day,
       LAG(revenue, 7)   OVER (ORDER BY day) AS week_ago,
       LAG(revenue, 1, 0) OVER (ORDER BY day) AS prev_or_zero,   -- default arg
       revenue - LAG(revenue) OVER (ORDER BY day) AS day_over_day
FROM   daily;

-- Running total. WITHOUT a frame clause and WITH ORDER BY, the default is
--   RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
-- RANGE lumps together every row with the SAME ORDER BY value:
SELECT day, SUM(revenue) OVER (ORDER BY day) AS running_range,   -- ties merged
       SUM(revenue) OVER (ORDER BY day
                          ROWS BETWEEN UNBOUNDED PRECEDING
                                   AND CURRENT ROW) AS running_rows  -- per row
FROM   daily;
-- If 'day' is unique they agree; if it repeats, only ROWS is row-by-row.

-- Moving average over the last 7 rows
SELECT day, AVG(revenue) OVER (ORDER BY day
                               ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS ma7
FROM   daily;

-- Centred window
ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING

-- Whole partition (the default when there is NO ORDER BY)
ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING

-- FIRST_VALUE / LAST_VALUE — LAST_VALUE needs an explicit frame or it
-- returns the CURRENT row, because the default frame ends at the current row.
SELECT name, salary,
       FIRST_VALUE(name) OVER (PARTITION BY dept_id ORDER BY salary DESC) AS top,
       LAST_VALUE(name)  OVER (PARTITION BY dept_id ORDER BY salary DESC
                               ROWS BETWEEN UNBOUNDED PRECEDING
                                        AND UNBOUNDED FOLLOWING) AS bottom
FROM   employees;

-- GROUPS frame (SQL:2011, PostgreSQL 11+): counts peer groups, not rows
GROUPS BETWEEN 1 PRECEDING AND 1 FOLLOWING`,
  },
  {
    title: '14 · Gaps, Islands & Running Patterns',
    language: 'sql',
    description: 'The "consecutive days" family of questions. The trick is that row_number minus the value is constant within a consecutive run.',
    code: `-- CONSECUTIVE RUNS ("islands"): subtract a row number from the value.
-- Within a run the difference is constant, so it becomes the group key.
WITH numbered AS (
  SELECT user_id, login_date,
         login_date - CAST(ROW_NUMBER() OVER (PARTITION BY user_id
                                              ORDER BY login_date) AS INT) AS grp
  FROM   logins
)
SELECT user_id, MIN(login_date) AS run_start, MAX(login_date) AS run_end,
       COUNT(*) AS streak
FROM   numbered
GROUP  BY user_id, grp
HAVING COUNT(*) >= 3
ORDER  BY streak DESC;

-- GAPS: rows where the next value is not current + 1
SELECT id + 1 AS gap_start, next_id - 1 AS gap_end
FROM (SELECT id, LEAD(id) OVER (ORDER BY id) AS next_id FROM seq) t
WHERE next_id > id + 1;

-- SESSIONISATION: start a new session after 30 minutes of inactivity
WITH marked AS (
  SELECT user_id, ts,
         CASE WHEN ts - LAG(ts) OVER (PARTITION BY user_id ORDER BY ts)
                   > INTERVAL '30 minutes'
              OR LAG(ts) OVER (PARTITION BY user_id ORDER BY ts) IS NULL
              THEN 1 ELSE 0 END AS is_new_session
  FROM events
)
SELECT user_id, ts,
       SUM(is_new_session) OVER (PARTITION BY user_id ORDER BY ts
                                 ROWS UNBOUNDED PRECEDING) AS session_id
FROM   marked;

-- CHANGE POINTS: rows where a value differs from the previous one
SELECT * FROM (
  SELECT *, LAG(status) OVER (PARTITION BY id ORDER BY ts) AS prev
  FROM   status_log
) t WHERE prev IS DISTINCT FROM status;

-- THREE CONSECUTIVE OCCURRENCES (the classic "3 in a row")
SELECT DISTINCT num FROM (
  SELECT num,
         LAG(num)  OVER (ORDER BY id) AS p,
         LEAD(num) OVER (ORDER BY id) AS n
  FROM logs
) t WHERE num = p AND num = n;

-- PERCENT OF TOTAL and cumulative distribution
SELECT name, salary,
       salary * 100.0 / SUM(salary) OVER () AS pct,
       PERCENT_RANK()  OVER (ORDER BY salary) AS pct_rank,
       CUME_DIST()     OVER (ORDER BY salary) AS cume
FROM   employees;`,
  },

  // ─────────────────────────────────────────────────────────────
  // Set ops, expressions, functions
  // ─────────────────────────────────────────────────────────────
  {
    title: '15 · UNION, INTERSECT & EXCEPT',
    language: 'sql',
    description: 'UNION deduplicates and therefore sorts or hashes everything; UNION ALL does not. Use UNION ALL unless you actually need the dedupe.',
    code: `-- UNION removes duplicates (implies a sort/hash — expensive)
SELECT name FROM employees
UNION
SELECT name FROM contractors;

-- UNION ALL keeps everything — always faster, usually what you want
SELECT name, 'employee' AS kind FROM employees
UNION ALL
SELECT name, 'contractor'      FROM contractors;

-- Rules: same column COUNT, compatible types, positional matching (names
-- come from the FIRST branch). ORDER BY applies to the whole result and
-- goes at the very end.
SELECT id, name FROM a
UNION ALL
SELECT id, name FROM b
ORDER BY name
LIMIT 10;

-- To order/limit a single branch, parenthesise it
(SELECT * FROM a ORDER BY id LIMIT 5)
UNION ALL
(SELECT * FROM b ORDER BY id LIMIT 5);

INTERSECT       -- rows in BOTH (deduped);  INTERSECT ALL keeps multiplicity
EXCEPT          -- rows in the first, not the second (MINUS in Oracle)

SELECT id FROM active_users
EXCEPT
SELECT id FROM banned_users;

-- Precedence: INTERSECT binds tighter than UNION/EXCEPT. Parenthesise when mixing.

-- Diffing two tables in both directions
(SELECT * FROM snapshot_a EXCEPT SELECT * FROM snapshot_b)
UNION ALL
(SELECT * FROM snapshot_b EXCEPT SELECT * FROM snapshot_a);

-- VALUES as an inline table
SELECT * FROM (VALUES (1, 'a'), (2, 'b')) AS t(id, label);

-- UNION ALL + GROUP BY is often a cleaner alternative to FULL OUTER JOIN
SELECT id, SUM(amount) FROM (
  SELECT id,  amount FROM debits
  UNION ALL
  SELECT id, -amount FROM credits
) t GROUP BY id;`,
  },
  {
    title: '16 · CASE, COALESCE & Conditional Logic',
    language: 'sql',
    description: 'CASE is an expression, so it works anywhere a value works — select list, WHERE, ORDER BY, GROUP BY, and inside aggregates.',
    code: `-- Searched CASE (any condition)
SELECT name,
       CASE WHEN salary >= 150000 THEN 'senior'
            WHEN salary >=  90000 THEN 'mid'
            ELSE                       'junior'      -- omitted ELSE yields NULL
       END AS band
FROM   employees;

-- Simple CASE (equality against one expression) — cannot test NULL
CASE role WHEN 'eng' THEN 1 WHEN 'sre' THEN 2 ELSE 9 END

-- Conditional aggregation (the portable pivot)
SELECT dept_id,
       SUM(CASE WHEN role = 'eng' THEN 1 ELSE 0 END) AS engineers,
       AVG(CASE WHEN active THEN salary END)         AS active_avg  -- NULLs skipped
FROM   employees GROUP BY dept_id;

-- CASE in ORDER BY for custom ordering
ORDER BY CASE status WHEN 'urgent' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, created_at

-- CASE in UPDATE
UPDATE employees SET salary = CASE WHEN role = 'eng' THEN salary * 1.10
                                   ELSE salary * 1.03 END;

-- NULL helpers
COALESCE(nickname, first_name, 'unknown')   -- first non-NULL, any arity (ANSI)
NULLIF(a, b)                                -- NULL if a = b
total / NULLIF(divisor, 0)                  -- division-by-zero guard -> NULL
COALESCE(total / NULLIF(divisor, 0), 0)     -- ...and back to 0

GREATEST(a, b, c)   /  LEAST(a, b, c)       -- PostgreSQL, MySQL, Oracle
-- SQL Server 2022+ has them; before that use a CASE or VALUES trick.

-- Boolean output
SELECT (salary > 100000) AS is_high FROM employees;          -- PostgreSQL
SELECT CASE WHEN salary > 100000 THEN 1 ELSE 0 END           -- portable
SELECT IIF(salary > 100000, 1, 0)                            -- SQL Server, MySQL 8

-- CASE evaluates in order and short-circuits, so put the cheap/likely
-- conditions first, and order matters when conditions overlap.`,
  },
  {
    title: '17 · String Functions',
    language: 'sql',
    description: 'String functions are the least portable part of SQL. Concatenation in particular differs in all four major dialects.',
    code: `-- CONCATENATION
'a' || 'b'                     -- ANSI, PostgreSQL, SQLite, Oracle
CONCAT('a', 'b')               -- MySQL, SQL Server 2012+, PostgreSQL
CONCAT_WS('-', a, b, c)        -- with separator; SKIPS NULLs
'a' + 'b'                      -- SQL Server only
-- CAUTION: in ANSI, 'a' || NULL IS NULL. CONCAT() treats NULL as '' in MySQL.

LENGTH(s)          -- characters (PostgreSQL, MySQL, SQLite, Oracle)
LEN(s)             -- SQL Server; note it IGNORES trailing spaces
OCTET_LENGTH(s)    -- bytes

UPPER(s), LOWER(s), INITCAP(s)          -- INITCAP: PostgreSQL/Oracle
TRIM(s), LTRIM(s), RTRIM(s)
TRIM(BOTH 'x' FROM s)                   -- strip a specific character
LPAD(s, 5, '0'), RPAD(s, 5, ' ')        -- SQL Server: no native LPAD

SUBSTRING(s FROM 2 FOR 3)               -- ANSI
SUBSTRING(s, 2, 3)                      -- most dialects
LEFT(s, 3), RIGHT(s, 3)
POSITION('x' IN s)                      -- ANSI; 0 when absent
STRPOS(s, 'x')                          -- PostgreSQL
INSTR(s, 'x')                           -- MySQL, SQLite, Oracle
CHARINDEX('x', s)                       -- SQL Server
-- All are 1-INDEXED, not 0-indexed.

REPLACE(s, 'old', 'new')
REVERSE(s), REPEAT(s, 3)
SPLIT_PART(s, ',', 2)                   -- PostgreSQL, nth field
STRING_TO_ARRAY(s, ',')                 -- PostgreSQL
REGEXP_REPLACE(s, '[0-9]+', '#', 'g')   -- PostgreSQL/MySQL 8/Oracle

-- Case-insensitive matching without breaking the index:
WHERE LOWER(email) = LOWER(:input)      -- needs an index ON LOWER(email)
WHERE email ILIKE :input                -- PostgreSQL
-- ...or store a normalised column and index that.

-- Padded / formatted output
TO_CHAR(1234.5, 'FM9,999.00')           -- PostgreSQL, Oracle
FORMAT(1234.5, 2)                       -- MySQL`,
  },
  {
    title: '18 · Dates, Times & Intervals',
    language: 'sql',
    description: 'Store UTC with a timezone-aware type, convert at the edges. Wrapping a date column in a function is also the most common way to disable an index.',
    code: `CURRENT_DATE, CURRENT_TIME, CURRENT_TIMESTAMP     -- ANSI
NOW()                        -- PostgreSQL, MySQL
GETDATE(), SYSDATETIME()     -- SQL Server
DATE('now')                  -- SQLite

-- TYPES: DATE | TIME | TIMESTAMP | TIMESTAMPTZ (store UTC, convert on read)
CAST('2026-08-14' AS DATE)
'2026-08-14'::date                          -- PostgreSQL shorthand

-- ARITHMETIC
CURRENT_DATE + INTERVAL '7 days'            -- PostgreSQL, ANSI
DATE_ADD(d, INTERVAL 7 DAY)                 -- MySQL
DATEADD(day, 7, d)                          -- SQL Server
d1 - d2                                     -- PostgreSQL: an interval
DATEDIFF(d1, d2)                            -- MySQL: days
DATEDIFF(day, d2, d1)                       -- SQL Server: note the arg order
AGE(d1, d2)                                 -- PostgreSQL: years/months/days

-- TRUNCATION & EXTRACTION
DATE_TRUNC('month', ts)                     -- PostgreSQL -> first of the month
EXTRACT(YEAR FROM ts)                       -- ANSI
EXTRACT(DOW  FROM ts)                       -- day of week (PG: 0 = Sunday)
DATE_FORMAT(ts, '%Y-%m')                    -- MySQL
FORMAT(ts, 'yyyy-MM')                       -- SQL Server
TO_CHAR(ts, 'YYYY-MM')                      -- PostgreSQL, Oracle

-- MONTHLY ROLLUP
SELECT DATE_TRUNC('month', created_at) AS month, COUNT(*)
FROM   orders GROUP BY 1 ORDER BY 1;

-- SARGABILITY: never wrap the indexed column in a function
WHERE EXTRACT(YEAR FROM created_at) = 2026     -- index UNUSED, full scan
WHERE created_at >= '2026-01-01'
  AND created_at <  '2027-01-01'               -- index used
-- (Or create an expression index on the function you must use.)

-- TIMEZONES
ts AT TIME ZONE 'UTC'                             -- ANSI / PostgreSQL
CONVERT_TZ(ts, '+00:00', '+05:30')                -- MySQL
-- Store TIMESTAMPTZ (UTC internally); convert only for display. Storing local
-- time loses the offset and breaks across DST.

-- Half-open ranges avoid every boundary bug
WHERE ts >= :start AND ts < :end`,
  },

  // ─────────────────────────────────────────────────────────────
  // DML / DDL
  // ─────────────────────────────────────────────────────────────
  {
    title: '19 · INSERT, UPDATE, DELETE',
    language: 'sql',
    description: 'Always run the SELECT form of the WHERE clause before an UPDATE or DELETE. A missing WHERE rewrites the whole table, and there is no undo outside a transaction.',
    code: `-- INSERT
INSERT INTO employees (name, dept_id, salary) VALUES ('Ada', 3, 120000);
INSERT INTO employees (name, dept_id) VALUES ('Ada', 3), ('Bob', 4);   -- multi-row
INSERT INTO archive SELECT * FROM employees WHERE left_at IS NOT NULL; -- from query
INSERT INTO employees (name) VALUES ('Ada') RETURNING id;     -- PG, SQLite 3.35+
-- SQL Server: OUTPUT INSERTED.id

-- UPDATE
UPDATE employees SET salary = salary * 1.10 WHERE dept_id = 3;
UPDATE employees SET salary = 1, role = 'x' WHERE id = 7;      -- multiple columns

-- UPDATE from another table
UPDATE employees e                                  -- PostgreSQL
SET    dept_name = d.name
FROM   departments d
WHERE  d.id = e.dept_id;

UPDATE e SET e.dept_name = d.name                   -- SQL Server
FROM employees e JOIN departments d ON d.id = e.dept_id;

UPDATE employees e JOIN departments d ON d.id = e.dept_id      -- MySQL
SET    e.dept_name = d.name;

-- DELETE
DELETE FROM employees WHERE id = 7;
DELETE FROM employees;              -- every row, logged, transactional, slow
TRUNCATE TABLE employees;           -- every row, fast, resets identity,
                                    -- usually NOT rollback-able, needs no WHERE

-- DELETE with a join
DELETE FROM employees e                             -- PostgreSQL
USING departments d
WHERE d.id = e.dept_id AND d.closed;

-- SAFETY DRILL
BEGIN;
  SELECT COUNT(*) FROM employees WHERE dept_id = 3;   -- 1. preview the blast radius
  UPDATE employees SET salary = salary * 1.10 WHERE dept_id = 3;
  -- 2. check the reported row count matches
ROLLBACK;   -- or COMMIT
-- MySQL CLI: SET SQL_SAFE_UPDATES = 1 refuses UPDATE/DELETE without a key.

-- Batch large deletes so you do not hold a huge transaction / lock
DELETE FROM events WHERE created_at < '2025-01-01' LIMIT 10000;   -- repeat`,
  },
  {
    title: '20 · UPSERT & MERGE',
    language: 'sql',
    description: 'Insert-or-update in one atomic statement. Doing it as SELECT-then-INSERT races under concurrency and produces duplicate-key errors.',
    code: `-- PostgreSQL / SQLite — ON CONFLICT
INSERT INTO counters (key, hits) VALUES ('home', 1)
ON CONFLICT (key) DO UPDATE
SET hits = counters.hits + EXCLUDED.hits;       -- EXCLUDED = the proposed row

INSERT INTO users (email, name) VALUES ('a@b.c', 'Ada')
ON CONFLICT (email) DO NOTHING;                 -- ignore duplicates

-- Conditional upsert
ON CONFLICT (key) DO UPDATE SET v = EXCLUDED.v WHERE counters.v < EXCLUDED.v;

-- MySQL
INSERT INTO counters (key, hits) VALUES ('home', 1)
ON DUPLICATE KEY UPDATE hits = hits + VALUES(hits);
-- MySQL 8.0.20+ prefers the alias form:
INSERT INTO counters (key, hits) VALUES ('home', 1) AS new
ON DUPLICATE KEY UPDATE hits = counters.hits + new.hits;

INSERT IGNORE INTO users (email) VALUES ('a@b.c');    -- swallows ALL errors, blunt
REPLACE INTO users (id, email) VALUES (1, 'a@b.c');   -- DELETE + INSERT:
                                                      -- loses other columns and
                                                      -- fires FK cascades

-- ANSI / SQL Server / Oracle — MERGE (PostgreSQL 15+ also has it)
MERGE INTO counters AS t
USING (VALUES ('home', 1)) AS s(key, hits) ON t.key = s.key
WHEN MATCHED     THEN UPDATE SET hits = t.hits + s.hits
WHEN NOT MATCHED THEN INSERT (key, hits) VALUES (s.key, s.hits);
-- SQL Server MERGE has documented concurrency bugs; many teams use
-- an explicit UPDATE-then-INSERT inside a transaction with HOLDLOCK instead.

-- An upsert requires a UNIQUE or PRIMARY KEY constraint on the conflict
-- target — without one there is nothing to detect the conflict against.

-- Bulk upsert from a staging table
INSERT INTO target (id, v)
SELECT id, v FROM staging
ON CONFLICT (id) DO UPDATE SET v = EXCLUDED.v;`,
  },
  {
    title: '21 · DDL, Constraints & Types',
    language: 'sql',
    description: 'Constraints are the cheapest correctness guarantee you can buy — the database enforces them for every writer, including the ad-hoc script nobody reviewed.',
    code: `CREATE TABLE employees (
    id          BIGSERIAL PRIMARY KEY,             -- PG; MySQL: BIGINT AUTO_INCREMENT
                                                   -- ANSI: GENERATED ALWAYS AS IDENTITY
    email       VARCHAR(255) NOT NULL UNIQUE,
    name        TEXT         NOT NULL,
    dept_id     INT          REFERENCES departments(id) ON DELETE SET NULL,
    salary      NUMERIC(12,2) NOT NULL CHECK (salary >= 0),
    role        VARCHAR(20)  NOT NULL DEFAULT 'eng',
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    metadata    JSONB,                             -- PG; MySQL: JSON
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_name_dept UNIQUE (name, dept_id),
    CONSTRAINT ck_role CHECK (role IN ('eng','sre','pm'))
);

-- FK referential actions: NO ACTION (default) | RESTRICT | CASCADE
--                         SET NULL | SET DEFAULT
-- ON DELETE CASCADE is convenient and dangerous: deleting one parent row can
-- silently delete millions of children.

ALTER TABLE employees ADD COLUMN manager_id INT;
ALTER TABLE employees DROP COLUMN manager_id;
ALTER TABLE employees ALTER COLUMN salary TYPE NUMERIC(14,2);   -- PG
ALTER TABLE employees ADD CONSTRAINT fk_mgr FOREIGN KEY (manager_id)
      REFERENCES employees(id);
ALTER TABLE employees RENAME COLUMN name TO full_name;
DROP TABLE IF EXISTS employees CASCADE;

-- TYPES worth knowing
--   INT / BIGINT            use BIGINT for anything that can grow
--   NUMERIC(p,s) / DECIMAL  EXACT — the only correct choice for money
--   REAL / DOUBLE           binary float; NEVER use for money
--   VARCHAR(n) / TEXT       in PostgreSQL these perform identically
--   BOOLEAN                 MySQL aliases it to TINYINT(1)
--   TIMESTAMPTZ             store UTC; TIMESTAMP has no offset
--   UUID                    random PKs hurt B-tree locality; consider UUIDv7
--   JSONB / JSON            JSONB is binary + indexable (PostgreSQL)
--   ARRAY, ENUM             PostgreSQL; ENUM changes need a migration

CREATE VIEW active_employees AS SELECT * FROM employees WHERE active;
CREATE MATERIALIZED VIEW dept_totals AS SELECT ... ;   -- PG; REFRESH to update

-- Adding a NOT NULL column with a default rewrites the table on old versions.
-- PostgreSQL 11+ and MySQL 8 do it instantly via metadata only.`,
  },
  {
    title: '22 · Transactions & Isolation Levels',
    language: 'sql',
    description: 'The isolation level decides which anomalies you can observe. The default is READ COMMITTED in PostgreSQL/SQL Server but REPEATABLE READ in MySQL/InnoDB.',
    code: `BEGIN;                              -- or START TRANSACTION
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;                             -- or ROLLBACK

SAVEPOINT sp1;
  -- ...
ROLLBACK TO SAVEPOINT sp1;          -- partial undo, transaction stays open
RELEASE SAVEPOINT sp1;

-- ACID: Atomicity, Consistency, Isolation, Durability

-- ANOMALIES BY LEVEL
-- LEVEL             dirty read  non-repeatable read  phantom read
-- READ UNCOMMITTED  possible    possible             possible
-- READ COMMITTED    no          possible             possible
-- REPEATABLE READ   no          no                   possible*
-- SERIALIZABLE      no          no                   no
-- * InnoDB's REPEATABLE READ blocks phantoms too, via next-key locks.
--   PostgreSQL's REPEATABLE READ is snapshot isolation (no phantoms either).

SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN ISOLATION LEVEL REPEATABLE READ;      -- PostgreSQL

-- Defaults: PostgreSQL & SQL Server = READ COMMITTED; MySQL/InnoDB =
-- REPEATABLE READ; Oracle = READ COMMITTED (never allows dirty reads).

-- LOST UPDATE — read-modify-write across two transactions
--   T1 reads 100, T2 reads 100, both write 110. One update vanishes.
-- Fix 1: do the arithmetic in the database
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- Fix 2: pessimistic lock
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;        -- blocks writers
SELECT ... FOR UPDATE SKIP LOCKED;                            -- queue workers
SELECT ... FOR UPDATE NOWAIT;                                 -- fail fast
SELECT ... FOR SHARE;                                         -- read lock
-- Fix 3: optimistic locking with a version column
UPDATE accounts SET balance = :new, version = version + 1
WHERE id = 1 AND version = :seen;      -- 0 rows affected => retry

-- DEADLOCKS: two transactions lock the same rows in opposite order. The engine
-- kills one; your app MUST catch the error and retry. Prevent by always
-- acquiring locks in a consistent order (e.g. ascending primary key).

-- Keep transactions SHORT. Never hold one open across a network call or
-- user think-time — it pins locks and blocks vacuum/purge.`,
  },

  // ─────────────────────────────────────────────────────────────
  // Performance
  // ─────────────────────────────────────────────────────────────
  {
    title: '23 · Indexes: How They Work',
    language: 'sql',
    description: 'A B-tree index is a sorted structure, so it can only be used from the leftmost column onward. That single rule explains most "why is my index ignored" questions.',
    code: `CREATE INDEX idx_emp_dept ON employees (dept_id);
CREATE UNIQUE INDEX idx_emp_email ON employees (email);
CREATE INDEX idx_emp_dept_salary ON employees (dept_id, salary DESC);
DROP INDEX idx_emp_dept;
CREATE INDEX CONCURRENTLY idx_x ON t (c);      -- PG: no write lock, slower

-- LEFTMOST PREFIX RULE for a composite index on (a, b, c):
--   WHERE a = ?                      USES it
--   WHERE a = ? AND b = ?            USES it
--   WHERE a = ? AND b = ? AND c = ?  USES it
--   WHERE b = ?                      does NOT (no leading column)
--   WHERE a = ? AND c = ?            uses only the 'a' part
-- Column order matters: put equality predicates first, then range, then sort.

-- COVERING INDEX — every column the query needs is in the index, so the
-- engine never touches the table ("index-only scan")
CREATE INDEX idx_cover ON employees (dept_id) INCLUDE (name, salary);  -- PG 11+
CREATE INDEX idx_cover ON employees (dept_id, name, salary);           -- portable

-- PARTIAL / FILTERED INDEX — smaller, cheaper, targeted
CREATE INDEX idx_active ON employees (dept_id) WHERE active;           -- PG/SQLite
CREATE INDEX idx_active ON employees (dept_id) WHERE active = 1;       -- SQL Server

-- EXPRESSION INDEX — required when you must wrap the column in a function
CREATE INDEX idx_lower_email ON employees (LOWER(email));
-- ...then WHERE LOWER(email) = ? becomes sargable.

-- INDEX TYPES (PostgreSQL): B-tree (default, = < > BETWEEN ORDER BY),
--   Hash (= only), GIN (jsonb, arrays, full-text), GiST (geometric/ranges),
--   BRIN (huge, naturally-ordered tables — tiny index, cheap scans)

-- COSTS: every index slows INSERT/UPDATE/DELETE and consumes space.
-- Index for the queries you actually run; drop unused ones.
SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;   -- PG: unused indexes

-- The PRIMARY KEY is automatically indexed. In MySQL/InnoDB it is the
-- CLUSTERED index, so the table is physically stored in PK order and every
-- secondary index stores the PK as its pointer — keep the PK narrow.`,
  },
  {
    title: '24 · EXPLAIN & Reading Query Plans',
    language: 'sql',
    description: 'EXPLAIN shows the planned path; EXPLAIN ANALYZE actually runs it and gives real timings. Compare estimated vs actual rows — a large gap means stale statistics.',
    code: `EXPLAIN SELECT * FROM employees WHERE dept_id = 3;
EXPLAIN ANALYZE SELECT ...;                       -- PostgreSQL/MySQL 8: EXECUTES it
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...;   -- PostgreSQL, most useful
EXPLAIN FORMAT=JSON SELECT ...;                   -- MySQL
SET STATISTICS IO, TIME ON;                       -- SQL Server

-- SCAN NODES, cheapest to most expensive for a selective query
--   Index Only Scan   index satisfies the query outright — best
--   Index Scan        index lookup, then a heap fetch per row
--   Bitmap Heap Scan  many matches; batches the heap fetches
--   Seq / Full Scan   reads the whole table. FINE for small tables or when
--                     returning a large fraction of rows; bad on a big table
--                     with a selective predicate.

-- JOIN NODES
--   Nested Loop    good when the outer side is tiny and the inner is indexed
--   Hash Join      good for large unsorted inputs; builds a hash of one side
--   Merge Join     good when both inputs are already sorted on the join key

-- WHAT TO LOOK FOR
--   1. rows=1000 (actual rows=1000000)  -> stale stats; run ANALYZE
--   2. Seq Scan on a large table with a selective WHERE -> missing index
--   3. Rows Removed by Filter: huge      -> the index is not selective enough
--   4. Nested Loop over a large outer    -> often a missing index on the inner
--   5. external merge Disk: 50MB         -> work_mem too small (sort spilled)
--   6. the widest actual time is your bottleneck; optimise THAT node

ANALYZE employees;              -- refresh statistics (PG)
VACUUM ANALYZE employees;       -- also reclaim dead tuples
ANALYZE TABLE employees;        -- MySQL

-- SARGABLE ("Search ARGument ABLE") — a predicate an index can serve
WHERE created_at >= '2026-01-01'          -- sargable
WHERE YEAR(created_at) = 2026             -- NOT: function on the column
WHERE salary * 12 > 100000                -- NOT: arithmetic on the column
WHERE salary > 100000 / 12                -- sargable: move maths to the constant
WHERE name LIKE 'Ada%'                    -- sargable (prefix)
WHERE name LIKE '%Ada'                    -- NOT: leading wildcard
WHERE CAST(id AS TEXT) = '5'              -- NOT: implicit/explicit cast on column
-- An implicit type mismatch (int column vs string parameter) silently
-- disables the index — check your ORM's parameter types.`,
  },
  {
    title: '25 · Performance Checklist',
    language: 'sql',
    description: 'Work top down: fix what the plan says is expensive, and measure after each change. Most "slow SQL" is one missing index or one accidental N+1.',
    code: `-- 1. MEASURE FIRST
EXPLAIN ANALYZE <the actual query with the actual parameters>;
-- Find the slowest node. Optimise that, not what you assume is slow.

-- 2. INDEXES
--   [ ] Is there an index on every WHERE / JOIN / ORDER BY column?
--   [ ] Composite index column order: equality, then range, then sort
--   [ ] Are the predicates sargable? (no functions or maths on the column)
--   [ ] Would a covering index avoid the heap fetch entirely?
--   [ ] Any unused indexes slowing down writes?

-- 3. QUERY SHAPE
--   [ ] SELECT only the columns you use — SELECT * defeats covering indexes
--   [ ] UNION ALL instead of UNION when duplicates are impossible
--   [ ] EXISTS instead of IN for correlated existence checks
--   [ ] Filter early: push predicates into the CTE/subquery, not after it
--   [ ] Window function instead of a correlated subquery per row
--   [ ] Keyset pagination instead of a large OFFSET

-- 4. N+1 QUERIES (the most common application-side killer)
--   1 query for the list + 1 per row = 1001 round trips.
--   Fix with a single JOIN, or one IN (...) batch:
SELECT * FROM orders WHERE user_id IN (1, 2, 3, ... );

-- 5. DATA VOLUME
--   [ ] Aggregate in SQL, not in application code
--   [ ] LIMIT what you return; do not ship 1M rows to filter client-side
--   [ ] Batch writes; one INSERT with 1000 rows beats 1000 INSERTs
--   [ ] Consider partitioning very large tables by time
--   [ ] Materialised view / summary table for expensive repeated aggregates

-- 6. STATISTICS & MAINTENANCE
ANALYZE;                      -- refresh planner statistics
--   [ ] Table bloat / dead tuples (PostgreSQL autovacuum keeping up?)

-- 7. FIND THE SLOW QUERIES
SELECT query, calls, mean_exec_time, total_exec_time
FROM   pg_stat_statements ORDER BY total_exec_time DESC LIMIT 20;   -- PostgreSQL
SELECT * FROM sys.x$statement_analysis LIMIT 20;                    -- MySQL sys
-- Optimise by TOTAL time (calls x mean), not by the single slowest run.

-- 8. WHEN THE QUERY IS ALREADY OPTIMAL
--   Caching, read replicas, denormalisation, precomputation. In that order,
--   and only after the plan is genuinely clean.`,
  },

  // ─────────────────────────────────────────────────────────────
  // Interview patterns / reference
  // ─────────────────────────────────────────────────────────────
  {
    title: '26 · Classic Interview Queries',
    language: 'sql',
    description: 'The questions that recur across SQL screens. Each has a window-function form and a portable form for engines without window support.',
    code: `-- 1. SECOND HIGHEST SALARY (NULL when it does not exist)
SELECT MAX(salary) FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);
-- window form, and the general "Nth highest":
SELECT DISTINCT salary FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) dr FROM employees
) t WHERE dr = 2;

-- 2. TOP EARNER PER DEPARTMENT (ties included -> use RANK)
SELECT * FROM (
  SELECT e.*, RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) r
  FROM employees e
) t WHERE r = 1;

-- 3. DUPLICATE ROWS
SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;
-- ...and delete all but the oldest
DELETE FROM users WHERE id NOT IN (SELECT MIN(id) FROM users GROUP BY email);

-- 4. EMPLOYEES EARNING MORE THAN THEIR MANAGER
SELECT e.name FROM employees e
JOIN   employees m ON m.id = e.manager_id
WHERE  e.salary > m.salary;

-- 5. DEPARTMENTS WITH NO EMPLOYEES (anti-join)
SELECT d.* FROM departments d
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.dept_id = d.id);

-- 6. CUSTOMERS WHO BOUGHT *ALL* PRODUCTS (relational division)
SELECT c.id FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM products p
  WHERE NOT EXISTS (SELECT 1 FROM orders o
                    WHERE o.customer_id = c.id AND o.product_id = p.id));
-- counting form:
SELECT customer_id FROM orders GROUP BY customer_id
HAVING COUNT(DISTINCT product_id) = (SELECT COUNT(*) FROM products);

-- 7. MONTH-OVER-MONTH GROWTH
SELECT month, revenue,
       (revenue - LAG(revenue) OVER (ORDER BY month))
         / NULLIF(LAG(revenue) OVER (ORDER BY month), 0) * 100 AS pct_change
FROM monthly;

-- 8. MEDIAN (no MEDIAN in ANSI)
SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary) FROM employees;  -- PG
SELECT AVG(salary) FROM (                                   -- portable
  SELECT salary,
         ROW_NUMBER() OVER (ORDER BY salary) rn,
         COUNT(*)     OVER ()                cnt
  FROM employees
) t WHERE rn IN ((cnt+1)/2, (cnt+2)/2);

-- 9. RUNNING TOTAL / CUMULATIVE
SELECT day, SUM(amount) OVER (ORDER BY day
                              ROWS UNBOUNDED PRECEDING) AS cumulative
FROM ledger;

-- 10. PIVOT rows into columns
SELECT user_id,
       MAX(CASE WHEN key = 'city'  THEN value END) AS city,
       MAX(CASE WHEN key = 'phone' THEN value END) AS phone
FROM attributes GROUP BY user_id;`,
  },
  {
    title: '27 · Dialect Differences',
    language: 'sql',
    description: 'What changes when you switch engines. Check these before pasting a query from a blog post into a different database.',
    code: `-- FEATURE            PostgreSQL      MySQL 8         SQLite        SQL Server
-- limit              LIMIT n OFFSET  LIMIT n OFFSET  LIMIT n       TOP n / OFFSET-FETCH
-- identifier quote   "double"        back-quote/"    "double"      [brackets]
-- string concat      ||              CONCAT()        ||            +
-- case-insens. LIKE  ILIKE           LIKE (default)  LIKE          LIKE (collation)
-- auto increment     SERIAL/IDENTITY AUTO_INCREMENT  AUTOINCREMENT IDENTITY(1,1)
-- upsert             ON CONFLICT     ON DUPLICATE    ON CONFLICT   MERGE
-- returning rows     RETURNING       (none)          RETURNING     OUTPUT
-- FULL OUTER JOIN    yes             NO (emulate)    3.39+         yes
-- boolean type       real BOOLEAN    TINYINT(1)      0/1 int       BIT
-- window functions   yes             8.0+            3.25+         2012+
-- CTEs               yes             8.0+            yes           yes
-- recursive CTE      WITH RECURSIVE  WITH RECURSIVE  WITH RECURSIVE WITH (no keyword)
-- FILTER (WHERE)     yes             no (use CASE)   3.30+         no (use CASE)
-- arrays / JSON      ARRAY, JSONB    JSON            JSON1 ext     JSON functions
-- default isolation  READ COMMITTED  REPEATABLE READ SERIALIZABLE  READ COMMITTED
-- string agg         STRING_AGG      GROUP_CONCAT    GROUP_CONCAT  STRING_AGG
-- current time       NOW()           NOW()           datetime()    GETDATE()
-- date add           + INTERVAL      DATE_ADD        date(d,'+1 day') DATEADD
-- regex              ~  ~*           REGEXP          (none)        (none)
-- GREATEST/LEAST     yes             yes             yes           2022+

-- Emulate FULL OUTER JOIN on MySQL
SELECT ... FROM a LEFT JOIN b ON a.id = b.id
UNION
SELECT ... FROM a RIGHT JOIN b ON a.id = b.id;

-- MySQL: turn on strict grouping so silent wrong answers become errors
SET sql_mode = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES';

-- Type casting
CAST(x AS INTEGER)          -- ANSI, works everywhere
x::INTEGER                  -- PostgreSQL shorthand
CONVERT(INT, x)             -- SQL Server

-- INTEGER DIVISION differs and bites constantly
SELECT 3 / 2;               -- 1 in PostgreSQL/SQL Server, 1.5 in MySQL/SQLite
SELECT 3.0 / 2;             -- 1.5 everywhere — cast one side to be safe`,
  },
  {
    title: '28 · The SQL Gotcha List',
    language: 'sql',
    description: 'Failures that return a wrong answer rather than an error. Every one of these has shipped to production somewhere.',
    code: `-- 1. NULL comparisons yield UNKNOWN, and WHERE keeps only TRUE
WHERE col = NULL                 -- matches nothing;  use IS NULL

-- 2. NOT IN with a NULL in the subquery returns ZERO rows
WHERE id NOT IN (SELECT x FROM t)    -- use NOT EXISTS

-- 3. LEFT JOIN + a WHERE filter on the right table = silent INNER JOIN
LEFT JOIN o ON ... WHERE o.year = 2026    -- move the condition into ON

-- 4. COUNT(col) skips NULLs; COUNT(*) does not. AVG divides by the non-NULL
--    count, so AVG over (10, 20, NULL) is 15, not 10.

-- 5. A JOIN multiplies rows. SUM() after joining a 1:N table double-counts.
--    Aggregate in a subquery first, then join.

-- 6. BETWEEN is inclusive on both ends — wrong for timestamps.
--    Use >= start AND < end.

-- 7. DISTINCT applies to the whole select list, not just the first column.

-- 8. Integer division truncates: 3/2 = 1 in PostgreSQL. Cast one side.

-- 9. ORDER BY without a unique tiebreaker gives non-deterministic order,
--    which silently breaks LIMIT/OFFSET pagination.

-- 10. UNION deduplicates (and sorts). If you did not want that, UNION ALL.

-- 11. Functions on an indexed column disable the index (non-sargable).

-- 12. Implicit type casts also disable indexes — an int column compared to a
--     string parameter forces a scan.

-- 13. GROUP BY in MySQL without ONLY_FULL_GROUP_BY returns arbitrary values
--     for ungrouped columns. No error, just wrong data.

-- 14. UPDATE/DELETE with no WHERE hits every row. TRUNCATE cannot be rolled
--     back on most engines.

-- 15. String comparison depends on COLLATION — case and accent sensitivity
--     vary by column, not by query.

-- 16. FLOAT/REAL for money loses cents. Use NUMERIC/DECIMAL.

-- 17. LAST_VALUE without an explicit frame returns the CURRENT row.

-- 18. Correlated subqueries in SELECT run once per output row — usually
--     rewritable as a JOIN or a window function.

-- 19. ON DELETE CASCADE can delete far more than you intended, transitively.

-- 20. A UNIQUE constraint permits MULTIPLE NULLs (they are not equal to each
--     other), so it does not prevent duplicate "empty" values.`,
  },
];
