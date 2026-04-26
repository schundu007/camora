/* ════════════════════════════════════════════════════════════════════════════
   LeetCode Top SQL 50 — Camora-authored catalog
   ════════════════════════════════════════════════════════════════════════════
   Problem statements, schemas, sample data, and reference solutions for the
   full LeetCode Top SQL 50 study plan. Authored from scratch in plain
   English — no LeetCode text reproduced verbatim — so this catalog is
   Camora's to ship, edit, and grade against.

   Categories follow LeetCode's official grouping so a learner working
   through the plan on either site sees the same progression:
     1. Select                       (5 problems)
     2. Basic Joins                  (9 problems)
     3. Basic Aggregate Functions    (8 problems)
     4. Sorting and Grouping         (7 problems)
     5. Advanced Select and Joins    (7 problems)
     6. Subqueries                   (7 problems)
     7. Advanced String + Misc       (7 problems)

   All solutions are SQLite-compatible (the in-browser sql.js runtime) so
   the editor can execute them without a server round-trip. Where a
   problem typically uses MySQL window functions or DATE_FORMAT, the
   solution uses the SQLite equivalent and a comment notes the MySQL
   variant for transferability.
   ════════════════════════════════════════════════════════════════════════════ */

import type { SqlProblem } from './sqlProblems';

/* The full Top-50 LeetCode-aligned categories — exposed alongside the
   legacy categories so the editor's filter sidebar can list both. */
export const SQL_TOP50_CATEGORIES = [
  { id: 'select',            label: 'Select' },
  { id: 'basic-joins',       label: 'Basic Joins' },
  { id: 'aggregations',      label: 'Basic Aggregate Functions' },
  { id: 'sorting-grouping',  label: 'Sorting and Grouping' },
  { id: 'advanced-select',   label: 'Advanced Select and Joins' },
  { id: 'subqueries',        label: 'Subqueries' },
  { id: 'advanced-string',   label: 'Advanced String + Misc' },
] as const;

/* Helpers — keep each problem definition compact and uniform.
   Every table needs a CREATE statement and an INSERT seed; both are
   computed here so the per-problem object only carries the data. */
function tbl(
  name: string,
  cols: { name: string; type: string }[],
  rows: (string | number | null)[][],
): { name: string; columns: string[]; rows: (string | number | null)[][]; createSql: string; insertSql: string } {
  const colNames = cols.map(c => c.name);
  const createSql = `CREATE TABLE ${name} (\n  ${cols.map(c => `${c.name} ${c.type}`).join(',\n  ')}\n);`;
  const insertSql = rows.length === 0
    ? `-- (no seed rows)`
    : `INSERT INTO ${name} (${colNames.join(', ')}) VALUES\n${rows
        .map(r => '(' + r.map(v => v === null ? 'NULL' : typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : String(v)).join(', ') + ')')
        .join(',\n')};`;
  return { name, columns: colNames, rows, createSql, insertSql };
}

/* Each problem is a SqlProblem. IDs start at 100 so they don't collide
   with the legacy ids 1-18 in sqlProblems.ts when we concat both. */
export const SQL_TOP50_PROBLEMS: SqlProblem[] = [
  // ════════════════════════════════════════════════════════════════════════
  // 1. SELECT — projection, filtering, basic predicates
  // ════════════════════════════════════════════════════════════════════════

  {
    id: 100,
    title: 'Recyclable and Low Fat Products',
    difficulty: 'Easy',
    category: 'select',
    description: `Find the **product_id** of every product that is BOTH **low fat** (\`low_fats = 'Y'\`) AND **recyclable** (\`recyclable = 'Y'\`).\n\nReturn the rows in any order.`,
    tables: [
      tbl('Products', [
        { name: 'product_id', type: 'INTEGER PRIMARY KEY' },
        { name: 'low_fats',   type: 'TEXT' },
        { name: 'recyclable', type: 'TEXT' },
      ], [
        [0, 'Y', 'N'],
        [1, 'Y', 'Y'],
        [2, 'N', 'Y'],
        [3, 'Y', 'Y'],
        [4, 'N', 'N'],
      ]),
    ],
    expectedOutput: { columns: ['product_id'], rows: [[1], [3]] },
    hints: [
      'Both columns store the literal characters Y / N — no conversion needed, just compare.',
      'A single WHERE clause with two equality checks joined by AND does the whole job.',
    ],
    solution: `SELECT product_id
FROM Products
WHERE low_fats = 'Y' AND recyclable = 'Y';`,
    starterCode: `-- Top SQL 50: Recyclable and Low Fat Products
SELECT`,
  },

  {
    id: 101,
    title: 'Find Customer Referee',
    difficulty: 'Easy',
    category: 'select',
    description: `Find the names of customers who were **NOT** referred by the customer with id = 2.\n\nNote: \`referee_id\` may be \`NULL\` (the customer was not referred by anyone). NULL must be treated as "not referred by id 2", so it should be included in the result.\n\nReturn the rows in any order.`,
    tables: [
      tbl('Customer', [
        { name: 'id',         type: 'INTEGER PRIMARY KEY' },
        { name: 'name',       type: 'TEXT' },
        { name: 'referee_id', type: 'INTEGER' },
      ], [
        [1, 'Will',  null],
        [2, 'Jane',  null],
        [3, 'Alex',  2],
        [4, 'Bill',  null],
        [5, 'Zack',  1],
        [6, 'Mark',  2],
      ]),
    ],
    expectedOutput: { columns: ['name'], rows: [['Will'], ['Jane'], ['Bill'], ['Zack']] },
    hints: [
      'NULL never equals (or not-equals) anything in SQL — `referee_id <> 2` excludes NULL rows.',
      'Use `IS NULL` as a second condition (or `IFNULL(referee_id,0) <> 2`) so NULL referees are kept.',
    ],
    solution: `SELECT name
FROM Customer
WHERE referee_id IS NULL OR referee_id <> 2;`,
    starterCode: `-- Top SQL 50: Find Customer Referee
SELECT`,
  },

  {
    id: 102,
    title: 'Big Countries',
    difficulty: 'Easy',
    category: 'select',
    description: `A country is **big** if either of:\n\n- its area is at least \`3,000,000\` km², OR\n- its population is at least \`25,000,000\`.\n\nReturn the **name**, **population**, and **area** of every big country, in any order.`,
    tables: [
      tbl('World', [
        { name: 'name',       type: 'TEXT PRIMARY KEY' },
        { name: 'continent',  type: 'TEXT' },
        { name: 'area',       type: 'INTEGER' },
        { name: 'population', type: 'INTEGER' },
        { name: 'gdp',        type: 'INTEGER' },
      ], [
        ['Afghanistan', 'Asia',    652230,   25500100,  20343000000],
        ['Albania',     'Europe',  28748,    2831741,   12960000000],
        ['Algeria',     'Africa',  2381741,  37100000,  188681000000],
        ['Andorra',     'Europe',  468,      78115,     3712000000],
        ['Angola',      'Africa',  1246700,  20609294,  100990000000],
      ]),
    ],
    expectedOutput: { columns: ['name', 'population', 'area'], rows: [['Afghanistan', 25500100, 652230], ['Algeria', 37100000, 2381741]] },
    hints: [
      'A single WHERE with OR captures the "either condition" rule.',
      'Order of columns in SELECT matters for the expected output.',
    ],
    solution: `SELECT name, population, area
FROM World
WHERE area >= 3000000 OR population >= 25000000;`,
    starterCode: `-- Top SQL 50: Big Countries
SELECT`,
  },

  {
    id: 103,
    title: 'Article Views I',
    difficulty: 'Easy',
    category: 'select',
    description: `Find every author who viewed at least one of their **own** articles.\n\nReturn the **author id** under the column name \`id\`, sorted ascending.`,
    tables: [
      tbl('Views', [
        { name: 'article_id', type: 'INTEGER' },
        { name: 'author_id',  type: 'INTEGER' },
        { name: 'viewer_id',  type: 'INTEGER' },
        { name: 'view_date',  type: 'TEXT' },
      ], [
        [1, 3, 5, '2019-08-01'],
        [1, 3, 6, '2019-08-02'],
        [2, 7, 7, '2019-08-01'],
        [2, 7, 6, '2019-08-02'],
        [4, 7, 1, '2019-07-22'],
        [3, 4, 4, '2019-07-21'],
        [3, 4, 4, '2019-07-21'],
      ]),
    ],
    expectedOutput: { columns: ['id'], rows: [[4], [7]] },
    hints: [
      'A self-view is a row where `author_id = viewer_id`.',
      'Use DISTINCT to avoid duplicate author ids when an author viewed their work multiple times.',
    ],
    solution: `SELECT DISTINCT author_id AS id
FROM Views
WHERE author_id = viewer_id
ORDER BY id;`,
    starterCode: `-- Top SQL 50: Article Views I
SELECT`,
  },

  {
    id: 104,
    title: 'Invalid Tweets',
    difficulty: 'Easy',
    category: 'select',
    description: `Find every tweet whose **content length is strictly greater than 15 characters**.\n\nReturn the **tweet_id** in any order.`,
    tables: [
      tbl('Tweets', [
        { name: 'tweet_id', type: 'INTEGER PRIMARY KEY' },
        { name: 'content',  type: 'TEXT' },
      ], [
        [1, 'Vote for Biden'],
        [2, 'Let us make America great again!'],
      ]),
    ],
    expectedOutput: { columns: ['tweet_id'], rows: [[2]] },
    hints: [
      'SQLite uses LENGTH() (and CHAR_LENGTH() in MySQL) to count characters.',
      'Compare the length to 15 with > (strictly greater than).',
    ],
    solution: `SELECT tweet_id
FROM Tweets
WHERE LENGTH(content) > 15;`,
    starterCode: `-- Top SQL 50: Invalid Tweets
SELECT`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // 2. BASIC JOINS — INNER / LEFT / self-join fundamentals
  // (problems 1-9 of the plan that are NOT already in the legacy file)
  // ════════════════════════════════════════════════════════════════════════

  // (Replace Employee ID, Product Sales Analysis I, Customer Who Visited but
  //  Did Not Make Any Transactions, Rising Temperature, Average Time of
  //  Process per Machine, Employee Bonus, Students and Examinations,
  //  Managers with at Least 5, Confirmation Rate are in the legacy file
  //  ids 1-9 — already covered with the same structure.)

  // ════════════════════════════════════════════════════════════════════════
  // 3. BASIC AGGREGATE FUNCTIONS — SUM / AVG / COUNT / GROUP BY
  // (Not Boring Movies + Average Selling Price are legacy ids 11-12.)
  // ════════════════════════════════════════════════════════════════════════

  {
    id: 110,
    title: 'Project Employees I',
    difficulty: 'Easy',
    category: 'aggregations',
    description: `For each project, report the **average years of experience** of the employees on it, rounded to 2 decimal places.\n\nReturn columns \`project_id\`, \`average_years\`.`,
    tables: [
      tbl('Project', [
        { name: 'project_id',  type: 'INTEGER' },
        { name: 'employee_id', type: 'INTEGER' },
      ], [
        [1, 1], [1, 2], [1, 3], [2, 1], [2, 4],
      ]),
      tbl('Employee', [
        { name: 'employee_id', type: 'INTEGER PRIMARY KEY' },
        { name: 'name',        type: 'TEXT' },
        { name: 'experience_years', type: 'INTEGER' },
      ], [
        [1, 'Khaled',  3],
        [2, 'Ali',     2],
        [3, 'John',    1],
        [4, 'Doe',     2],
      ]),
    ],
    expectedOutput: { columns: ['project_id', 'average_years'], rows: [[1, 2.00], [2, 2.50]] },
    hints: [
      'Join Project to Employee on employee_id, then GROUP BY project_id.',
      'AVG() returns a float; ROUND(value, 2) gives the 2-decimal precision LeetCode expects.',
    ],
    solution: `SELECT p.project_id,
       ROUND(AVG(e.experience_years * 1.0), 2) AS average_years
FROM Project p
JOIN Employee e ON e.employee_id = p.employee_id
GROUP BY p.project_id;`,
    starterCode: `-- Top SQL 50: Project Employees I
SELECT`,
  },

  {
    id: 111,
    title: 'Percentage of Users Attended a Contest',
    difficulty: 'Easy',
    category: 'aggregations',
    description: `For each contest, report the **percentage of registered users who attended**, rounded to 2 decimals.\n\nReturn columns \`contest_id\`, \`percentage\`. Order by percentage DESC, contest_id ASC.`,
    tables: [
      tbl('Users', [
        { name: 'user_id',   type: 'INTEGER PRIMARY KEY' },
        { name: 'user_name', type: 'TEXT' },
      ], [
        [6,  'Alice'],
        [2,  'Bob'],
        [7,  'Alex'],
      ]),
      tbl('Register', [
        { name: 'contest_id', type: 'INTEGER' },
        { name: 'user_id',    type: 'INTEGER' },
      ], [
        [215, 6], [209, 2], [208, 2], [210, 6], [208, 6],
        [209, 7], [209, 6], [215, 7], [208, 7], [210, 2], [207, 2], [210, 7],
      ]),
    ],
    expectedOutput: { columns: ['contest_id', 'percentage'], rows: [
      [208, 100.00],
      [209, 100.00],
      [210, 100.00],
      [215, 66.67],
      [207, 33.33],
    ] },
    hints: [
      'Total users denominator: (SELECT COUNT(*) FROM Users).',
      'Numerator: COUNT(DISTINCT user_id) per contest_id.',
      'Multiply by 100.0 (not 100) to force float division.',
    ],
    solution: `SELECT contest_id,
       ROUND(COUNT(DISTINCT user_id) * 100.0 / (SELECT COUNT(*) FROM Users), 2) AS percentage
FROM Register
GROUP BY contest_id
ORDER BY percentage DESC, contest_id ASC;`,
    starterCode: `-- Top SQL 50: Percentage of Users Attended a Contest
SELECT`,
  },

  {
    id: 112,
    title: 'Queries Quality and Percentage',
    difficulty: 'Easy',
    category: 'aggregations',
    description: `For each search query name, compute:\n\n- **quality**: average of \`rating / position\` (round to 2 decimals).\n- **poor_query_percentage**: percentage of queries with \`rating < 3\` (round to 2 decimals).\n\nReturn columns \`query_name\`, \`quality\`, \`poor_query_percentage\`.`,
    tables: [
      tbl('Queries', [
        { name: 'query_name', type: 'TEXT' },
        { name: 'result',     type: 'TEXT' },
        { name: 'position',   type: 'INTEGER' },
        { name: 'rating',     type: 'INTEGER' },
      ], [
        ['Dog',   'Golden Retriever',     1, 5],
        ['Dog',   'German Shepherd',      2, 5],
        ['Dog',   'Mule',                 200, 1],
        ['Cat',   'Shirazi',              5, 2],
        ['Cat',   'Siamese',              3, 3],
        ['Cat',   'Sphynx',               7, 4],
      ]),
    ],
    expectedOutput: { columns: ['query_name', 'quality', 'poor_query_percentage'], rows: [
      ['Dog', 2.50, 33.33],
      ['Cat', 0.66, 33.33],
    ] },
    hints: [
      'AVG(rating * 1.0 / position) gives quality.',
      'AVG(CASE WHEN rating < 3 THEN 1.0 ELSE 0.0 END) * 100 is a clean way to compute the poor-query percentage.',
    ],
    solution: `SELECT query_name,
       ROUND(AVG(rating * 1.0 / position), 2) AS quality,
       ROUND(AVG(CASE WHEN rating < 3 THEN 1.0 ELSE 0.0 END) * 100, 2) AS poor_query_percentage
FROM Queries
GROUP BY query_name;`,
    starterCode: `-- Top SQL 50: Queries Quality and Percentage
SELECT`,
  },

  {
    id: 113,
    title: 'Monthly Transactions I',
    difficulty: 'Medium',
    category: 'aggregations',
    description: `For each (month, country) pair, report:\n\n- \`trans_count\`  — total number of transactions\n- \`approved_count\` — number with \`state = 'approved'\`\n- \`trans_total_amount\` — total amount of all transactions\n- \`approved_total_amount\` — total amount of approved transactions\n\nThe month should be in the format \`YYYY-MM\`. Return rows in any order.`,
    tables: [
      tbl('Transactions', [
        { name: 'id',       type: 'INTEGER PRIMARY KEY' },
        { name: 'country',  type: 'TEXT' },
        { name: 'state',    type: 'TEXT' },
        { name: 'amount',   type: 'INTEGER' },
        { name: 'trans_date', type: 'TEXT' },
      ], [
        [121, 'US',  'approved', 1000, '2018-12-18'],
        [122, 'US',  'declined', 2000, '2018-12-19'],
        [123, 'US',  'approved', 2000, '2019-01-01'],
        [124, 'DE',  'approved', 2000, '2019-01-07'],
      ]),
    ],
    expectedOutput: { columns: ['month', 'country', 'trans_count', 'approved_count', 'trans_total_amount', 'approved_total_amount'], rows: [
      ['2018-12', 'US', 2, 1, 3000, 1000],
      ['2019-01', 'US', 1, 1, 2000, 2000],
      ['2019-01', 'DE', 1, 1, 2000, 2000],
    ] },
    hints: [
      'SUBSTR(trans_date,1,7) extracts YYYY-MM in SQLite. (MySQL uses DATE_FORMAT(trans_date,"%Y-%m").)',
      'COUNT(CASE WHEN state="approved" THEN 1 END) gives approved_count without double-counting.',
      'SUM(CASE WHEN state="approved" THEN amount END) gives approved_total_amount.',
    ],
    solution: `SELECT SUBSTR(trans_date, 1, 7) AS month,
       country,
       COUNT(*) AS trans_count,
       COUNT(CASE WHEN state = 'approved' THEN 1 END) AS approved_count,
       SUM(amount) AS trans_total_amount,
       SUM(CASE WHEN state = 'approved' THEN amount ELSE 0 END) AS approved_total_amount
FROM Transactions
GROUP BY month, country;`,
    starterCode: `-- Top SQL 50: Monthly Transactions I
SELECT`,
  },

  {
    id: 114,
    title: 'Immediate Food Delivery II',
    difficulty: 'Medium',
    category: 'aggregations',
    description: `A delivery is **immediate** if \`order_date = customer_pref_delivery_date\`. For every customer, only their FIRST order counts (earliest \`order_date\`). Return the percentage of customers whose first order was immediate, rounded to 2 decimals, under the column name \`immediate_percentage\`.`,
    tables: [
      tbl('Delivery', [
        { name: 'delivery_id', type: 'INTEGER PRIMARY KEY' },
        { name: 'customer_id', type: 'INTEGER' },
        { name: 'order_date',  type: 'TEXT' },
        { name: 'customer_pref_delivery_date', type: 'TEXT' },
      ], [
        [1, 1, '2019-08-01', '2019-08-02'],
        [2, 2, '2019-08-02', '2019-08-02'],
        [3, 1, '2019-08-11', '2019-08-12'],
        [4, 3, '2019-08-24', '2019-08-24'],
        [5, 3, '2019-08-21', '2019-08-22'],
        [6, 2, '2019-08-11', '2019-08-13'],
      ]),
    ],
    expectedOutput: { columns: ['immediate_percentage'], rows: [[33.33]] },
    hints: [
      'Pick first orders with a CTE: GROUP BY customer_id and MIN(order_date).',
      'Join back to Delivery on (customer_id, order_date) so you have the row, including customer_pref_delivery_date.',
      'AVG(CASE WHEN order_date=customer_pref_delivery_date THEN 1.0 ELSE 0.0 END) * 100 gives the percentage.',
    ],
    solution: `WITH first_orders AS (
  SELECT customer_id, MIN(order_date) AS first_date
  FROM Delivery
  GROUP BY customer_id
)
SELECT ROUND(
  AVG(CASE WHEN d.order_date = d.customer_pref_delivery_date THEN 1.0 ELSE 0.0 END) * 100,
  2
) AS immediate_percentage
FROM Delivery d
JOIN first_orders f
  ON f.customer_id = d.customer_id
 AND f.first_date  = d.order_date;`,
    starterCode: `-- Top SQL 50: Immediate Food Delivery II
WITH`,
  },

  {
    id: 115,
    title: 'Game Play Analysis IV',
    difficulty: 'Medium',
    category: 'aggregations',
    description: `Compute the fraction of players who logged in **the day after** their first login. Round to 2 decimals under the column name \`fraction\`.`,
    tables: [
      tbl('Activity', [
        { name: 'player_id',     type: 'INTEGER' },
        { name: 'device_id',     type: 'INTEGER' },
        { name: 'event_date',    type: 'TEXT' },
        { name: 'games_played',  type: 'INTEGER' },
      ], [
        [1, 2, '2016-03-01', 5],
        [1, 2, '2016-03-02', 6],
        [2, 3, '2017-06-25', 1],
        [3, 1, '2016-03-02', 0],
        [3, 4, '2018-07-03', 5],
      ]),
    ],
    expectedOutput: { columns: ['fraction'], rows: [[0.33]] },
    hints: [
      'CTE: first_login per player via MIN(event_date).',
      'Self-join to Activity on player_id and event_date = DATE(first_login, "+1 day") (SQLite syntax).',
      'Divide retained-count by COUNT(DISTINCT player_id) from the CTE.',
    ],
    solution: `WITH firsts AS (
  SELECT player_id, MIN(event_date) AS first_date
  FROM Activity
  GROUP BY player_id
)
SELECT ROUND(
  COUNT(DISTINCT a.player_id) * 1.0 / (SELECT COUNT(*) FROM firsts),
  2
) AS fraction
FROM Activity a
JOIN firsts f
  ON f.player_id = a.player_id
 AND a.event_date = DATE(f.first_date, '+1 day');`,
    starterCode: `-- Top SQL 50: Game Play Analysis IV
WITH`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // 4. SORTING AND GROUPING
  // ════════════════════════════════════════════════════════════════════════

  {
    id: 120,
    title: 'Number of Unique Subjects Taught by Each Teacher',
    difficulty: 'Easy',
    category: 'sorting-grouping',
    description: `For each \`teacher_id\`, count the number of **distinct subjects** they teach. Column names: \`teacher_id\`, \`cnt\`.`,
    tables: [
      tbl('Teacher', [
        { name: 'teacher_id', type: 'INTEGER' },
        { name: 'subject_id', type: 'INTEGER' },
        { name: 'dept_id',    type: 'INTEGER' },
      ], [
        [1, 2, 3],
        [1, 2, 4],
        [1, 3, 3],
        [2, 1, 1],
        [2, 2, 1],
        [2, 3, 1],
        [2, 4, 1],
      ]),
    ],
    expectedOutput: { columns: ['teacher_id', 'cnt'], rows: [[1, 2], [2, 4]] },
    hints: ['COUNT(DISTINCT subject_id) inside a GROUP BY teacher_id is the whole solve.'],
    solution: `SELECT teacher_id, COUNT(DISTINCT subject_id) AS cnt
FROM Teacher
GROUP BY teacher_id;`,
    starterCode: `-- Top SQL 50: Unique Subjects Taught
SELECT`,
  },

  {
    id: 121,
    title: 'User Activity for the Past 30 Days I',
    difficulty: 'Easy',
    category: 'sorting-grouping',
    description: `For each day in the 30-day window ending **2019-07-27 (inclusive)**, report the number of distinct active users.\n\nReturn columns \`day\` and \`active_users\`.\n\nOnly include days that actually had activity in the input.`,
    tables: [
      tbl('Activity', [
        { name: 'user_id',     type: 'INTEGER' },
        { name: 'session_id',  type: 'INTEGER' },
        { name: 'activity_date', type: 'TEXT' },
        { name: 'activity_type', type: 'TEXT' },
      ], [
        [1, 1, '2019-07-20', 'open_session'],
        [1, 1, '2019-07-20', 'scroll_down'],
        [1, 1, '2019-07-20', 'end_session'],
        [2, 4, '2019-07-20', 'open_session'],
        [2, 4, '2019-07-21', 'send_message'],
        [2, 4, '2019-07-21', 'end_session'],
        [3, 2, '2019-07-21', 'open_session'],
        [3, 2, '2019-07-21', 'send_message'],
        [3, 2, '2019-07-21', 'end_session'],
        [4, 3, '2019-06-25', 'open_session'],
        [4, 3, '2019-06-25', 'end_session'],
      ]),
    ],
    expectedOutput: { columns: ['day', 'active_users'], rows: [
      ['2019-07-20', 2],
      ['2019-07-21', 2],
    ] },
    hints: [
      'Filter activity_date BETWEEN DATE("2019-07-27","-29 day") AND "2019-07-27" — that\'s 30 days inclusive.',
      'Group by activity_date and COUNT(DISTINCT user_id).',
    ],
    solution: `SELECT activity_date AS day,
       COUNT(DISTINCT user_id) AS active_users
FROM Activity
WHERE activity_date BETWEEN DATE('2019-07-27', '-29 day') AND '2019-07-27'
GROUP BY activity_date;`,
    starterCode: `-- Top SQL 50: User Activity Past 30 Days
SELECT`,
  },

  {
    id: 122,
    title: 'Product Sales Analysis III',
    difficulty: 'Medium',
    category: 'sorting-grouping',
    description: `For each product, report the **earliest year** it was sold and the corresponding \`quantity\` and \`price\` from that earliest sale.\n\nReturn columns \`product_id\`, \`first_year\`, \`quantity\`, \`price\`.`,
    tables: [
      tbl('Sales', [
        { name: 'sale_id',    type: 'INTEGER PRIMARY KEY' },
        { name: 'product_id', type: 'INTEGER' },
        { name: 'year',       type: 'INTEGER' },
        { name: 'quantity',   type: 'INTEGER' },
        { name: 'price',      type: 'INTEGER' },
      ], [
        [1, 100, 2008, 10, 5000],
        [2, 100, 2009, 12, 5000],
        [3, 200, 2011, 15, 9000],
      ]),
      tbl('Product', [
        { name: 'product_id',   type: 'INTEGER PRIMARY KEY' },
        { name: 'product_name', type: 'TEXT' },
      ], [
        [100, 'Nokia'],
        [200, 'Apple'],
        [300, 'Samsung'],
      ]),
    ],
    expectedOutput: { columns: ['product_id', 'first_year', 'quantity', 'price'], rows: [
      [100, 2008, 10, 5000],
      [200, 2011, 15, 9000],
    ] },
    hints: [
      'Subquery: SELECT product_id, MIN(year) AS first_year FROM Sales GROUP BY product_id.',
      'Join back to Sales on (product_id, year=first_year) so you keep that exact row\'s quantity/price.',
    ],
    solution: `SELECT s.product_id, s.year AS first_year, s.quantity, s.price
FROM Sales s
JOIN (
  SELECT product_id, MIN(year) AS first_year
  FROM Sales
  GROUP BY product_id
) f
  ON f.product_id = s.product_id
 AND f.first_year = s.year;`,
    starterCode: `-- Top SQL 50: Product Sales Analysis III
SELECT`,
  },

  {
    id: 123,
    title: 'Classes More Than 5 Students',
    difficulty: 'Easy',
    category: 'sorting-grouping',
    description: `Report each class that has at least **5 students enrolled** (count distinct students per class).\n\nReturn the \`class\` column only.`,
    tables: [
      tbl('Courses', [
        { name: 'student', type: 'TEXT' },
        { name: 'class',   type: 'TEXT' },
      ], [
        ['A', 'Math'],   ['B', 'English'], ['C', 'Math'],
        ['D', 'Biology'],['E', 'Math'],    ['F', 'Computer'],
        ['G', 'Math'],   ['H', 'Math'],    ['I', 'Math'],
      ]),
    ],
    expectedOutput: { columns: ['class'], rows: [['Math']] },
    hints: ['GROUP BY class then HAVING COUNT(DISTINCT student) >= 5.'],
    solution: `SELECT class
FROM Courses
GROUP BY class
HAVING COUNT(DISTINCT student) >= 5;`,
    starterCode: `-- Top SQL 50: Classes More Than 5 Students
SELECT`,
  },

  {
    id: 124,
    title: 'Find Followers Count',
    difficulty: 'Easy',
    category: 'sorting-grouping',
    description: `For each user, count how many followers they have. Return columns \`user_id\` and \`followers_count\`, sorted by user_id ascending.`,
    tables: [
      tbl('Followers', [
        { name: 'user_id',     type: 'INTEGER' },
        { name: 'follower_id', type: 'INTEGER' },
      ], [
        [0, 1], [1, 0], [2, 0], [2, 1],
      ]),
    ],
    expectedOutput: { columns: ['user_id', 'followers_count'], rows: [
      [0, 1],
      [1, 1],
      [2, 2],
    ] },
    hints: ['One COUNT per user_id, ORDER BY user_id.'],
    solution: `SELECT user_id, COUNT(follower_id) AS followers_count
FROM Followers
GROUP BY user_id
ORDER BY user_id;`,
    starterCode: `-- Top SQL 50: Find Followers Count
SELECT`,
  },

  {
    id: 125,
    title: 'Biggest Single Number',
    difficulty: 'Easy',
    category: 'sorting-grouping',
    description: `A **single number** appears exactly once in the table. Return the largest single number, or \`NULL\` if no single number exists. Output column name: \`num\`.`,
    tables: [
      tbl('MyNumbers', [
        { name: 'num', type: 'INTEGER' },
      ], [
        [8], [8], [3], [3], [1], [4], [5], [6],
      ]),
    ],
    expectedOutput: { columns: ['num'], rows: [[6]] },
    hints: [
      'CTE singles AS (SELECT num FROM MyNumbers GROUP BY num HAVING COUNT(*) = 1).',
      'Outer SELECT: MAX(num) FROM singles. MAX of an empty set is NULL — exactly what the prompt wants.',
    ],
    solution: `SELECT (SELECT MAX(num)
        FROM (
          SELECT num
          FROM MyNumbers
          GROUP BY num
          HAVING COUNT(*) = 1
        )
       ) AS num;`,
    starterCode: `-- Top SQL 50: Biggest Single Number
SELECT`,
  },

  {
    id: 126,
    title: 'Customers Who Bought All Products',
    difficulty: 'Medium',
    category: 'sorting-grouping',
    description: `Find every customer who has bought **every product** from the Product table.\n\nReturn the \`customer_id\` column.`,
    tables: [
      tbl('Customer', [
        { name: 'customer_id', type: 'INTEGER' },
        { name: 'product_key', type: 'INTEGER' },
      ], [
        [1, 5], [2, 6], [3, 5], [3, 6], [1, 6],
      ]),
      tbl('Product', [
        { name: 'product_key', type: 'INTEGER PRIMARY KEY' },
      ], [
        [5], [6],
      ]),
    ],
    expectedOutput: { columns: ['customer_id'], rows: [[1], [3]] },
    hints: [
      'GROUP BY customer_id and HAVING COUNT(DISTINCT product_key) = (SELECT COUNT(*) FROM Product).',
      'DISTINCT matters — a customer who bought product 5 twice and never bought 6 should not pass.',
    ],
    solution: `SELECT customer_id
FROM Customer
GROUP BY customer_id
HAVING COUNT(DISTINCT product_key) = (SELECT COUNT(*) FROM Product);`,
    starterCode: `-- Top SQL 50: Customers Who Bought All Products
SELECT`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // 5. ADVANCED SELECT AND JOINS
  // (Primary Department for Each Employee, Number of Employees Who Report,
  //  Count Salary Categories, Product Price at a Given Date, Last Person
  //  to Fit in the Bus are legacy ids 10/13-16.)
  // ════════════════════════════════════════════════════════════════════════

  {
    id: 130,
    title: 'Triangle Judgement',
    difficulty: 'Easy',
    category: 'advanced-select',
    description: `For each row of side lengths (x, y, z), output \`triangle = 'Yes'\` if the three sides can form a triangle (each side strictly less than the sum of the other two), else \`'No'\`.`,
    tables: [
      tbl('Triangle', [
        { name: 'x', type: 'INTEGER' },
        { name: 'y', type: 'INTEGER' },
        { name: 'z', type: 'INTEGER' },
      ], [
        [13, 15, 30],
        [10, 20, 15],
      ]),
    ],
    expectedOutput: { columns: ['x', 'y', 'z', 'triangle'], rows: [
      [13, 15, 30, 'No'],
      [10, 20, 15, 'Yes'],
    ] },
    hints: [
      'Triangle inequality: x+y>z AND x+z>y AND y+z>x — all three must hold.',
      'A CASE WHEN <all three> THEN "Yes" ELSE "No" END is the cleanest form.',
    ],
    solution: `SELECT x, y, z,
       CASE
         WHEN x + y > z AND x + z > y AND y + z > x THEN 'Yes'
         ELSE 'No'
       END AS triangle
FROM Triangle;`,
    starterCode: `-- Top SQL 50: Triangle Judgement
SELECT`,
  },

  {
    id: 131,
    title: 'Consecutive Numbers',
    difficulty: 'Medium',
    category: 'advanced-select',
    description: `Find every \`num\` that appears at least **three times in a row** (consecutive ids). Return distinct \`ConsecutiveNums\`.`,
    tables: [
      tbl('Logs', [
        { name: 'id',  type: 'INTEGER PRIMARY KEY' },
        { name: 'num', type: 'INTEGER' },
      ], [
        [1, 1], [2, 1], [3, 1], [4, 2], [5, 1], [6, 2], [7, 2],
      ]),
    ],
    expectedOutput: { columns: ['ConsecutiveNums'], rows: [[1]] },
    hints: [
      'Self-join three copies of Logs (l1, l2, l3) on l2.id = l1.id+1 AND l3.id = l1.id+2.',
      'Equality on num: l1.num = l2.num = l3.num.',
      'SELECT DISTINCT to dedupe when there are runs longer than 3.',
    ],
    solution: `SELECT DISTINCT l1.num AS ConsecutiveNums
FROM Logs l1
JOIN Logs l2 ON l2.id = l1.id + 1 AND l2.num = l1.num
JOIN Logs l3 ON l3.id = l1.id + 2 AND l3.num = l1.num;`,
    starterCode: `-- Top SQL 50: Consecutive Numbers
SELECT`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // 6. SUBQUERIES
  // (Department Top Three Salaries is legacy id 18.)
  // ════════════════════════════════════════════════════════════════════════

  {
    id: 140,
    title: 'Employees Whose Manager Left the Company',
    difficulty: 'Easy',
    category: 'subqueries',
    description: `Find every employee earning **less than $30000** whose manager has left the company (i.e. the \`manager_id\` does not exist in the Employees table).\n\nReturn \`employee_id\`, sorted ascending.`,
    tables: [
      tbl('Employees', [
        { name: 'employee_id', type: 'INTEGER PRIMARY KEY' },
        { name: 'name',        type: 'TEXT' },
        { name: 'manager_id',  type: 'INTEGER' },
        { name: 'salary',      type: 'INTEGER' },
      ], [
        [3,  'Mila',    9,  60301],
        [12, 'Antonella', null, 31000],
        [13, 'Emery',   null, 67084],
        [1,  'Kalel',   11, 21241],
        [9,  'Mikaela', null, 50937],
        [11, 'Joziah',  6,  28485],
      ]),
    ],
    expectedOutput: { columns: ['employee_id'], rows: [[11]] },
    hints: [
      'Filter: salary < 30000 AND manager_id IS NOT NULL AND manager_id NOT IN (SELECT employee_id FROM Employees).',
      'NOT IN with a subquery containing NULL would return no rows — guard the subquery with WHERE employee_id IS NOT NULL.',
    ],
    solution: `SELECT employee_id
FROM Employees
WHERE salary < 30000
  AND manager_id IS NOT NULL
  AND manager_id NOT IN (
    SELECT employee_id FROM Employees WHERE employee_id IS NOT NULL
  )
ORDER BY employee_id;`,
    starterCode: `-- Top SQL 50: Employees Whose Manager Left
SELECT`,
  },

  {
    id: 141,
    title: 'Exchange Seats',
    difficulty: 'Medium',
    category: 'subqueries',
    description: `Swap the seat of every two consecutive students (1↔2, 3↔4, …). If the last seat id is odd it stays in place. Return rows ordered by \`id\` with columns \`id\`, \`student\`.`,
    tables: [
      tbl('Seat', [
        { name: 'id',      type: 'INTEGER PRIMARY KEY' },
        { name: 'student', type: 'TEXT' },
      ], [
        [1, 'Abbot'],
        [2, 'Doris'],
        [3, 'Emerson'],
        [4, 'Green'],
        [5, 'Jeames'],
      ]),
    ],
    expectedOutput: { columns: ['id', 'student'], rows: [
      [1, 'Doris'],
      [2, 'Abbot'],
      [3, 'Green'],
      [4, 'Emerson'],
      [5, 'Jeames'],
    ] },
    hints: [
      'CASE on parity of id: even → id-1; odd → id+1 (or id if it is the last odd seat).',
      'Use a scalar subquery (SELECT MAX(id) FROM Seat) to detect the trailing odd id.',
    ],
    solution: `SELECT
  CASE
    WHEN id % 2 = 0 THEN id - 1
    WHEN id = (SELECT MAX(id) FROM Seat) THEN id
    ELSE id + 1
  END AS id,
  student
FROM Seat
ORDER BY id;`,
    starterCode: `-- Top SQL 50: Exchange Seats
SELECT`,
  },

  {
    id: 142,
    title: 'Movie Rating',
    difficulty: 'Medium',
    category: 'subqueries',
    description: `Two outputs in a single result set (UNION ALL):\n\n1. The **name of the user** who rated the most movies. Tie → smallest lexicographic name.\n2. The **title of the movie** with the highest average rating in **February 2020**. Tie → smallest lexicographic title.\n\nReturn one column \`results\`.`,
    tables: [
      tbl('Movies', [
        { name: 'movie_id', type: 'INTEGER PRIMARY KEY' },
        { name: 'title',    type: 'TEXT' },
      ], [
        [1, 'Avengers'],
        [2, 'Frozen 2'],
        [3, 'Joker'],
      ]),
      tbl('Users', [
        { name: 'user_id', type: 'INTEGER PRIMARY KEY' },
        { name: 'name',    type: 'TEXT' },
      ], [
        [1, 'Daniel'],
        [2, 'Monica'],
        [3, 'Maria'],
        [4, 'James'],
      ]),
      tbl('MovieRating', [
        { name: 'movie_id',    type: 'INTEGER' },
        { name: 'user_id',     type: 'INTEGER' },
        { name: 'rating',      type: 'INTEGER' },
        { name: 'created_at',  type: 'TEXT' },
      ], [
        [1, 1, 3, '2020-01-12'],
        [1, 2, 4, '2020-02-11'],
        [1, 3, 2, '2020-02-12'],
        [1, 4, 1, '2020-01-01'],
        [2, 1, 5, '2020-02-17'],
        [2, 2, 2, '2020-02-01'],
        [2, 3, 2, '2020-03-01'],
        [3, 1, 3, '2020-02-22'],
        [3, 2, 4, '2020-02-25'],
      ]),
    ],
    expectedOutput: { columns: ['results'], rows: [
      ['Daniel'],
      ['Frozen 2'],
    ] },
    hints: [
      'Two scalar subqueries combined with UNION ALL.',
      'For (1): GROUP BY user_id, ORDER BY COUNT(*) DESC, name ASC, LIMIT 1.',
      'For (2): WHERE created_at BETWEEN "2020-02-01" AND "2020-02-29", GROUP BY title, ORDER BY AVG(rating) DESC, title ASC, LIMIT 1.',
    ],
    solution: `SELECT results FROM (
  SELECT u.name AS results
  FROM MovieRating mr
  JOIN Users u ON u.user_id = mr.user_id
  GROUP BY u.user_id, u.name
  ORDER BY COUNT(*) DESC, u.name ASC
  LIMIT 1
)
UNION ALL
SELECT results FROM (
  SELECT m.title AS results
  FROM MovieRating mr
  JOIN Movies m ON m.movie_id = mr.movie_id
  WHERE mr.created_at >= '2020-02-01' AND mr.created_at < '2020-03-01'
  GROUP BY m.movie_id, m.title
  ORDER BY AVG(mr.rating * 1.0) DESC, m.title ASC
  LIMIT 1
);`,
    starterCode: `-- Top SQL 50: Movie Rating
SELECT`,
  },

  {
    id: 143,
    title: 'Restaurant Growth',
    difficulty: 'Medium',
    category: 'subqueries',
    description: `For each \`visited_on\` date, compute the **moving 7-day window** total amount and average amount, ending on (and including) that date. Skip the first 6 days (not enough history). Round average to 2 decimals. Order by visited_on.`,
    tables: [
      tbl('Customer', [
        { name: 'customer_id', type: 'INTEGER' },
        { name: 'name',        type: 'TEXT' },
        { name: 'visited_on',  type: 'TEXT' },
        { name: 'amount',      type: 'INTEGER' },
      ], [
        [1, 'Jhon',   '2019-01-01', 100],
        [2, 'Daniel', '2019-01-02', 110],
        [3, 'Jade',   '2019-01-03', 120],
        [4, 'Khaled', '2019-01-04', 130],
        [5, 'Winston','2019-01-05', 110],
        [6, 'Elvis',  '2019-01-06', 140],
        [7, 'Anna',   '2019-01-07', 150],
        [8, 'Maria',  '2019-01-08', 80],
        [9, 'Jaze',   '2019-01-09', 110],
        [1, 'Jhon',   '2019-01-10', 130],
        [3, 'Jade',   '2019-01-10', 150],
      ]),
    ],
    expectedOutput: { columns: ['visited_on', 'amount', 'average_amount'], rows: [
      ['2019-01-07',  860, 122.86],
      ['2019-01-08',  840, 120.00],
      ['2019-01-09',  840, 120.00],
      ['2019-01-10',  1000, 142.86],
    ] },
    hints: [
      'First aggregate per visited_on (multiple customers per day) into daily totals.',
      'Self-join the daily totals: t1 (anchor day) JOIN t2 ON t2.visited_on BETWEEN DATE(t1.visited_on,"-6 day") AND t1.visited_on.',
      'GROUP BY t1.visited_on, then SUM(t2.amount) and ROUND(AVG-of-7-days, 2).',
      'WHERE t1.visited_on >= DATE((SELECT MIN(visited_on) FROM …), "+6 day") drops the warmup window.',
    ],
    solution: `WITH daily AS (
  SELECT visited_on, SUM(amount) AS amt
  FROM Customer
  GROUP BY visited_on
)
SELECT t1.visited_on,
       SUM(t2.amt)                           AS amount,
       ROUND(SUM(t2.amt) * 1.0 / 7, 2)       AS average_amount
FROM daily t1
JOIN daily t2
  ON t2.visited_on BETWEEN DATE(t1.visited_on, '-6 day') AND t1.visited_on
WHERE t1.visited_on >= DATE((SELECT MIN(visited_on) FROM daily), '+6 day')
GROUP BY t1.visited_on
ORDER BY t1.visited_on;`,
    starterCode: `-- Top SQL 50: Restaurant Growth
WITH`,
  },

  {
    id: 144,
    title: 'Friend Requests II: Who Has the Most Friends',
    difficulty: 'Medium',
    category: 'subqueries',
    description: `A friendship pair (\`requester_id\`, \`accepter_id\`) means both people gain +1 friend. Return the user with the most friends and that count under columns \`id\`, \`num\`. Test data guarantees a unique winner.`,
    tables: [
      tbl('RequestAccepted', [
        { name: 'requester_id', type: 'INTEGER' },
        { name: 'accepter_id',  type: 'INTEGER' },
        { name: 'accept_date',  type: 'TEXT' },
      ], [
        [1, 2, '2016-06-03'],
        [1, 3, '2016-06-08'],
        [2, 3, '2016-06-08'],
        [3, 4, '2016-06-09'],
      ]),
    ],
    expectedOutput: { columns: ['id', 'num'], rows: [[3, 3]] },
    hints: [
      'UNION ALL the two columns into a single id list, then GROUP BY id and COUNT(*).',
      'ORDER BY count DESC LIMIT 1.',
    ],
    solution: `SELECT id, COUNT(*) AS num
FROM (
  SELECT requester_id AS id FROM RequestAccepted
  UNION ALL
  SELECT accepter_id  AS id FROM RequestAccepted
)
GROUP BY id
ORDER BY num DESC
LIMIT 1;`,
    starterCode: `-- Top SQL 50: Friend Requests II
SELECT`,
  },

  {
    id: 145,
    title: 'Investments in 2016',
    difficulty: 'Medium',
    category: 'subqueries',
    description: `Sum \`tiv_2016\` for every policyholder whose:\n\n- \`tiv_2015\` value is shared by **at least one other** policyholder, AND\n- \`(lat, lon)\` location is **unique**.\n\nReturn the sum under column name \`tiv_2016\`, rounded to 2 decimals.`,
    tables: [
      tbl('Insurance', [
        { name: 'pid',      type: 'INTEGER PRIMARY KEY' },
        { name: 'tiv_2015', type: 'REAL' },
        { name: 'tiv_2016', type: 'REAL' },
        { name: 'lat',      type: 'REAL' },
        { name: 'lon',      type: 'REAL' },
      ], [
        [1, 10, 5,  10, 10],
        [2, 20, 20, 20, 20],
        [3, 10, 30, 20, 20],
        [4, 10, 40, 40, 40],
      ]),
    ],
    expectedOutput: { columns: ['tiv_2016'], rows: [[45.00]] },
    hints: [
      'Two GROUP BY conditions enforced as scalar subquery filters in WHERE:',
      '  tiv_2015 IN (SELECT tiv_2015 FROM Insurance GROUP BY tiv_2015 HAVING COUNT(*) > 1)',
      '  (lat,lon) NOT in any other row — i.e. (SELECT COUNT(*) FROM Insurance i2 WHERE i2.lat=i.lat AND i2.lon=i.lon) = 1.',
    ],
    solution: `SELECT ROUND(SUM(tiv_2016), 2) AS tiv_2016
FROM Insurance i
WHERE tiv_2015 IN (
        SELECT tiv_2015
        FROM Insurance
        GROUP BY tiv_2015
        HAVING COUNT(*) > 1
      )
  AND (SELECT COUNT(*)
       FROM Insurance j
       WHERE j.lat = i.lat AND j.lon = i.lon) = 1;`,
    starterCode: `-- Top SQL 50: Investments in 2016
SELECT`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // 7. ADVANCED STRING + MISC — text fns, regex, dates, distinct edge cases
  // ════════════════════════════════════════════════════════════════════════

  {
    id: 150,
    title: 'Fix Names in a Table',
    difficulty: 'Easy',
    category: 'advanced-string',
    description: `Reformat each user's name so the **first letter is upper-case** and the **rest are lower-case**. Return columns \`user_id\`, \`name\`, sorted by user_id.`,
    tables: [
      tbl('Users', [
        { name: 'user_id', type: 'INTEGER PRIMARY KEY' },
        { name: 'name',    type: 'TEXT' },
      ], [
        [1, 'aLice'],
        [2, 'bOB'],
      ]),
    ],
    expectedOutput: { columns: ['user_id', 'name'], rows: [
      [1, 'Alice'],
      [2, 'Bob'],
    ] },
    hints: [
      'UPPER(SUBSTR(name,1,1)) || LOWER(SUBSTR(name,2)) is the SQLite recipe (MySQL: CONCAT(...)).',
      'ORDER BY user_id keeps the result deterministic.',
    ],
    solution: `SELECT user_id,
       UPPER(SUBSTR(name, 1, 1)) || LOWER(SUBSTR(name, 2)) AS name
FROM Users
ORDER BY user_id;`,
    starterCode: `-- Top SQL 50: Fix Names in a Table
SELECT`,
  },

  {
    id: 151,
    title: 'Patients With a Condition',
    difficulty: 'Easy',
    category: 'advanced-string',
    description: `Return every patient whose \`conditions\` field contains a token that **starts with \`DIAB1\`**. Conditions are a space-separated list — the prefix may appear at the start of any token.`,
    tables: [
      tbl('Patients', [
        { name: 'patient_id',   type: 'INTEGER PRIMARY KEY' },
        { name: 'patient_name', type: 'TEXT' },
        { name: 'conditions',   type: 'TEXT' },
      ], [
        [1, 'Daniel',  'YFEV COUGH'],
        [2, 'Alice',   ''],
        [3, 'Bob',     'DIAB100 MYOP'],
        [4, 'George',  'ACNE DIAB100'],
        [5, 'Alain',   'DIAB201'],
      ]),
    ],
    expectedOutput: { columns: ['patient_id', 'patient_name', 'conditions'], rows: [
      [3, 'Bob',    'DIAB100 MYOP'],
      [4, 'George', 'ACNE DIAB100'],
    ] },
    hints: [
      'Token starts with DIAB1 means: at the start of the string OR preceded by a space.',
      'Two LIKE checks joined by OR: conditions LIKE "DIAB1%" OR conditions LIKE "% DIAB1%".',
    ],
    solution: `SELECT patient_id, patient_name, conditions
FROM Patients
WHERE conditions LIKE 'DIAB1%'
   OR conditions LIKE '% DIAB1%';`,
    starterCode: `-- Top SQL 50: Patients With a Condition
SELECT`,
  },

  {
    id: 152,
    title: 'Delete Duplicate Emails',
    difficulty: 'Easy',
    category: 'advanced-string',
    description: `Delete every duplicate email row, keeping the row with the smallest \`id\`. After your DELETE, the table should contain one row per email, with the smallest id.\n\nThe expected output below shows the contents of \`Person\` AFTER the delete. Your submission should run a DELETE then \`SELECT id, email FROM Person ORDER BY id\`.`,
    tables: [
      tbl('Person', [
        { name: 'id',    type: 'INTEGER PRIMARY KEY' },
        { name: 'email', type: 'TEXT' },
      ], [
        [1, 'john@example.com'],
        [2, 'bob@example.com'],
        [3, 'john@example.com'],
      ]),
    ],
    expectedOutput: { columns: ['id', 'email'], rows: [
      [1, 'john@example.com'],
      [2, 'bob@example.com'],
    ] },
    hints: [
      'Self-join: DELETE FROM Person WHERE id IN (SELECT p1.id FROM Person p1 JOIN Person p2 ON p1.email=p2.email AND p1.id>p2.id).',
      'Then SELECT id, email FROM Person ORDER BY id; for the grader.',
    ],
    solution: `DELETE FROM Person
WHERE id IN (
  SELECT p1.id
  FROM Person p1
  JOIN Person p2 ON p1.email = p2.email AND p1.id > p2.id
);
SELECT id, email FROM Person ORDER BY id;`,
    starterCode: `-- Top SQL 50: Delete Duplicate Emails
DELETE FROM`,
  },

  {
    id: 153,
    title: 'Second Highest Salary',
    difficulty: 'Medium',
    category: 'advanced-string',
    description: `Return the **second-highest distinct salary** from the Employee table, or \`NULL\` if there is no second-highest. Output column name: \`SecondHighestSalary\`.`,
    tables: [
      tbl('Employee', [
        { name: 'id',     type: 'INTEGER PRIMARY KEY' },
        { name: 'salary', type: 'INTEGER' },
      ], [
        [1, 100],
        [2, 200],
        [3, 300],
      ]),
    ],
    expectedOutput: { columns: ['SecondHighestSalary'], rows: [[200]] },
    hints: [
      'Wrap the query so MAX of an empty set yields NULL.',
      'SELECT MAX(salary) FROM Employee WHERE salary < (SELECT MAX(salary) FROM Employee).',
    ],
    solution: `SELECT (
  SELECT MAX(salary)
  FROM Employee
  WHERE salary < (SELECT MAX(salary) FROM Employee)
) AS SecondHighestSalary;`,
    starterCode: `-- Top SQL 50: Second Highest Salary
SELECT`,
  },

  {
    id: 154,
    title: 'Group Sold Products By The Date',
    difficulty: 'Easy',
    category: 'advanced-string',
    description: `For each \`sell_date\`, report the number of distinct products sold and a comma-separated list of product names (in lexicographic order).\n\nReturn columns \`sell_date\`, \`num_sold\`, \`products\`. Order by sell_date.`,
    tables: [
      tbl('Activities', [
        { name: 'sell_date',    type: 'TEXT' },
        { name: 'product',      type: 'TEXT' },
      ], [
        ['2020-05-30', 'Headphone'],
        ['2020-06-01', 'Pencil'],
        ['2020-06-02', 'Mask'],
        ['2020-05-30', 'Basketball'],
        ['2020-06-01', 'Bible'],
        ['2020-06-02', 'Mask'],
        ['2020-05-30', 'T-Shirt'],
      ]),
    ],
    expectedOutput: { columns: ['sell_date', 'num_sold', 'products'], rows: [
      ['2020-05-30', 3, 'Basketball,Headphone,T-Shirt'],
      ['2020-06-01', 2, 'Bible,Pencil'],
      ['2020-06-02', 1, 'Mask'],
    ] },
    hints: [
      'GROUP BY sell_date, COUNT(DISTINCT product) AS num_sold.',
      'GROUP_CONCAT(DISTINCT product ORDER BY product) gives the comma list (SQLite + MySQL).',
    ],
    solution: `SELECT sell_date,
       COUNT(DISTINCT product) AS num_sold,
       GROUP_CONCAT(DISTINCT product) AS products
FROM (
  SELECT sell_date, product FROM Activities ORDER BY product
)
GROUP BY sell_date
ORDER BY sell_date;`,
    starterCode: `-- Top SQL 50: Group Sold Products By The Date
SELECT`,
  },

  {
    id: 155,
    title: 'List the Products Ordered in a Period',
    difficulty: 'Easy',
    category: 'advanced-string',
    description: `Find every product that ordered **at least 100 units in February 2020**.\n\nReturn columns \`product_name\`, \`unit\` (the total units ordered in that month).`,
    tables: [
      tbl('Products', [
        { name: 'product_id',   type: 'INTEGER PRIMARY KEY' },
        { name: 'product_name', type: 'TEXT' },
        { name: 'product_category', type: 'TEXT' },
      ], [
        [1, 'Leetcode Solutions', 'Book'],
        [2, 'Jewels of Stringology', 'Book'],
        [3, 'HP', 'Laptop'],
        [4, 'Lenovo', 'Laptop'],
        [5, 'Leetcode Kit', 'T-shirt'],
      ]),
      tbl('Orders', [
        { name: 'product_id', type: 'INTEGER' },
        { name: 'order_date', type: 'TEXT' },
        { name: 'unit',       type: 'INTEGER' },
      ], [
        [1, '2020-02-05', 60],
        [1, '2020-02-10', 70],
        [2, '2020-01-18', 30],
        [2, '2020-02-11', 80],
        [3, '2020-02-17', 2],
        [3, '2020-02-24', 3],
        [4, '2020-03-01', 20],
        [4, '2020-03-04', 30],
        [4, '2020-03-04', 60],
        [5, '2020-02-25', 50],
        [5, '2020-02-27', 50],
        [5, '2020-03-01', 50],
      ]),
    ],
    expectedOutput: { columns: ['product_name', 'unit'], rows: [
      ['Leetcode Solutions', 130],
      ['Leetcode Kit', 100],
    ] },
    hints: [
      'Join Orders to Products. Filter order_date BETWEEN "2020-02-01" AND "2020-02-29".',
      'GROUP BY product_id and HAVING SUM(unit) >= 100.',
    ],
    solution: `SELECT p.product_name, SUM(o.unit) AS unit
FROM Orders o
JOIN Products p ON p.product_id = o.product_id
WHERE o.order_date >= '2020-02-01' AND o.order_date < '2020-03-01'
GROUP BY p.product_id, p.product_name
HAVING SUM(o.unit) >= 100;`,
    starterCode: `-- Top SQL 50: List the Products Ordered in a Period
SELECT`,
  },

  {
    id: 156,
    title: 'Find Users With Valid E-Mails',
    difficulty: 'Easy',
    category: 'advanced-string',
    description: `Return the rows of users whose email is **valid**. Valid means:\n\n- Local part starts with a letter (A-Z, a-z).\n- Local part contains only letters, digits, underscore, period, or dash.\n- Domain is exactly **@leetcode.com**.\n\nReturn all columns. Order doesn't matter.`,
    tables: [
      tbl('Users', [
        { name: 'user_id', type: 'INTEGER PRIMARY KEY' },
        { name: 'name',    type: 'TEXT' },
        { name: 'mail',    type: 'TEXT' },
      ], [
        [1, 'Winston', 'winston@leetcode.com'],
        [2, 'Jonathan', 'jonathanisgreat'],
        [3, 'Annabelle', 'bella-@leetcode.com'],
        [4, 'Sally', 'sally.come@leetcode.com'],
        [5, 'Marwan', 'quarz#2020@leetcode.com'],
        [6, 'David', 'david69@gmail.com'],
        [7, 'Shapiro', '.shapo@leetcode.com'],
      ]),
    ],
    expectedOutput: { columns: ['user_id', 'name', 'mail'], rows: [
      [1, 'Winston', 'winston@leetcode.com'],
      [3, 'Annabelle', 'bella-@leetcode.com'],
      [4, 'Sally', 'sally.come@leetcode.com'],
    ] },
    hints: [
      'SQLite REGEXP isn\'t enabled by default — use a chained set of conditions instead.',
      '1) mail must end in "@leetcode.com" (the leetcode domain).',
      '2) The first character (letter) check uses SUBSTR(mail,1,1) and a comparison against ranges.',
      '3) The body-character check rejects anything containing "#", "+", "!", etc. via NOT LIKE patterns.',
      'Cleanest in production SQL is REGEXP \'^[A-Za-z][A-Za-z0-9_.-]*@leetcode\\.com$\'. The solution below uses LIKE/SUBSTR so it runs on plain SQLite.',
    ],
    solution: `SELECT user_id, name, mail
FROM Users
WHERE mail LIKE '%@leetcode.com'
  AND SUBSTR(mail, 1, 1) BETWEEN 'A' AND 'z'
  AND (SUBSTR(mail, 1, 1) BETWEEN 'A' AND 'Z' OR SUBSTR(mail, 1, 1) BETWEEN 'a' AND 'z')
  AND mail NOT LIKE '%#%'
  AND mail NOT LIKE '%+%'
  AND mail NOT LIKE '% %'
  AND mail NOT LIKE '%!%'
  AND mail NOT LIKE '%$%'
  AND mail NOT LIKE '%''%'
  AND mail NOT LIKE '%/%'
  AND mail NOT LIKE '%\\\\%';`,
    starterCode: `-- Top SQL 50: Find Users With Valid E-Mails
SELECT`,
  },
];
