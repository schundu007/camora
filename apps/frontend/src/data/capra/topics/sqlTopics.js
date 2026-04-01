// SQL interview topics covering fundamentals, advanced concepts, and interview problems

export const sqlCategories = [
  { id: 'fundamentals', name: 'SQL Fundamentals', icon: 'database', color: '#3b82f6' },
  { id: 'advanced', name: 'Advanced SQL', icon: 'zap', color: '#8b5cf6' },
  { id: 'interview', name: 'Interview Problems', icon: 'target', color: '#10b981' },
];

export const sqlCategoryMap = {
  'sql-fundamentals': 'fundamentals',
  'sql-joins': 'fundamentals',
  'sql-subqueries': 'advanced',
  'sql-window-functions': 'advanced',
  'sql-set-operations': 'fundamentals',
  'sql-ddl-dml': 'fundamentals',
  'sql-interview-easy': 'interview',
  'sql-interview-hard': 'interview',
};

export const sqlTopics = [
  // ─── 1. SQL Fundamentals ─────────────────────────────────────────
  {
    id: 'sql-fundamentals',
    title: 'SQL Fundamentals',
    icon: 'database',
    color: '#3b82f6',
    questions: 8,
    description: 'Core query building blocks: SELECT, filtering, sorting, grouping, and aggregate functions.',

    introduction: `SQL Fundamentals form the backbone of every database interaction you will ever write. Mastering **SELECT**, **WHERE**, **ORDER BY**, **GROUP BY**, and **HAVING** is non-negotiable for any data role or backend engineering interview. These clauses follow a strict logical execution order that differs from the order you write them in.

**Logical Execution Order:**
FROM -> WHERE -> GROUP BY -> HAVING -> SELECT -> DISTINCT -> ORDER BY -> LIMIT/OFFSET

Understanding this order explains why you cannot reference a column alias in WHERE (SELECT runs after WHERE) but you can use it in ORDER BY.

**Aggregate functions** — **COUNT**, **SUM**, **AVG**, **MAX**, **MIN** — collapse multiple rows into a single value per group. When combined with GROUP BY, they become the primary tool for summarizing data. The HAVING clause acts as a WHERE for aggregated results, filtering groups after aggregation.

\`\`\`sql
-- Find departments with more than 5 employees earning above 50K on average
SELECT department, COUNT(*) AS emp_count, AVG(salary) AS avg_salary
FROM employees
WHERE salary > 50000
GROUP BY department
HAVING COUNT(*) > 5
ORDER BY avg_salary DESC
LIMIT 10;
\`\`\`

**DISTINCT** removes duplicate rows from the result set, while **LIMIT** and **OFFSET** control pagination. Together, these building blocks let you express the vast majority of data retrieval logic.`,

    whenToUse: [
      'Retrieving specific columns or calculated values from one or more tables',
      'Filtering rows based on conditions before or after aggregation',
      'Sorting result sets by one or more columns in ascending or descending order',
      'Grouping rows to compute summary statistics per category',
      'Paginating large result sets for display in an application',
      'Eliminating duplicate rows from query output',
    ],

    keyPatterns: [
      'SELECT col1, col2 FROM table WHERE condition',
      'GROUP BY col HAVING aggregate_condition',
      'ORDER BY col ASC|DESC LIMIT n OFFSET m',
      'COUNT(*) vs COUNT(col) — COUNT(*) includes NULLs, COUNT(col) excludes them',
      'DISTINCT applies to the entire row, not just the first column',
      'COALESCE(col, default) to handle NULLs in output',
    ],

    timeComplexity: 'O(n) full scan, O(log n) with index on WHERE/ORDER BY columns',
    spaceComplexity: 'O(n) for result set, O(groups) for GROUP BY aggregation',

    approach: [
      'Identify which table(s) contain the data you need (FROM clause)',
      'Apply row-level filters in WHERE to reduce the working set early',
      'Use GROUP BY when you need per-category summaries with aggregate functions',
      'Apply HAVING to filter groups after aggregation (e.g., groups with count > threshold)',
      'Select only the columns you need in SELECT — avoid SELECT * in production',
      'Add ORDER BY for deterministic output, and LIMIT/OFFSET for pagination',
      'Test edge cases: empty tables, NULL values, groups with a single row',
    ],

    commonProblems: [
      { name: 'Recyclable and Low Fat Products', difficulty: 'Easy' },
      { name: 'Big Countries', difficulty: 'Easy' },
      { name: 'Article Views I', difficulty: 'Easy' },
      { name: 'Classes More Than 5 Students', difficulty: 'Easy' },
      { name: 'Find Customer Referee', difficulty: 'Easy' },
      { name: 'Average Selling Price', difficulty: 'Easy' },
      { name: 'Not Boring Movies', difficulty: 'Easy' },
      { name: 'Queries Quality and Percentage', difficulty: 'Easy' },
    ],

    commonMistakes: [
      'Using a column alias in WHERE — aliases are not available until SELECT executes',
      'Confusing WHERE and HAVING — WHERE filters rows before grouping, HAVING filters groups after',
      'Forgetting that COUNT(col) ignores NULLs while COUNT(*) counts all rows',
      'Using GROUP BY without including all non-aggregated SELECT columns (non-standard in strict SQL mode)',
      'Assuming ORDER BY without explicit ASC/DESC defaults to DESC (it defaults to ASC)',
      'Using OFFSET for deep pagination on large tables — this scans and discards rows and is very slow',
    ],

    tips: [
      'Memorize the logical execution order: FROM -> WHERE -> GROUP BY -> HAVING -> SELECT -> ORDER BY -> LIMIT',
      'Use COUNT(DISTINCT col) to count unique values without a subquery',
      'HAVING is the only way to filter on aggregate results — you cannot use WHERE for this',
      'For pagination at scale, use keyset pagination (WHERE id > last_seen_id) instead of OFFSET',
      'When debugging, start with SELECT * and progressively add WHERE, GROUP BY to build up the query',
    ],
  },

  // ─── 2. SQL Joins ────────────────────────────────────────────────
  {
    id: 'sql-joins',
    title: 'SQL Joins',
    icon: 'gitMerge',
    color: '#3b82f6',
    questions: 8,
    description: 'INNER, LEFT, RIGHT, FULL OUTER, SELF, and CROSS joins — combining data across tables.',

    introduction: `**Joins** are the mechanism for combining rows from two or more tables based on a related column. They are arguably the single most important SQL concept for interviews because nearly every real-world query involves multiple tables.

**The Core Join Types:**
- **INNER JOIN** returns only rows with matches in both tables. This is the default and most common join.
- **LEFT JOIN** (LEFT OUTER JOIN) returns all rows from the left table plus matching rows from the right. Non-matching right-side columns become NULL.
- **RIGHT JOIN** mirrors LEFT JOIN — all rows from the right table, NULLs for non-matching left rows.
- **FULL OUTER JOIN** returns all rows from both tables, with NULLs where there is no match on either side.
- **SELF JOIN** joins a table to itself, useful for hierarchical data or row comparisons within the same table.
- **CROSS JOIN** produces the Cartesian product — every row from table A paired with every row from table B.

\`\`\`sql
-- LEFT JOIN: all employees, including those with no department assigned
SELECT e.name, d.department_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id;

-- SELF JOIN: find employees who earn more than their manager
SELECT e.name AS employee, m.name AS manager
FROM employees e
JOIN employees m ON e.manager_id = m.id
WHERE e.salary > m.salary;
\`\`\`

**Join Optimization:** The database engine chooses between nested loop, hash join, and merge join strategies. Ensuring join columns are indexed is the single biggest performance lever. For large tables, the difference between an indexed and unindexed join can be orders of magnitude.`,

    whenToUse: [
      'Combining data from two or more related tables using foreign keys',
      'Including all records from one table regardless of whether a match exists (LEFT/RIGHT JOIN)',
      'Finding records that exist in both tables (INNER JOIN) or either table (FULL OUTER JOIN)',
      'Comparing rows within the same table, such as employee-manager hierarchies (SELF JOIN)',
      'Generating all possible combinations of rows from two tables (CROSS JOIN)',
      'Detecting orphaned records or missing relationships (LEFT JOIN + WHERE right.id IS NULL)',
    ],

    keyPatterns: [
      'INNER JOIN: SELECT ... FROM A JOIN B ON A.key = B.key',
      'LEFT JOIN with NULL check for "not in": LEFT JOIN B ON ... WHERE B.id IS NULL',
      'SELF JOIN: FROM table t1 JOIN table t2 ON t1.col = t2.col',
      'CROSS JOIN for Cartesian product: FROM A CROSS JOIN B',
      'Multi-table join chaining: A JOIN B ON ... JOIN C ON ...',
      'Join on composite keys: ON A.col1 = B.col1 AND A.col2 = B.col2',
    ],

    timeComplexity: 'O(n * m) nested loop, O(n + m) hash join, O(n log n + m log m) merge join',
    spaceComplexity: 'O(min(n, m)) for hash join build phase',

    approach: [
      'Identify the relationship between tables — what column connects them',
      'Choose the correct join type: do you need all rows from one side or only matching rows',
      'Write the ON clause carefully — incorrect join conditions produce Cartesian products or missing rows',
      'For SELF JOINs, use clear aliases (e.g., e for employee, m for manager) to avoid confusion',
      'After joining, apply WHERE to filter the combined result set',
      'Check for NULLs in the output — LEFT/RIGHT joins introduce NULLs for non-matching rows',
      'Verify your join does not inadvertently duplicate rows (many-to-many relationships)',
    ],

    commonProblems: [
      { name: 'Combine Two Tables', difficulty: 'Easy' },
      { name: 'Employees Earning More Than Their Managers', difficulty: 'Easy' },
      { name: 'Customers Who Never Order', difficulty: 'Easy' },
      { name: 'Delete Duplicate Emails', difficulty: 'Easy' },
      { name: 'Product Sales Analysis I', difficulty: 'Easy' },
      { name: 'Students and Examinations', difficulty: 'Easy' },
      { name: 'Managers with at Least 5 Direct Reports', difficulty: 'Medium' },
      { name: 'Market Analysis I', difficulty: 'Medium' },
    ],

    commonMistakes: [
      'Using INNER JOIN when a LEFT JOIN is needed, silently dropping rows without matches',
      'Forgetting to specify the ON clause, turning an INNER JOIN into a CROSS JOIN',
      'Joining on columns with different data types, causing implicit casts and missed index usage',
      'Not accounting for NULL values in join columns — NULLs never match in standard equality joins',
      'Creating accidental row duplication by joining on non-unique columns without realizing the relationship is one-to-many',
      'Placing filter conditions in ON vs WHERE without understanding the difference in outer joins',
    ],

    tips: [
      'LEFT JOIN + WHERE right.id IS NULL is the idiomatic way to find "records without a match"',
      'In outer joins, conditions in ON vs WHERE behave differently — ON filters before joining, WHERE filters after',
      'Always index your join columns for performance',
      'SELF JOINs are common in interview problems involving hierarchies, consecutive dates, or row comparisons',
      'If a join produces more rows than expected, check for many-to-many relationships in your join columns',
    ],
  },

  // ─── 3. SQL Subqueries ───────────────────────────────────────────
  {
    id: 'sql-subqueries',
    title: 'Subqueries & CTEs',
    icon: 'layers',
    color: '#8b5cf6',
    questions: 7,
    description: 'Nested queries, correlated subqueries, EXISTS, IN, Common Table Expressions, and recursive CTEs.',

    introduction: `**Subqueries** are queries nested inside another query. They allow you to break complex logic into composable steps, use the result of one query as input to another, and express conditions that reference aggregated or filtered data from the same or different tables.

**Types of Subqueries:**
- **Scalar subquery** returns a single value and can be used anywhere a literal value is expected.
- **Row subquery** returns a single row with multiple columns.
- **Table subquery** returns a full result set, used in FROM or with IN/EXISTS.
- **Correlated subquery** references columns from the outer query and re-executes for each outer row — powerful but potentially expensive.

\`\`\`sql
-- Correlated subquery: employees earning above their department average
SELECT name, salary, department_id
FROM employees e
WHERE salary > (
    SELECT AVG(salary)
    FROM employees
    WHERE department_id = e.department_id
);

-- CTE (WITH clause): same logic, more readable
WITH dept_avg AS (
    SELECT department_id, AVG(salary) AS avg_sal
    FROM employees
    GROUP BY department_id
)
SELECT e.name, e.salary, e.department_id
FROM employees e
JOIN dept_avg d ON e.department_id = d.department_id
WHERE e.salary > d.avg_sal;
\`\`\`

**Common Table Expressions (CTEs)** declared with the **WITH** clause provide named temporary result sets that exist for the duration of a single query. They improve readability and allow you to reference the same derived table multiple times. **Recursive CTEs** extend this by referencing themselves, enabling traversal of hierarchical data such as org charts or category trees.

\`\`\`sql
-- Recursive CTE: organizational hierarchy
WITH RECURSIVE org_tree AS (
    SELECT id, name, manager_id, 1 AS depth
    FROM employees WHERE manager_id IS NULL
    UNION ALL
    SELECT e.id, e.name, e.manager_id, ot.depth + 1
    FROM employees e
    JOIN org_tree ot ON e.manager_id = ot.id
)
SELECT * FROM org_tree ORDER BY depth, name;
\`\`\``,

    whenToUse: [
      'Filtering rows based on aggregated values from the same table (correlated subquery or CTE)',
      'Checking existence of related records without returning them (EXISTS is often faster than IN)',
      'Breaking a complex query into named, readable steps with CTEs',
      'Traversing hierarchical or tree-structured data with recursive CTEs',
      'Using a derived result set as a virtual table in the FROM clause',
      'Comparing each row against a computed benchmark (e.g., department average, overall max)',
    ],

    keyPatterns: [
      'Scalar subquery in SELECT: SELECT name, (SELECT MAX(salary) FROM employees) AS max_sal',
      'IN subquery: WHERE id IN (SELECT id FROM other_table WHERE condition)',
      'EXISTS subquery: WHERE EXISTS (SELECT 1 FROM other_table WHERE other.fk = main.id)',
      'CTE: WITH cte_name AS (SELECT ...) SELECT ... FROM cte_name',
      'Recursive CTE: WITH RECURSIVE cte AS (base UNION ALL recursive_step) SELECT ...',
      'Correlated subquery: inner query references outer query columns',
    ],

    timeComplexity: 'Varies: uncorrelated O(n + m), correlated O(n * m) without optimization',
    spaceComplexity: 'O(result_size) for materialized CTEs and subquery results',

    approach: [
      'Determine if the subquery needs to reference the outer query (correlated) or can run independently',
      'For existence checks, prefer EXISTS over IN — EXISTS short-circuits on the first match',
      'When the same derived table is needed multiple times, use a CTE to avoid repetition',
      'For hierarchical data, structure the recursive CTE with a clear base case and recursive step',
      'Add a depth or level counter in recursive CTEs to prevent infinite loops and aid debugging',
      'Test subqueries independently before nesting them to verify correctness at each level',
    ],

    commonProblems: [
      { name: 'Subqueries in SELECT, FROM, and WHERE', difficulty: 'Easy' },
      { name: 'Employees Earning More Than Department Average', difficulty: 'Medium' },
      { name: 'Department Highest Salary', difficulty: 'Medium' },
      { name: 'Exchange Seats', difficulty: 'Medium' },
      { name: 'Consecutive Numbers', difficulty: 'Medium' },
      { name: 'Movie Rating', difficulty: 'Medium' },
      { name: 'Restaurant Growth', difficulty: 'Medium' },
    ],

    commonMistakes: [
      'Using IN with a subquery that can return NULLs — IN returns UNKNOWN if any value is NULL, causing rows to disappear',
      'Writing correlated subqueries where a simple JOIN would perform better',
      'Forgetting the UNION ALL in recursive CTEs (UNION deduplicates and can cause infinite loops differently)',
      'Not adding a termination condition in recursive CTEs, causing runaway queries',
      'Assuming CTEs are always materialized — in many databases, CTEs are inlined and re-executed',
      'Nesting subqueries too deeply, making the query unreadable when a CTE would be clearer',
    ],

    tips: [
      'EXISTS is usually faster than IN for large subquery results because it stops at the first match',
      'NOT EXISTS is safer than NOT IN when the subquery column can contain NULLs',
      'Recursive CTEs need a clear base case (anchor) and a recursive member joined back to the CTE',
      'Most databases limit recursive CTE depth (e.g., 100 in PostgreSQL) — set MAXRECURSION if needed',
      'When a correlated subquery is slow, try rewriting it as a JOIN with a GROUP BY',
    ],
  },

  // ─── 4. SQL Window Functions ─────────────────────────────────────
  {
    id: 'sql-window-functions',
    title: 'Window Functions',
    icon: 'barChart',
    color: '#8b5cf6',
    questions: 8,
    description: 'ROW_NUMBER, RANK, DENSE_RANK, LAG, LEAD, NTILE, running totals, and moving averages with PARTITION BY.',

    introduction: `**Window functions** perform calculations across a set of rows that are related to the current row — without collapsing those rows into a single output like GROUP BY does. They are the single most powerful SQL feature for analytics and are heavily tested in interviews.

Every window function has the form:
\`\`\`
function_name(...) OVER (
    [PARTITION BY col1, col2]
    [ORDER BY col3]
    [ROWS/RANGE BETWEEN ... AND ...]
)
\`\`\`

**Ranking Functions:**
- **ROW_NUMBER()** assigns a unique sequential integer to each row within its partition. No ties — row order is arbitrary for equal values.
- **RANK()** assigns the same rank to ties but leaves gaps (1, 1, 3).
- **DENSE_RANK()** assigns the same rank to ties with no gaps (1, 1, 2).
- **NTILE(n)** divides the partition into n roughly equal buckets.

**Offset Functions:**
- **LAG(col, n)** accesses the value from the nth preceding row. Perfect for comparing current vs previous.
- **LEAD(col, n)** accesses the value from the nth following row.

**Aggregate Windows:**
Any aggregate (SUM, AVG, COUNT, MAX, MIN) can be used as a window function to compute running or sliding calculations.

\`\`\`sql
-- Running total of daily revenue
SELECT date, revenue,
       SUM(revenue) OVER (ORDER BY date) AS running_total,
       AVG(revenue) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS weekly_avg
FROM daily_sales;

-- Top 3 earners per department
SELECT * FROM (
    SELECT name, department, salary,
           DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk
    FROM employees
) ranked
WHERE rnk <= 3;
\`\`\``,

    whenToUse: [
      'Ranking rows within groups (top N per category) without collapsing the result set',
      'Comparing each row to its predecessor or successor (LAG/LEAD for period-over-period analysis)',
      'Computing running totals, cumulative sums, or moving averages',
      'Assigning percentile buckets or quartiles to rows (NTILE)',
      'Deduplicating rows by keeping the first/latest entry per group (ROW_NUMBER + filter)',
      'Any scenario where you need both detail-level rows and aggregated values in the same result',
    ],

    keyPatterns: [
      'Top N per group: ROW_NUMBER() OVER (PARTITION BY group ORDER BY metric DESC)',
      'Running total: SUM(col) OVER (ORDER BY date_col)',
      'Moving average: AVG(col) OVER (ORDER BY date_col ROWS BETWEEN n PRECEDING AND CURRENT ROW)',
      'Period comparison: LAG(col, 1) OVER (ORDER BY date_col) for previous row value',
      'Deduplication: ROW_NUMBER() OVER (PARTITION BY key ORDER BY timestamp DESC) = 1',
      'Cumulative distribution: CUME_DIST() or PERCENT_RANK() OVER (ORDER BY col)',
    ],

    timeComplexity: 'O(n log n) for sorting within partitions, O(n) for the window scan',
    spaceComplexity: 'O(n) to buffer partition data for windowed computation',

    approach: [
      'Identify whether you need ranking, offset access, or an aggregated window',
      'Determine the PARTITION BY — what defines the group for your window',
      'Set the ORDER BY within the window to control row ordering for ranking or running calculations',
      'For running totals, omit the frame specification (default is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)',
      'For moving averages, use ROWS BETWEEN n PRECEDING AND CURRENT ROW',
      'Wrap the window function in a subquery or CTE if you need to filter on the result (e.g., WHERE rnk = 1)',
    ],

    commonProblems: [
      { name: 'Rank Scores', difficulty: 'Medium' },
      { name: 'Department Top Three Salaries', difficulty: 'Hard' },
      { name: 'Nth Highest Salary', difficulty: 'Medium' },
      { name: 'Rising Temperature', difficulty: 'Easy' },
      { name: 'Game Play Analysis IV', difficulty: 'Medium' },
      { name: 'Last Person to Fit in the Bus', difficulty: 'Medium' },
      { name: 'Consecutive Numbers', difficulty: 'Medium' },
      { name: 'Find the Start and End Number of Continuous Ranges', difficulty: 'Medium' },
    ],

    commonMistakes: [
      'Trying to filter on a window function in WHERE — window functions execute after WHERE, so wrap in a subquery',
      'Confusing RANK and DENSE_RANK: RANK leaves gaps after ties (1,1,3), DENSE_RANK does not (1,1,2)',
      'Forgetting that ROW_NUMBER is non-deterministic for ties unless ORDER BY is fully deterministic',
      'Using RANGE instead of ROWS for the frame — RANGE groups equal ORDER BY values, ROWS counts physical rows',
      'Not specifying PARTITION BY when you need per-group calculations (omitting it treats all rows as one partition)',
      'Placing ORDER BY outside the OVER clause, which sorts the final output rather than the window',
    ],

    tips: [
      'ROW_NUMBER + PARTITION BY + filter is the standard pattern for deduplication and top-N queries',
      'LAG/LEAD default to NULL when there is no preceding/following row — use the third argument for a default value',
      'ROWS BETWEEN is based on physical row positions; RANGE BETWEEN is based on value ranges — use ROWS for moving averages',
      'You can use multiple window functions with different OVER clauses in the same SELECT',
      'WINDOW clause (SQL standard) lets you name a window definition and reuse it: WINDOW w AS (PARTITION BY dept ORDER BY sal)',
    ],
  },

  // ─── 5. SQL Set Operations ───────────────────────────────────────
  {
    id: 'sql-set-operations',
    title: 'Set Operations',
    icon: 'copy',
    color: '#3b82f6',
    questions: 5,
    description: 'UNION, UNION ALL, INTERSECT, and EXCEPT for combining and comparing result sets.',

    introduction: `**Set operations** combine the results of two or more SELECT statements into a single result set. They operate on complete rows and require that all participating queries produce the same number of columns with compatible data types.

**UNION** merges two result sets and removes duplicate rows. This involves an implicit DISTINCT step, which requires sorting or hashing.

**UNION ALL** merges result sets without removing duplicates. It is faster than UNION because it skips the deduplication step. Always prefer UNION ALL when you know there are no duplicates or when duplicates are acceptable.

**INTERSECT** returns only rows that appear in both result sets — the set intersection.

**EXCEPT** (called MINUS in Oracle) returns rows from the first query that do not appear in the second — the set difference.

\`\`\`sql
-- UNION ALL: combine current and archived orders
SELECT order_id, customer_id, order_date FROM current_orders
UNION ALL
SELECT order_id, customer_id, order_date FROM archived_orders;

-- EXCEPT: customers who placed orders but never left a review
SELECT customer_id FROM orders
EXCEPT
SELECT customer_id FROM reviews;

-- INTERSECT: products that are both in stock and on promotion
SELECT product_id FROM inventory WHERE quantity > 0
INTERSECT
SELECT product_id FROM promotions WHERE active = true;
\`\`\`

Set operations follow operator precedence: INTERSECT binds tighter than UNION/EXCEPT in the SQL standard (though not all databases follow this). Use parentheses to control evaluation order when mixing operations.`,

    whenToUse: [
      'Combining rows from structurally identical tables (e.g., current and archived data)',
      'Finding common rows between two queries (INTERSECT)',
      'Finding rows in one result that are absent from another (EXCEPT)',
      'Building a unified view from multiple sources with the same schema',
      'Simulating OR conditions across different tables or complex conditions',
      'Creating reference data sets by combining literal SELECT values',
    ],

    keyPatterns: [
      'UNION ALL for combining without deduplication (faster)',
      'UNION for combining with automatic deduplication',
      'EXCEPT for "in A but not in B" logic (alternative to LEFT JOIN + IS NULL)',
      'INTERSECT for "in both A and B" logic (alternative to INNER JOIN)',
      'ORDER BY applies to the final combined result — place it after the last SELECT',
      'Parentheses to control precedence when mixing UNION, INTERSECT, EXCEPT',
    ],

    timeComplexity: 'O(n + m) for UNION ALL, O((n + m) log(n + m)) for UNION due to deduplication sort',
    spaceComplexity: 'O(n + m) for the combined result set',

    approach: [
      'Verify that all SELECT statements produce the same number of columns with compatible types',
      'Choose UNION ALL over UNION unless you specifically need deduplication',
      'Column names in the result come from the first SELECT — alias them there for clarity',
      'Use EXCEPT as an alternative to LEFT JOIN + IS NULL for "not in" queries',
      'Place ORDER BY and LIMIT after the final query in the set operation',
      'Test each SELECT independently before combining to ensure correct results at each stage',
    ],

    commonProblems: [
      { name: 'Combine Two Tables', difficulty: 'Easy' },
      { name: 'Employees With Missing Information', difficulty: 'Easy' },
      { name: 'Rearrange Products Table', difficulty: 'Medium' },
      { name: 'Friend Requests: Who Has the Most Friends', difficulty: 'Medium' },
      { name: 'Get the Second Most Recent Activity', difficulty: 'Hard' },
    ],

    commonMistakes: [
      'Using UNION when UNION ALL is sufficient, incurring an unnecessary deduplication cost',
      'Mismatched column counts or incompatible types between the two SELECT statements',
      'Applying ORDER BY to an individual SELECT instead of the final combined result',
      'Assuming EXCEPT preserves duplicates — it implicitly applies DISTINCT to the result',
      'Forgetting that NULL handling in set operations follows the same rules as DISTINCT (two NULLs are considered equal)',
      'Not accounting for databases that do not support INTERSECT or EXCEPT (older MySQL versions)',
    ],

    tips: [
      'UNION ALL is almost always what you want — reach for UNION only when deduplication is intentional',
      'EXCEPT can replace LEFT JOIN + IS NULL in many cases and is often more readable',
      'You can chain multiple set operations: SELECT ... UNION ALL SELECT ... UNION ALL SELECT ...',
      'Add a source column in each SELECT to track which query produced each row: SELECT "current" AS source, ...',
      'INTERSECT on two SELECT DISTINCT queries is equivalent to an INNER JOIN on all columns',
    ],
  },

  // ─── 6. DDL & DML ────────────────────────────────────────────────
  {
    id: 'sql-ddl-dml',
    title: 'DDL & DML',
    icon: 'tool',
    color: '#3b82f6',
    questions: 6,
    description: 'Schema definition (CREATE, ALTER, DROP) and data manipulation (INSERT, UPDATE, DELETE), plus indexes and constraints.',

    introduction: `**DDL (Data Definition Language)** and **DML (Data Manipulation Language)** are the two fundamental categories of SQL statements that define your schema and modify your data.

**DDL Statements** define and modify database structure:
- **CREATE TABLE** defines a new table with columns, data types, and constraints.
- **ALTER TABLE** modifies an existing table — add/drop columns, rename, change types, add constraints.
- **DROP TABLE** permanently removes a table and all its data.

**DML Statements** modify data within tables:
- **INSERT INTO** adds new rows.
- **UPDATE** modifies existing rows matching a condition.
- **DELETE FROM** removes rows matching a condition.

**Constraints** enforce data integrity rules at the database level:
- **PRIMARY KEY** — uniquely identifies each row, implicitly NOT NULL and UNIQUE.
- **FOREIGN KEY** — ensures referential integrity between tables.
- **UNIQUE** — prevents duplicate values in a column or column combination.
- **NOT NULL** — prevents NULL values.
- **CHECK** — validates that values satisfy a boolean expression.
- **DEFAULT** — provides a value when none is specified on INSERT.

\`\`\`sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    total DECIMAL(10, 2) CHECK (total >= 0),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add an index for frequent lookups
CREATE INDEX idx_orders_customer ON orders(customer_id);

-- Composite index for queries filtering on status and date
CREATE INDEX idx_orders_status_date ON orders(status, created_at);
\`\`\`

**Indexes** are the primary tool for query performance. A **B-tree index** (the default) speeds up equality and range lookups. A **composite index** on (A, B, C) supports queries filtering on A, or A+B, or A+B+C (leftmost prefix rule), but not B alone. Understanding when to add — and when not to add — indexes is critical for system design interviews.`,

    whenToUse: [
      'Designing a database schema for a new application or feature',
      'Adding or removing columns, constraints, or indexes on existing tables',
      'Inserting new records, updating existing data, or deleting obsolete rows',
      'Enforcing data integrity through primary keys, foreign keys, and check constraints',
      'Optimizing query performance by adding targeted indexes',
      'Migrating data between schema versions in production systems',
    ],

    keyPatterns: [
      'CREATE TABLE with constraints: PRIMARY KEY, FOREIGN KEY REFERENCES, NOT NULL, UNIQUE, CHECK, DEFAULT',
      'ALTER TABLE ADD COLUMN / DROP COLUMN / ADD CONSTRAINT',
      'INSERT INTO table (cols) VALUES (vals) or INSERT INTO table SELECT ...',
      'UPDATE table SET col = val WHERE condition (always include WHERE unless you intend to update all rows)',
      'DELETE FROM table WHERE condition (always include WHERE unless you intend to delete all rows)',
      'CREATE INDEX idx_name ON table(col1, col2) for composite indexes',
    ],

    timeComplexity: 'INSERT/UPDATE/DELETE O(log n) per index maintained, CREATE INDEX O(n log n)',
    spaceComplexity: 'O(n) per index, indexes trade space for query speed',

    approach: [
      'Start schema design by identifying entities and their relationships (one-to-one, one-to-many, many-to-many)',
      'Choose appropriate data types — use the smallest type that fits your data to save space and improve cache usage',
      'Add NOT NULL constraints to columns that should always have a value',
      'Create foreign keys to enforce referential integrity, with ON DELETE CASCADE or SET NULL as appropriate',
      'Add indexes on columns used in WHERE, JOIN, ORDER BY — but not on every column, as indexes slow down writes',
      'For UPDATE and DELETE, always test your WHERE clause with a SELECT first to verify which rows will be affected',
      'Use transactions (BEGIN/COMMIT/ROLLBACK) to ensure multi-statement operations are atomic',
    ],

    commonProblems: [
      { name: 'Design a database schema for an e-commerce platform', difficulty: 'Medium' },
      { name: 'Delete Duplicate Emails', difficulty: 'Easy' },
      { name: 'Swap Salary', difficulty: 'Easy' },
      { name: 'Write an UPDATE to fix inconsistent data', difficulty: 'Easy' },
      { name: 'Design indexes for a slow query', difficulty: 'Medium' },
      { name: 'Schema migration: add a column without downtime', difficulty: 'Hard' },
    ],

    commonMistakes: [
      'Running UPDATE or DELETE without a WHERE clause, accidentally modifying or deleting all rows',
      'Adding too many indexes, which slows down INSERT/UPDATE/DELETE operations significantly',
      'Using VARCHAR(255) as a default length out of habit instead of choosing an appropriate size',
      'Forgetting ON DELETE behavior for foreign keys — the default is RESTRICT, which blocks parent deletion',
      'Not using transactions for multi-statement operations, leaving the database in an inconsistent state if one statement fails',
      'Creating an index on (A, B) and expecting it to speed up queries that only filter on B (violates leftmost prefix rule)',
    ],

    tips: [
      'Always test UPDATE/DELETE with a SELECT first to see what will be affected',
      'Composite indexes follow the leftmost prefix rule: index on (A, B, C) helps queries on A, A+B, or A+B+C',
      'Use EXPLAIN / EXPLAIN ANALYZE to verify that your indexes are actually being used',
      'For foreign keys, explicitly specify ON DELETE (CASCADE, SET NULL, or RESTRICT) — do not rely on the default',
      'Prefer adding columns as NULLable in production, then backfilling, then adding NOT NULL — this avoids locking the entire table',
    ],
  },

  // ─── 7. SQL Interview Easy ───────────────────────────────────────
  {
    id: 'sql-interview-easy',
    title: 'Interview Problems: Easy',
    icon: 'checkCircle',
    color: '#10b981',
    questions: 10,
    description: 'Common easy SQL interview problems: second highest salary, duplicate emails, customers who never order, and more.',

    introduction: `Easy SQL interview problems test your fluency with the fundamental operations. They appear frequently in phone screens and as warm-up questions in on-site interviews. While the logic is straightforward, interviewers watch for clean syntax, awareness of edge cases (especially NULLs), and the ability to write correct queries quickly without trial and error.

**Pattern: Second/Nth Highest Value**
A classic question that tests subqueries or window functions.
\`\`\`sql
-- Second highest salary (handles ties and missing values)
SELECT MAX(salary) AS SecondHighestSalary
FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);

-- Alternative using DENSE_RANK
SELECT salary AS SecondHighestSalary
FROM (
    SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
    FROM employees
) ranked
WHERE rnk = 2
LIMIT 1;
\`\`\`

**Pattern: Finding Duplicates**
GROUP BY + HAVING COUNT(*) > 1 is the standard approach.
\`\`\`sql
SELECT email FROM users GROUP BY email HAVING COUNT(*) > 1;
\`\`\`

**Pattern: Records With No Match**
LEFT JOIN + IS NULL or NOT EXISTS to find orphaned records.
\`\`\`sql
-- Customers who never placed an order
SELECT c.name
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE o.id IS NULL;
\`\`\`

**Pattern: Date Comparisons**
Self-join or LAG to compare consecutive rows.
\`\`\`sql
-- Rising temperature: days warmer than the previous day
SELECT w1.id
FROM weather w1
JOIN weather w2 ON w1.recordDate = w2.recordDate + INTERVAL '1 day'
WHERE w1.temperature > w2.temperature;
\`\`\`

These patterns recur across dozens of problems. Once you recognize the pattern, the solution is mechanical.`,

    whenToUse: [
      'Phone screens and initial interview rounds where speed and accuracy matter',
      'When the problem involves basic filtering, grouping, or simple joins',
      'Finding duplicates, missing records, or Nth-highest values',
      'Date-based comparisons within a single table',
      'Warm-up problems before more complex SQL challenges',
      'Practicing pattern recognition for rapid query writing',
    ],

    keyPatterns: [
      'Nth highest: subquery with MAX + WHERE < or DENSE_RANK window function',
      'Duplicates: GROUP BY col HAVING COUNT(*) > 1',
      'No match: LEFT JOIN + IS NULL or NOT EXISTS',
      'Date comparison: self-join on date arithmetic or LAG window function',
      'Consecutive values: self-join on id or row offset, or LAG/LEAD',
      'Conditional aggregation: SUM(CASE WHEN condition THEN 1 ELSE 0 END)',
    ],

    timeComplexity: 'Typically O(n) to O(n log n) depending on sorting/grouping',
    spaceComplexity: 'O(n) for grouping and window function buffers',

    approach: [
      'Read the problem carefully and identify which pattern it matches',
      'Determine the tables involved and how they relate',
      'Write the most straightforward solution first — do not over-engineer',
      'Handle NULL edge cases: what if there is no second highest salary? What if a column is NULL?',
      'Verify your query handles empty result sets gracefully',
      'Consider whether the problem expects unique values or allows ties',
    ],

    commonProblems: [
      { name: 'Second Highest Salary', difficulty: 'Medium' },
      { name: 'Duplicate Emails', difficulty: 'Easy' },
      { name: 'Customers Who Never Order', difficulty: 'Easy' },
      { name: 'Rising Temperature', difficulty: 'Easy' },
      { name: 'Employees Earning More Than Their Managers', difficulty: 'Easy' },
      { name: 'Delete Duplicate Emails', difficulty: 'Easy' },
      { name: 'Game Play Analysis I', difficulty: 'Easy' },
      { name: 'Customer Placing the Largest Number of Orders', difficulty: 'Easy' },
      { name: 'Biggest Single Number', difficulty: 'Easy' },
      { name: 'Immediate Food Delivery I', difficulty: 'Easy' },
    ],

    commonMistakes: [
      'Returning NULL when there is no Nth highest value — some problems require returning NULL explicitly, others do not',
      'Using LIMIT 1 OFFSET 1 for second highest without handling ties correctly',
      'Forgetting that LEFT JOIN + IS NULL checks must reference a non-nullable column from the right table (usually the primary key)',
      'Date arithmetic syntax varies between databases — DATEADD in SQL Server, INTERVAL in PostgreSQL/MySQL',
      'Not handling the case where the table is empty or has only one row',
      'Using = instead of IS NULL to check for NULLs (= NULL always evaluates to UNKNOWN)',
    ],

    tips: [
      'For "Nth highest" problems, DENSE_RANK is the cleanest approach because it handles ties automatically',
      'NOT EXISTS is generally safer than NOT IN when NULLs are possible in the subquery',
      'Self-joins on date columns often require date arithmetic — know your database date functions',
      'When deleting duplicates, keep the row with the smallest id: DELETE FROM t1 USING t1 JOIN t1 t2 ON ... WHERE t1.id > t2.id',
      'Practice writing these queries from memory — interviewers expect fluency with easy problems',
    ],
  },

  // ─── 8. SQL Interview Hard ───────────────────────────────────────
  {
    id: 'sql-interview-hard',
    title: 'Interview Problems: Hard',
    icon: 'alertTriangle',
    color: '#10b981',
    questions: 8,
    description: 'Complex SQL: department top 3 salaries, median, running totals, gaps and islands, pivot tables, hierarchical queries.',

    introduction: `Hard SQL interview problems test your ability to combine multiple techniques — window functions, CTEs, self-joins, and creative grouping — into a single coherent query. These problems appear in senior engineering, data engineering, and analytics interviews where SQL mastery is expected.

**Pattern: Top N Per Group**
Department top 3 salaries is the canonical example. Use DENSE_RANK partitioned by department, then filter.
\`\`\`sql
WITH ranked AS (
    SELECT name, department, salary,
           DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk
    FROM employees
)
SELECT department, name, salary
FROM ranked WHERE rnk <= 3;
\`\`\`

**Pattern: Median Calculation**
SQL has no built-in MEDIAN in most databases. Use ROW_NUMBER or PERCENTILE_CONT.
\`\`\`sql
-- Median using ROW_NUMBER
WITH ordered AS (
    SELECT salary,
           ROW_NUMBER() OVER (ORDER BY salary) AS rn,
           COUNT(*) OVER () AS total
    FROM employees
)
SELECT AVG(salary) AS median_salary
FROM ordered
WHERE rn IN (FLOOR((total + 1) / 2.0), CEIL((total + 1) / 2.0));
\`\`\`

**Pattern: Gaps and Islands**
Identify consecutive groups in data — for example, consecutive login days or continuous number sequences. The classic technique uses the difference between ROW_NUMBER and the value to create group identifiers.
\`\`\`sql
-- Find consecutive login streaks
WITH numbered AS (
    SELECT user_id, login_date,
           login_date - INTERVAL '1 day' * ROW_NUMBER() OVER (
               PARTITION BY user_id ORDER BY login_date
           ) AS grp
    FROM logins
)
SELECT user_id, MIN(login_date) AS streak_start,
       MAX(login_date) AS streak_end,
       COUNT(*) AS streak_length
FROM numbered
GROUP BY user_id, grp
HAVING COUNT(*) >= 3;
\`\`\`

**Pattern: Pivot Tables**
Transform rows into columns using conditional aggregation.
\`\`\`sql
SELECT product,
       SUM(CASE WHEN quarter = 'Q1' THEN revenue END) AS Q1,
       SUM(CASE WHEN quarter = 'Q2' THEN revenue END) AS Q2,
       SUM(CASE WHEN quarter = 'Q3' THEN revenue END) AS Q3,
       SUM(CASE WHEN quarter = 'Q4' THEN revenue END) AS Q4
FROM sales
GROUP BY product;
\`\`\`

**Pattern: Hierarchical Queries**
Recursive CTEs for traversing org charts, category trees, or bill-of-materials structures.

These problems require combining two or three patterns in a single query. The key to solving them is decomposing the problem into steps and building up the query incrementally, often with CTEs.`,

    whenToUse: [
      'Senior-level SQL interviews where complex analytical queries are expected',
      'Problems requiring ranking within groups combined with filtering',
      'Identifying consecutive sequences or patterns in time-series data (gaps and islands)',
      'Pivoting row-oriented data into a columnar summary',
      'Computing statistical aggregates not natively supported (median, percentiles, modes)',
      'Traversing hierarchical relationships stored in a single self-referencing table',
    ],

    keyPatterns: [
      'Top N per group: DENSE_RANK() OVER (PARTITION BY group ORDER BY metric DESC) + WHERE rnk <= N',
      'Gaps and islands: ROW_NUMBER() difference trick to group consecutive sequences',
      'Pivot: SUM(CASE WHEN category = X THEN value END) for each column',
      'Median: ROW_NUMBER + COUNT(*) OVER () with FLOOR/CEIL midpoint',
      'Running total with reset: SUM() OVER (PARTITION BY group ORDER BY col)',
      'Hierarchical traversal: WITH RECURSIVE for parent-child relationships',
    ],

    timeComplexity: 'O(n log n) for most window-based solutions due to sorting',
    spaceComplexity: 'O(n) for CTEs and window function buffers',

    approach: [
      'Break the problem into logical steps — each step can become a CTE',
      'For top-N-per-group: first rank, then filter in an outer query',
      'For gaps and islands: number the rows, compute the group key, then aggregate per group',
      'For pivoting: identify the distinct values that become columns, write a CASE for each',
      'For hierarchical queries: define the base case (root nodes) and recursive step clearly',
      'Test each CTE independently to verify intermediate results before combining',
      'Handle edge cases: empty groups, single-row groups, NULL values in ordering columns',
    ],

    commonProblems: [
      { name: 'Department Top Three Salaries', difficulty: 'Hard' },
      { name: 'Median Employee Salary', difficulty: 'Hard' },
      { name: 'Find Cumulative Salary of an Employee', difficulty: 'Hard' },
      { name: 'Consecutive Available Seats (Gaps and Islands)', difficulty: 'Medium' },
      { name: 'Trips and Users', difficulty: 'Hard' },
      { name: 'Human Traffic of Stadium (3+ Consecutive Rows)', difficulty: 'Hard' },
      { name: 'Report Contiguous Dates', difficulty: 'Hard' },
      { name: 'Leetcode Tournament Winners', difficulty: 'Hard' },
    ],

    commonMistakes: [
      'Using RANK instead of DENSE_RANK for top-N, causing gaps that skip valid entries',
      'Gaps-and-islands grouping fails when dates have duplicates — deduplicate first or use DENSE_RANK',
      'Pivot queries with NULL instead of 0 — use COALESCE if zero is more appropriate than NULL',
      'Median calculation breaks on even-count vs odd-count rows — always handle both cases',
      'Recursive CTE without a depth limit, causing infinite loops on cyclic data',
      'Forgetting that window functions cannot be nested — you need a subquery or CTE layer between them',
    ],

    tips: [
      'Build hard queries step by step with CTEs — name each intermediate result clearly',
      'For gaps and islands, the key insight is: consecutive values minus their row number yields a constant',
      'DENSE_RANK is almost always preferred over RANK for top-N because it handles ties without skipping',
      'When pivoting, the number of output columns must be known at query-writing time — dynamic pivoting requires dynamic SQL',
      'For hierarchical queries, always include a depth counter and a maximum depth to prevent runaway recursion',
    ],
  },
];
