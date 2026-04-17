// SQL Playground problems — categorized with schemas, seed data, and solutions
// Uses SQLite-compatible syntax throughout

export interface SqlTable {
  name: string;
  columns: string[];
  rows: (string | number | null)[][];
  createSql: string;
  insertSql: string;
}

export interface SqlProblem {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  description: string;
  tables: SqlTable[];
  expectedOutput: { columns: string[]; rows: (string | number | null)[][] };
  hints: string[];
  solution: string;
  starterCode: string;
}

export const SQL_CATEGORIES = [
  { id: 'basic-joins', label: 'Basic Joins' },
  { id: 'advanced-joins', label: 'Advanced Joins' },
  { id: 'aggregations', label: 'Aggregations' },
  { id: 'subqueries', label: 'Subqueries' },
  { id: 'window-functions', label: 'Window Functions' },
] as const;

export const SQL_PROBLEMS: SqlProblem[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // BASIC JOINS
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: 1,
    title: 'Replace Employee ID with Unique Identifier',
    difficulty: 'Easy',
    category: 'basic-joins',
    description: `Write a query to show the **unique ID** of each employee. If an employee does not have a unique ID, show \`null\` instead.\n\nReturn the result table in **any order**.`,
    tables: [
      {
        name: 'Employees',
        columns: ['id', 'name'],
        rows: [
          [1, 'Alice'],
          [7, 'Bob'],
          [11, 'Meir'],
          [90, 'Winston'],
          [3, 'Jonathan'],
        ],
        createSql: `CREATE TABLE Employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);`,
        insertSql: `INSERT INTO Employees (id, name) VALUES
(1, 'Alice'),
(7, 'Bob'),
(11, 'Meir'),
(90, 'Winston'),
(3, 'Jonathan');`,
      },
      {
        name: 'EmployeeUNI',
        columns: ['id', 'unique_id'],
        rows: [
          [3, 1],
          [11, 2],
          [90, 3],
        ],
        createSql: `CREATE TABLE EmployeeUNI (
  id INTEGER NOT NULL,
  unique_id INTEGER NOT NULL
);`,
        insertSql: `INSERT INTO EmployeeUNI (id, unique_id) VALUES
(3, 1),
(11, 2),
(90, 3);`,
      },
    ],
    expectedOutput: {
      columns: ['unique_id', 'name'],
      rows: [
        [null, 'Alice'],
        [null, 'Bob'],
        [2, 'Meir'],
        [3, 'Winston'],
        [1, 'Jonathan'],
      ],
    },
    hints: [
      'You need all employees even if they have no unique ID — which type of JOIN preserves all rows from one table?',
      'A LEFT JOIN on Employees keeps every employee and fills in NULL when there is no match in EmployeeUNI.',
      'Join condition: Employees.id = EmployeeUNI.id',
    ],
    solution: `SELECT eu.unique_id, e.name
FROM Employees e
LEFT JOIN EmployeeUNI eu ON e.id = eu.id;`,
    starterCode: `-- Q1: Replace Employee ID with Unique Identifier
-- Write your SQL below

SELECT`,
  },

  {
    id: 2,
    title: 'Product Sales Analysis I',
    difficulty: 'Easy',
    category: 'basic-joins',
    description: `Write a query that reports the **product_name**, **year**, and **price** for each sale in the Sales table.\n\nReturn the result table in **any order**.`,
    tables: [
      {
        name: 'Sales',
        columns: ['sale_id', 'product_id', 'year', 'quantity', 'price'],
        rows: [
          [1, 100, 2008, 10, 5000],
          [2, 100, 2009, 12, 5000],
          [7, 200, 2011, 15, 9000],
        ],
        createSql: `CREATE TABLE Sales (
  sale_id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  price INTEGER NOT NULL
);`,
        insertSql: `INSERT INTO Sales (sale_id, product_id, year, quantity, price) VALUES
(1, 100, 2008, 10, 5000),
(2, 100, 2009, 12, 5000),
(7, 200, 2011, 15, 9000);`,
      },
      {
        name: 'Product',
        columns: ['product_id', 'product_name'],
        rows: [
          [100, 'Nokia'],
          [200, 'Apple'],
          [300, 'Samsung'],
        ],
        createSql: `CREATE TABLE Product (
  product_id INTEGER PRIMARY KEY,
  product_name TEXT NOT NULL
);`,
        insertSql: `INSERT INTO Product (product_id, product_name) VALUES
(100, 'Nokia'),
(200, 'Apple'),
(300, 'Samsung');`,
      },
    ],
    expectedOutput: {
      columns: ['product_name', 'year', 'price'],
      rows: [
        ['Nokia', 2008, 5000],
        ['Nokia', 2009, 5000],
        ['Apple', 2011, 9000],
      ],
    },
    hints: [
      'You need data from both tables — join them on the product_id column.',
      'An INNER JOIN returns only matching rows, which is fine here since every sale references a valid product.',
      'SELECT the product_name from Product and the year and price from Sales.',
    ],
    solution: `SELECT p.product_name, s.year, s.price
FROM Sales s
JOIN Product p ON s.product_id = p.product_id;`,
    starterCode: `-- Q2: Product Sales Analysis I
-- Write your SQL below

SELECT`,
  },

  {
    id: 3,
    title: 'Customer Who Visited but Did Not Make Any Transactions',
    difficulty: 'Easy',
    category: 'basic-joins',
    description: `Write a query to find the IDs of customers who visited the mall without making any transactions, and the **count** of such no-transaction visits.\n\nReturn the result table sorted by \`customer_id\`.`,
    tables: [
      {
        name: 'Visits',
        columns: ['visit_id', 'customer_id'],
        rows: [
          [1, 23],
          [2, 9],
          [4, 30],
          [5, 54],
          [6, 96],
          [7, 54],
          [8, 54],
        ],
        createSql: `CREATE TABLE Visits (
  visit_id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL
);`,
        insertSql: `INSERT INTO Visits (visit_id, customer_id) VALUES
(1, 23),
(2, 9),
(4, 30),
(5, 54),
(6, 96),
(7, 54),
(8, 54);`,
      },
      {
        name: 'Transactions',
        columns: ['transaction_id', 'visit_id', 'amount'],
        rows: [
          [2, 5, 310],
          [3, 5, 300],
          [9, 5, 200],
          [12, 1, 910],
          [13, 2, 970],
        ],
        createSql: `CREATE TABLE Transactions (
  transaction_id INTEGER PRIMARY KEY,
  visit_id INTEGER NOT NULL,
  amount INTEGER NOT NULL
);`,
        insertSql: `INSERT INTO Transactions (transaction_id, visit_id, amount) VALUES
(2, 5, 310),
(3, 5, 300),
(9, 5, 200),
(12, 1, 910),
(13, 2, 970);`,
      },
    ],
    expectedOutput: {
      columns: ['customer_id', 'count_no_trans'],
      rows: [
        [30, 1],
        [54, 2],
        [96, 1],
      ],
    },
    hints: [
      'LEFT JOIN Visits to Transactions — visits without a matching transaction will have NULL in the transaction columns.',
      'Filter with WHERE Transactions.transaction_id IS NULL to keep only no-transaction visits.',
      'GROUP BY customer_id and COUNT(*) to get the number of such visits per customer.',
    ],
    solution: `SELECT v.customer_id, COUNT(*) AS count_no_trans
FROM Visits v
LEFT JOIN Transactions t ON v.visit_id = t.visit_id
WHERE t.transaction_id IS NULL
GROUP BY v.customer_id
ORDER BY v.customer_id;`,
    starterCode: `-- Q3: Customer Who Visited but Did Not Make Any Transactions
-- Write your SQL below

SELECT`,
  },

  {
    id: 4,
    title: 'Rising Temperature',
    difficulty: 'Easy',
    category: 'basic-joins',
    description: `Write a query to find all dates' IDs where the temperature is **higher** than the previous day's temperature.\n\nReturn the result table in **any order**.`,
    tables: [
      {
        name: 'Weather',
        columns: ['id', 'recordDate', 'temperature'],
        rows: [
          [1, '2015-01-01', 10],
          [2, '2015-01-02', 25],
          [3, '2015-01-03', 20],
          [4, '2015-01-04', 30],
        ],
        createSql: `CREATE TABLE Weather (
  id INTEGER PRIMARY KEY,
  recordDate TEXT NOT NULL,
  temperature INTEGER NOT NULL
);`,
        insertSql: `INSERT INTO Weather (id, recordDate, temperature) VALUES
(1, '2015-01-01', 10),
(2, '2015-01-02', 25),
(3, '2015-01-03', 20),
(4, '2015-01-04', 30);`,
      },
    ],
    expectedOutput: {
      columns: ['id'],
      rows: [[2], [4]],
    },
    hints: [
      'You need to compare each row with the previous day — a self-join on the same table can pair consecutive days.',
      'Join Weather w1 with Weather w2 where w1.recordDate is one day after w2.recordDate.',
      "In SQLite, use DATE(w2.recordDate, '+1 day') = w1.recordDate for the join condition.",
    ],
    solution: `SELECT w1.id
FROM Weather w1
JOIN Weather w2 ON DATE(w2.recordDate, '+1 day') = w1.recordDate
WHERE w1.temperature > w2.temperature;`,
    starterCode: `-- Q4: Rising Temperature
-- Write your SQL below

SELECT`,
  },

  {
    id: 5,
    title: 'Average Time of Process per Machine',
    difficulty: 'Easy',
    category: 'basic-joins',
    description: `There is a factory with several machines, each running multiple processes. Each process has a \`start\` and an \`end\` timestamp.\n\nWrite a query to find the **average time** each machine takes to complete a process. The time to complete a process is the \`end\` timestamp minus the \`start\` timestamp. The average is across all processes per machine.\n\nRound the result to **3 decimal places**.\n\nReturn the result table in **any order**.`,
    tables: [
      {
        name: 'Activity',
        columns: ['machine_id', 'process_id', 'activity_type', 'timestamp'],
        rows: [
          [0, 0, 'start', 0.712],
          [0, 0, 'end', 1.52],
          [0, 1, 'start', 3.14],
          [0, 1, 'end', 4.12],
          [1, 0, 'start', 0.55],
          [1, 0, 'end', 1.55],
          [1, 1, 'start', 0.43],
          [1, 1, 'end', 1.42],
        ],
        createSql: `CREATE TABLE Activity (
  machine_id INTEGER NOT NULL,
  process_id INTEGER NOT NULL,
  activity_type TEXT NOT NULL,
  timestamp REAL NOT NULL
);`,
        insertSql: `INSERT INTO Activity (machine_id, process_id, activity_type, timestamp) VALUES
(0, 0, 'start', 0.712),
(0, 0, 'end', 1.520),
(0, 1, 'start', 3.140),
(0, 1, 'end', 4.120),
(1, 0, 'start', 0.550),
(1, 0, 'end', 1.550),
(1, 1, 'start', 0.430),
(1, 1, 'end', 1.420);`,
      },
    ],
    expectedOutput: {
      columns: ['machine_id', 'processing_time'],
      rows: [
        [0, 0.894],
        [1, 0.995],
      ],
    },
    hints: [
      'Self-join the Activity table: pair each start row with its corresponding end row on the same machine_id and process_id.',
      'The duration of one process = end.timestamp - start.timestamp.',
      'Use ROUND(AVG(...), 3) grouped by machine_id to get the average processing time.',
    ],
    solution: `SELECT a1.machine_id,
       ROUND(AVG(a2.timestamp - a1.timestamp), 3) AS processing_time
FROM Activity a1
JOIN Activity a2
  ON a1.machine_id = a2.machine_id
  AND a1.process_id = a2.process_id
  AND a1.activity_type = 'start'
  AND a2.activity_type = 'end'
GROUP BY a1.machine_id;`,
    starterCode: `-- Q5: Average Time of Process per Machine
-- Write your SQL below

SELECT`,
  },

  {
    id: 6,
    title: 'Employee Bonus',
    difficulty: 'Easy',
    category: 'basic-joins',
    description: `Write a query to report the name and bonus amount of each employee whose bonus is **less than 1000**, or who has **no bonus** at all.\n\nReturn the result table in **any order**.`,
    tables: [
      {
        name: 'Employee',
        columns: ['empId', 'name', 'supervisor', 'salary'],
        rows: [
          [3, 'Brad', null, 4000],
          [1, 'John', 3, 1000],
          [2, 'Dan', 3, 2000],
          [4, 'Thomas', 3, 4000],
        ],
        createSql: `CREATE TABLE Employee (
  empId INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  supervisor INTEGER,
  salary INTEGER NOT NULL
);`,
        insertSql: `INSERT INTO Employee (empId, name, supervisor, salary) VALUES
(3, 'Brad', NULL, 4000),
(1, 'John', 3, 1000),
(2, 'Dan', 3, 2000),
(4, 'Thomas', 3, 4000);`,
      },
      {
        name: 'Bonus',
        columns: ['empId', 'bonus'],
        rows: [
          [2, 500],
          [4, 2000],
        ],
        createSql: `CREATE TABLE Bonus (
  empId INTEGER PRIMARY KEY,
  bonus INTEGER NOT NULL
);`,
        insertSql: `INSERT INTO Bonus (empId, bonus) VALUES
(2, 500),
(4, 2000);`,
      },
    ],
    expectedOutput: {
      columns: ['name', 'bonus'],
      rows: [
        ['Brad', null],
        ['John', null],
        ['Dan', 500],
      ],
    },
    hints: [
      'LEFT JOIN Employee with Bonus so employees without a bonus still appear with NULL.',
      'Filter where the bonus IS NULL (no bonus) OR bonus < 1000.',
      'SELECT just the name and bonus columns.',
    ],
    solution: `SELECT e.name, b.bonus
FROM Employee e
LEFT JOIN Bonus b ON e.empId = b.empId
WHERE b.bonus IS NULL OR b.bonus < 1000;`,
    starterCode: `-- Q6: Employee Bonus
-- Write your SQL below

SELECT`,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ADVANCED JOINS
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: 7,
    title: 'Students and Examinations',
    difficulty: 'Medium',
    category: 'advanced-joins',
    description: `Write a query to find the number of times each student attended each exam.\n\nReturn the result table ordered by \`student_id\` and \`subject_name\`.`,
    tables: [
      {
        name: 'Students',
        columns: ['student_id', 'student_name'],
        rows: [
          [1, 'Alice'],
          [2, 'Bob'],
          [13, 'John'],
          [6, 'Alex'],
        ],
        createSql: `CREATE TABLE Students (
  student_id INTEGER PRIMARY KEY,
  student_name TEXT NOT NULL
);`,
        insertSql: `INSERT INTO Students (student_id, student_name) VALUES
(1, 'Alice'),
(2, 'Bob'),
(13, 'John'),
(6, 'Alex');`,
      },
      {
        name: 'Subjects',
        columns: ['subject_name'],
        rows: [['Math'], ['Physics'], ['Programming']],
        createSql: `CREATE TABLE Subjects (
  subject_name TEXT PRIMARY KEY
);`,
        insertSql: `INSERT INTO Subjects (subject_name) VALUES
('Math'),
('Physics'),
('Programming');`,
      },
      {
        name: 'Examinations',
        columns: ['student_id', 'subject_name'],
        rows: [
          [1, 'Math'],
          [1, 'Physics'],
          [1, 'Programming'],
          [2, 'Programming'],
          [1, 'Physics'],
          [1, 'Math'],
          [13, 'Math'],
          [13, 'Programming'],
          [13, 'Physics'],
          [2, 'Math'],
          [1, 'Math'],
        ],
        createSql: `CREATE TABLE Examinations (
  student_id INTEGER NOT NULL,
  subject_name TEXT NOT NULL
);`,
        insertSql: `INSERT INTO Examinations (student_id, subject_name) VALUES
(1, 'Math'),
(1, 'Physics'),
(1, 'Programming'),
(2, 'Programming'),
(1, 'Physics'),
(1, 'Math'),
(13, 'Math'),
(13, 'Programming'),
(13, 'Physics'),
(2, 'Math'),
(1, 'Math');`,
      },
    ],
    expectedOutput: {
      columns: ['student_id', 'student_name', 'subject_name', 'attended_exams'],
      rows: [
        [1, 'Alice', 'Math', 3],
        [1, 'Alice', 'Physics', 2],
        [1, 'Alice', 'Programming', 1],
        [2, 'Bob', 'Math', 1],
        [2, 'Bob', 'Physics', 0],
        [2, 'Bob', 'Programming', 1],
        [6, 'Alex', 'Math', 0],
        [6, 'Alex', 'Physics', 0],
        [6, 'Alex', 'Programming', 0],
        [13, 'John', 'Math', 1],
        [13, 'John', 'Physics', 1],
        [13, 'John', 'Programming', 1],
      ],
    },
    hints: [
      'You need every student paired with every subject — even if they never took that exam. Start with a CROSS JOIN between Students and Subjects.',
      'LEFT JOIN the cross-join result with Examinations to count how many times each student attended each subject.',
      'Use COUNT(e.subject_name) instead of COUNT(*) so that NULL rows (no attendance) count as 0.',
    ],
    solution: `SELECT s.student_id, s.student_name, sub.subject_name,
       COUNT(e.subject_name) AS attended_exams
FROM Students s
CROSS JOIN Subjects sub
LEFT JOIN Examinations e
  ON s.student_id = e.student_id
  AND sub.subject_name = e.subject_name
GROUP BY s.student_id, s.student_name, sub.subject_name
ORDER BY s.student_id, sub.subject_name;`,
    starterCode: `-- Q7: Students and Examinations
-- Write your SQL below

SELECT`,
  },

  {
    id: 8,
    title: 'Managers with at Least 5 Direct Reports',
    difficulty: 'Medium',
    category: 'advanced-joins',
    description: `Write a query to find managers who have **at least five direct reports**.\n\nReturn the result table in **any order**.`,
    tables: [
      {
        name: 'Employee',
        columns: ['id', 'name', 'department', 'managerId'],
        rows: [
          [101, 'John', 'A', null],
          [102, 'Dan', 'A', 101],
          [103, 'James', 'A', 101],
          [104, 'Amy', 'A', 101],
          [105, 'Anne', 'A', 101],
          [106, 'Ron', 'B', 101],
        ],
        createSql: `CREATE TABLE Employee (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  managerId INTEGER
);`,
        insertSql: `INSERT INTO Employee (id, name, department, managerId) VALUES
(101, 'John', 'A', NULL),
(102, 'Dan', 'A', 101),
(103, 'James', 'A', 101),
(104, 'Amy', 'A', 101),
(105, 'Anne', 'A', 101),
(106, 'Ron', 'B', 101);`,
      },
    ],
    expectedOutput: {
      columns: ['name'],
      rows: [['John']],
    },
    hints: [
      'Group the employees by managerId and count how many report to each manager.',
      'Use HAVING COUNT(*) >= 5 to filter managers with at least 5 reports.',
      'Join back to the Employee table to get the manager name from the managerId.',
    ],
    solution: `SELECT e.name
FROM Employee e
JOIN (
  SELECT managerId
  FROM Employee
  WHERE managerId IS NOT NULL
  GROUP BY managerId
  HAVING COUNT(*) >= 5
) m ON e.id = m.managerId;`,
    starterCode: `-- Q8: Managers with at Least 5 Direct Reports
-- Write your SQL below

SELECT`,
  },

  {
    id: 9,
    title: 'Confirmation Rate',
    difficulty: 'Medium',
    category: 'advanced-joins',
    description: `The **confirmation rate** of a user is the number of \`confirmed\` messages divided by the total number of confirmation requests. If a user has no requests, the rate is \`0.00\`.\n\nWrite a query to find the confirmation rate of each user, rounded to **2 decimal places**.\n\nReturn the result table in **any order**.`,
    tables: [
      {
        name: 'Signups',
        columns: ['user_id', 'time_stamp'],
        rows: [
          [3, '2020-03-21 10:16:13'],
          [7, '2020-01-04 13:57:59'],
          [2, '2020-07-29 23:09:44'],
          [6, '2020-12-09 10:39:37'],
        ],
        createSql: `CREATE TABLE Signups (
  user_id INTEGER PRIMARY KEY,
  time_stamp TEXT NOT NULL
);`,
        insertSql: `INSERT INTO Signups (user_id, time_stamp) VALUES
(3, '2020-03-21 10:16:13'),
(7, '2020-01-04 13:57:59'),
(2, '2020-07-29 23:09:44'),
(6, '2020-12-09 10:39:37');`,
      },
      {
        name: 'Confirmations',
        columns: ['user_id', 'time_stamp', 'action'],
        rows: [
          [3, '2021-01-06 03:30:46', 'timeout'],
          [3, '2021-07-14 14:00:00', 'timeout'],
          [7, '2021-06-12 11:57:29', 'confirmed'],
          [7, '2021-06-13 12:58:28', 'confirmed'],
          [7, '2021-06-14 13:59:27', 'timeout'],
          [2, '2021-01-22 00:00:00', 'confirmed'],
        ],
        createSql: `CREATE TABLE Confirmations (
  user_id INTEGER NOT NULL,
  time_stamp TEXT NOT NULL,
  action TEXT NOT NULL
);`,
        insertSql: `INSERT INTO Confirmations (user_id, time_stamp, action) VALUES
(3, '2021-01-06 03:30:46', 'timeout'),
(3, '2021-07-14 14:00:00', 'timeout'),
(7, '2021-06-12 11:57:29', 'confirmed'),
(7, '2021-06-13 12:58:28', 'confirmed'),
(7, '2021-06-14 13:59:27', 'timeout'),
(2, '2021-01-22 00:00:00', 'confirmed');`,
      },
    ],
    expectedOutput: {
      columns: ['user_id', 'confirmation_rate'],
      rows: [
        [3, 0.0],
        [7, 0.67],
        [2, 1.0],
        [6, 0.0],
      ],
    },
    hints: [
      'LEFT JOIN Signups with Confirmations so users with zero requests still appear.',
      "Use AVG with a CASE expression: CASE WHEN action = 'confirmed' THEN 1.0 ELSE 0.0 END. For users with no rows, COALESCE the NULL average to 0.",
      'ROUND(..., 2) to get two decimal places.',
    ],
    solution: `SELECT s.user_id,
       ROUND(COALESCE(AVG(CASE WHEN c.action = 'confirmed' THEN 1.0 ELSE 0.0 END), 0.00), 2) AS confirmation_rate
FROM Signups s
LEFT JOIN Confirmations c ON s.user_id = c.user_id
GROUP BY s.user_id;`,
    starterCode: `-- Q9: Confirmation Rate
-- Write your SQL below

SELECT`,
  },

  {
    id: 10,
    title: 'Number of Employees Who Report to Each Manager',
    difficulty: 'Easy',
    category: 'advanced-joins',
    description: `For each manager, report the number of employees who report directly to them, and the **average age** of those employees (rounded to the nearest integer).\n\nReturn the result table ordered by \`employee_id\`.`,
    tables: [
      {
        name: 'Employees',
        columns: ['employee_id', 'name', 'reports_to', 'age'],
        rows: [
          [9, 'Hercy', null, 43],
          [6, 'Alice', 9, 41],
          [4, 'Bob', 9, 36],
          [2, 'Winston', null, 37],
          [8, 'Greg', null, 53],
          [1, 'Ava', 9, 29],
        ],
        createSql: `CREATE TABLE Employees (
  employee_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  reports_to INTEGER,
  age INTEGER NOT NULL
);`,
        insertSql: `INSERT INTO Employees (employee_id, name, reports_to, age) VALUES
(9, 'Hercy', NULL, 43),
(6, 'Alice', 9, 41),
(4, 'Bob', 9, 36),
(2, 'Winston', NULL, 37),
(8, 'Greg', NULL, 53),
(1, 'Ava', 9, 29);`,
      },
    ],
    expectedOutput: {
      columns: ['employee_id', 'name', 'reports_count', 'average_age'],
      rows: [[9, 'Hercy', 3, 35]],
    },
    hints: [
      'Self-join: treat one copy of the table as managers and the other as their reports.',
      'GROUP BY the manager id and use COUNT(*) for reports_count, ROUND(AVG(age)) for average_age.',
      'Filter only rows where reports_to IS NOT NULL to find actual reports.',
    ],
    solution: `SELECT m.employee_id, m.name,
       COUNT(*) AS reports_count,
       ROUND(AVG(e.age)) AS average_age
FROM Employees e
JOIN Employees m ON e.reports_to = m.employee_id
GROUP BY m.employee_id, m.name
ORDER BY m.employee_id;`,
    starterCode: `-- Q10: Number of Employees Who Report to Each Manager
-- Write your SQL below

SELECT`,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // AGGREGATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: 11,
    title: 'Not Boring Movies',
    difficulty: 'Easy',
    category: 'aggregations',
    description: `Write a query to report movies with an **odd-numbered** ID and a description that is **not** "boring".\n\nReturn the result table ordered by \`rating\` in **descending** order.`,
    tables: [
      {
        name: 'Cinema',
        columns: ['id', 'movie', 'description', 'rating'],
        rows: [
          [1, 'War', 'great 3D', 8.9],
          [2, 'Science', 'fiction', 8.5],
          [3, 'Irish', 'boring', 6.2],
          [4, 'Ice Song', 'fantasy', 8.6],
          [5, 'House Card', 'interesting', 9.1],
        ],
        createSql: `CREATE TABLE Cinema (
  id INTEGER PRIMARY KEY,
  movie TEXT NOT NULL,
  description TEXT NOT NULL,
  rating REAL NOT NULL
);`,
        insertSql: `INSERT INTO Cinema (id, movie, description, rating) VALUES
(1, 'War', 'great 3D', 8.9),
(2, 'Science', 'fiction', 8.5),
(3, 'Irish', 'boring', 6.2),
(4, 'Ice Song', 'fantasy', 8.6),
(5, 'House Card', 'interesting', 9.1);`,
      },
    ],
    expectedOutput: {
      columns: ['id', 'movie', 'description', 'rating'],
      rows: [
        [5, 'House Card', 'interesting', 9.1],
        [1, 'War', 'great 3D', 8.9],
      ],
    },
    hints: [
      "Use id % 2 = 1 to check for odd IDs (or id % 2 != 0).",
      "Filter out boring movies with description != 'boring'.",
      'ORDER BY rating DESC to sort by rating in descending order.',
    ],
    solution: `SELECT id, movie, description, rating
FROM Cinema
WHERE id % 2 = 1 AND description != 'boring'
ORDER BY rating DESC;`,
    starterCode: `-- Q11: Not Boring Movies
-- Write your SQL below

SELECT`,
  },

  {
    id: 12,
    title: 'Average Selling Price',
    difficulty: 'Easy',
    category: 'aggregations',
    description: `Write a query to find the **average selling price** for each product. The average selling price is the total revenue divided by the total units sold. Round to **2 decimal places**.\n\nIf a product has no units sold, its average selling price is \`0.00\`.\n\nReturn the result table in **any order**.`,
    tables: [
      {
        name: 'Prices',
        columns: ['product_id', 'start_date', 'end_date', 'price'],
        rows: [
          [1, '2019-02-17', '2019-02-28', 5],
          [1, '2019-03-01', '2019-03-22', 20],
          [2, '2019-02-01', '2019-02-20', 15],
          [2, '2019-02-21', '2019-03-31', 30],
          [3, '2019-02-21', '2019-03-31', 30],
        ],
        createSql: `CREATE TABLE Prices (
  product_id INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  price INTEGER NOT NULL
);`,
        insertSql: `INSERT INTO Prices (product_id, start_date, end_date, price) VALUES
(1, '2019-02-17', '2019-02-28', 5),
(1, '2019-03-01', '2019-03-22', 20),
(2, '2019-02-01', '2019-02-20', 15),
(2, '2019-02-21', '2019-03-31', 30),
(3, '2019-02-21', '2019-03-31', 30);`,
      },
      {
        name: 'UnitsSold',
        columns: ['product_id', 'purchase_date', 'units'],
        rows: [
          [1, '2019-02-25', 100],
          [1, '2019-03-01', 15],
          [2, '2019-02-10', 200],
          [2, '2019-03-22', 30],
        ],
        createSql: `CREATE TABLE UnitsSold (
  product_id INTEGER NOT NULL,
  purchase_date TEXT NOT NULL,
  units INTEGER NOT NULL
);`,
        insertSql: `INSERT INTO UnitsSold (product_id, purchase_date, units) VALUES
(1, '2019-02-25', 100),
(1, '2019-03-01', 15),
(2, '2019-02-10', 200),
(2, '2019-03-22', 30);`,
      },
    ],
    expectedOutput: {
      columns: ['product_id', 'average_price'],
      rows: [
        [1, 6.96],
        [2, 16.96],
        [3, 0.0],
      ],
    },
    hints: [
      'LEFT JOIN Prices with UnitsSold where the purchase_date falls between start_date and end_date.',
      'Weighted average = SUM(price * units) / SUM(units). Use COALESCE to handle products with no sales.',
      'ROUND to 2 decimal places. Handle the divide-by-zero case with COALESCE or IFNULL.',
    ],
    solution: `SELECT p.product_id,
       ROUND(COALESCE(SUM(p.price * u.units) * 1.0 / NULLIF(SUM(u.units), 0), 0), 2) AS average_price
FROM Prices p
LEFT JOIN UnitsSold u
  ON p.product_id = u.product_id
  AND u.purchase_date BETWEEN p.start_date AND p.end_date
GROUP BY p.product_id;`,
    starterCode: `-- Q12: Average Selling Price
-- Write your SQL below

SELECT`,
  },

  {
    id: 13,
    title: 'Count Salary Categories',
    difficulty: 'Medium',
    category: 'aggregations',
    description: `Write a query to count the number of bank accounts in each salary category. The categories are:\n\n- **"Low Salary"**: income strictly less than 20000\n- **"Average Salary"**: income between 20000 and 50000 (inclusive)\n- **"High Salary"**: income strictly greater than 50000\n\nReturn the result table in **any order**. If there are no accounts in a category, return 0.`,
    tables: [
      {
        name: 'Accounts',
        columns: ['account_id', 'income'],
        rows: [
          [3, 108939],
          [2, 12747],
          [8, 87709],
          [6, 91370],
          [1, 49382],
          [5, 15000],
        ],
        createSql: `CREATE TABLE Accounts (
  account_id INTEGER PRIMARY KEY,
  income INTEGER NOT NULL
);`,
        insertSql: `INSERT INTO Accounts (account_id, income) VALUES
(3, 108939),
(2, 12747),
(8, 87709),
(6, 91370),
(1, 49382),
(5, 15000);`,
      },
    ],
    expectedOutput: {
      columns: ['category', 'accounts_count'],
      rows: [
        ['Low Salary', 2],
        ['Average Salary', 1],
        ['High Salary', 3],
      ],
    },
    hints: [
      'Use a UNION ALL approach: write three separate SELECT statements, one per category, and UNION them together.',
      "Alternatively, use a CASE expression inside COUNT or SUM to categorize each account, but you will need a base table of category names to ensure zero-count categories appear.",
      'SUM(CASE WHEN income < 20000 THEN 1 ELSE 0 END) counts accounts in each bucket.',
    ],
    solution: `SELECT 'Low Salary' AS category,
       SUM(CASE WHEN income < 20000 THEN 1 ELSE 0 END) AS accounts_count
FROM Accounts
UNION ALL
SELECT 'Average Salary' AS category,
       SUM(CASE WHEN income >= 20000 AND income <= 50000 THEN 1 ELSE 0 END) AS accounts_count
FROM Accounts
UNION ALL
SELECT 'High Salary' AS category,
       SUM(CASE WHEN income > 50000 THEN 1 ELSE 0 END) AS accounts_count
FROM Accounts;`,
    starterCode: `-- Q13: Count Salary Categories
-- Write your SQL below

SELECT`,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBQUERIES
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: 14,
    title: 'Primary Department for Each Employee',
    difficulty: 'Easy',
    category: 'subqueries',
    description: `Employees can belong to multiple departments. When an employee joins multiple departments, they choose one as their **primary** department (\`primary_flag = 'Y'\`). An employee who belongs to only one department automatically has that as their primary.\n\nWrite a query to report the department that is the primary for each employee.\n\nReturn the result table in **any order**.`,
    tables: [
      {
        name: 'Employee',
        columns: ['employee_id', 'department_id', 'primary_flag'],
        rows: [
          [1, 1, 'N'],
          [1, 2, 'Y'],
          [1, 3, 'N'],
          [2, 1, 'N'],
          [2, 4, 'Y'],
          [3, 3, 'N'],
          [4, 2, 'Y'],
          [4, 3, 'N'],
          [4, 4, 'N'],
        ],
        createSql: `CREATE TABLE Employee (
  employee_id INTEGER NOT NULL,
  department_id INTEGER NOT NULL,
  primary_flag TEXT NOT NULL
);`,
        insertSql: `INSERT INTO Employee (employee_id, department_id, primary_flag) VALUES
(1, 1, 'N'),
(1, 2, 'Y'),
(1, 3, 'N'),
(2, 1, 'N'),
(2, 4, 'Y'),
(3, 3, 'N'),
(4, 2, 'Y'),
(4, 3, 'N'),
(4, 4, 'N');`,
      },
    ],
    expectedOutput: {
      columns: ['employee_id', 'department_id'],
      rows: [
        [1, 2],
        [2, 4],
        [3, 3],
        [4, 2],
      ],
    },
    hints: [
      "Two cases: employees with primary_flag = 'Y' (pick that row) and employees in only one department (pick that single row).",
      "Use a subquery to find employees who appear only once — GROUP BY employee_id HAVING COUNT(*) = 1.",
      "Combine both cases with UNION: SELECT ... WHERE primary_flag = 'Y' UNION SELECT ... single-department employees.",
    ],
    solution: `SELECT employee_id, department_id
FROM Employee
WHERE primary_flag = 'Y'
UNION
SELECT employee_id, department_id
FROM Employee
GROUP BY employee_id
HAVING COUNT(*) = 1;`,
    starterCode: `-- Q14: Primary Department for Each Employee
-- Write your SQL below

SELECT`,
  },

  {
    id: 15,
    title: 'Product Price at a Given Date',
    difficulty: 'Medium',
    category: 'subqueries',
    description: `Write a query to find the prices of all products on **2019-08-16**. Assume the price of all products before any change is **10**.\n\nReturn the result table in **any order**.`,
    tables: [
      {
        name: 'Products',
        columns: ['product_id', 'new_price', 'change_date'],
        rows: [
          [1, 20, '2019-08-14'],
          [2, 50, '2019-08-14'],
          [1, 30, '2019-08-15'],
          [1, 35, '2019-08-16'],
          [2, 65, '2019-08-17'],
          [3, 20, '2019-08-18'],
        ],
        createSql: `CREATE TABLE Products (
  product_id INTEGER NOT NULL,
  new_price INTEGER NOT NULL,
  change_date TEXT NOT NULL
);`,
        insertSql: `INSERT INTO Products (product_id, new_price, change_date) VALUES
(1, 20, '2019-08-14'),
(2, 50, '2019-08-14'),
(1, 30, '2019-08-15'),
(1, 35, '2019-08-16'),
(2, 65, '2019-08-17'),
(3, 20, '2019-08-18');`,
      },
    ],
    expectedOutput: {
      columns: ['product_id', 'price'],
      rows: [
        [1, 35],
        [2, 50],
        [3, 10],
      ],
    },
    hints: [
      "For each product, find the latest change_date that is on or before '2019-08-16'.",
      "Use a subquery: SELECT product_id, MAX(change_date) FROM Products WHERE change_date <= '2019-08-16' GROUP BY product_id.",
      'Products with no change before the target date should default to price 10 — use UNION to add those.',
    ],
    solution: `SELECT p.product_id, p.new_price AS price
FROM Products p
JOIN (
  SELECT product_id, MAX(change_date) AS latest_date
  FROM Products
  WHERE change_date <= '2019-08-16'
  GROUP BY product_id
) sub ON p.product_id = sub.product_id AND p.change_date = sub.latest_date
UNION
SELECT DISTINCT product_id, 10 AS price
FROM Products
WHERE product_id NOT IN (
  SELECT product_id FROM Products WHERE change_date <= '2019-08-16'
);`,
    starterCode: `-- Q15: Product Price at a Given Date
-- Write your SQL below

SELECT`,
  },

  {
    id: 16,
    title: 'Last Person to Fit in the Bus',
    difficulty: 'Medium',
    category: 'subqueries',
    description: `There is a queue of people waiting to board a bus. The bus has a weight limit of **1000 kilograms**.\n\nWrite a query to find the **last person** who can fit on the bus without exceeding the weight limit. It is guaranteed that the first person in the queue can fit.\n\nThe queue is ordered by \`turn\`.`,
    tables: [
      {
        name: 'Queue',
        columns: ['person_id', 'person_name', 'weight', 'turn'],
        rows: [
          [5, 'Alice', 250, 1],
          [4, 'Bob', 175, 5],
          [3, 'Alex', 350, 2],
          [6, 'John Cena', 400, 3],
          [1, 'Winston', 500, 6],
          [2, 'Marie', 200, 4],
        ],
        createSql: `CREATE TABLE Queue (
  person_id INTEGER PRIMARY KEY,
  person_name TEXT NOT NULL,
  weight INTEGER NOT NULL,
  turn INTEGER NOT NULL
);`,
        insertSql: `INSERT INTO Queue (person_id, person_name, weight, turn) VALUES
(5, 'Alice', 250, 1),
(4, 'Bob', 175, 5),
(3, 'Alex', 350, 2),
(6, 'John Cena', 400, 3),
(1, 'Winston', 500, 6),
(2, 'Marie', 200, 4);`,
      },
    ],
    expectedOutput: {
      columns: ['person_name'],
      rows: [['John Cena']],
    },
    hints: [
      'Calculate the running sum of weights for each person based on their turn order using a correlated subquery.',
      "Running sum for person at turn T = SUM of weights for all people whose turn <= T. Use: SELECT SUM(weight) FROM Queue q2 WHERE q2.turn <= q1.turn.",
      'Filter to running_sum <= 1000, then ORDER BY turn DESC LIMIT 1 to get the last person who fits.',
    ],
    solution: `SELECT q1.person_name
FROM Queue q1
WHERE (
  SELECT SUM(q2.weight)
  FROM Queue q2
  WHERE q2.turn <= q1.turn
) <= 1000
ORDER BY q1.turn DESC
LIMIT 1;`,
    starterCode: `-- Q16: Last Person to Fit in the Bus
-- Write your SQL below

SELECT`,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // WINDOW FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: 17,
    title: 'Rank Scores',
    difficulty: 'Medium',
    category: 'window-functions',
    description: `Write a query to rank scores. The ranking should be **dense** (no gaps between ranking numbers when there are ties).\n\nReturn the result table ordered by \`score\` in **descending** order.`,
    tables: [
      {
        name: 'Scores',
        columns: ['id', 'score'],
        rows: [
          [1, 3.5],
          [2, 3.65],
          [3, 4.0],
          [4, 3.85],
          [5, 4.0],
          [6, 3.65],
        ],
        createSql: `CREATE TABLE Scores (
  id INTEGER PRIMARY KEY,
  score REAL NOT NULL
);`,
        insertSql: `INSERT INTO Scores (id, score) VALUES
(1, 3.50),
(2, 3.65),
(3, 4.00),
(4, 3.85),
(5, 4.00),
(6, 3.65);`,
      },
    ],
    expectedOutput: {
      columns: ['score', 'rank'],
      rows: [
        [4.0, 1],
        [4.0, 1],
        [3.85, 2],
        [3.65, 3],
        [3.65, 3],
        [3.5, 4],
      ],
    },
    hints: [
      'DENSE_RANK() produces consecutive rankings with no gaps when there are ties.',
      'Use DENSE_RANK() OVER (ORDER BY score DESC) to rank by score descending.',
      'SQLite supports window functions since version 3.25.',
    ],
    solution: `SELECT score,
       DENSE_RANK() OVER (ORDER BY score DESC) AS rank
FROM Scores
ORDER BY score DESC;`,
    starterCode: `-- Q17: Rank Scores
-- Write your SQL below

SELECT`,
  },

  {
    id: 18,
    title: 'Department Top Three Salaries',
    difficulty: 'Hard',
    category: 'window-functions',
    description: `A company's executives want to see who earns the most in each department. A **high earner** is an employee whose salary is in the **top three unique salaries** for that department.\n\nWrite a query to find the employees who are high earners in each department.`,
    tables: [
      {
        name: 'Employee',
        columns: ['id', 'name', 'salary', 'departmentId'],
        rows: [
          [1, 'Joe', 85000, 1],
          [2, 'Henry', 80000, 2],
          [3, 'Sam', 60000, 2],
          [4, 'Max', 90000, 1],
          [5, 'Janet', 69000, 1],
          [6, 'Randy', 85000, 1],
          [7, 'Will', 70000, 1],
        ],
        createSql: `CREATE TABLE Employee (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  salary INTEGER NOT NULL,
  departmentId INTEGER NOT NULL
);`,
        insertSql: `INSERT INTO Employee (id, name, salary, departmentId) VALUES
(1, 'Joe', 85000, 1),
(2, 'Henry', 80000, 2),
(3, 'Sam', 60000, 2),
(4, 'Max', 90000, 1),
(5, 'Janet', 69000, 1),
(6, 'Randy', 85000, 1),
(7, 'Will', 70000, 1);`,
      },
      {
        name: 'Department',
        columns: ['id', 'name'],
        rows: [
          [1, 'IT'],
          [2, 'Sales'],
        ],
        createSql: `CREATE TABLE Department (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);`,
        insertSql: `INSERT INTO Department (id, name) VALUES
(1, 'IT'),
(2, 'Sales');`,
      },
    ],
    expectedOutput: {
      columns: ['Department', 'Employee', 'Salary'],
      rows: [
        ['IT', 'Max', 90000],
        ['IT', 'Joe', 85000],
        ['IT', 'Randy', 85000],
        ['IT', 'Will', 70000],
        ['Sales', 'Henry', 80000],
        ['Sales', 'Sam', 60000],
      ],
    },
    hints: [
      'Use DENSE_RANK() OVER (PARTITION BY departmentId ORDER BY salary DESC) to rank employees within each department.',
      'Filter where rank <= 3 to keep only the top three unique salary tiers.',
      'JOIN with Department to get the department name.',
    ],
    solution: `WITH ranked AS (
  SELECT e.name AS Employee, e.salary AS Salary,
         d.name AS Department,
         DENSE_RANK() OVER (PARTITION BY e.departmentId ORDER BY e.salary DESC) AS rnk
  FROM Employee e
  JOIN Department d ON e.departmentId = d.id
)
SELECT Department, Employee, Salary
FROM ranked
WHERE rnk <= 3
ORDER BY Department, Salary DESC;`,
    starterCode: `-- Q18: Department Top Three Salaries
-- Write your SQL below

SELECT`,
  },
];
