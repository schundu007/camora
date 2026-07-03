// SQL Playground — extended problem catalog (auto-verified via sql.js).
// Generated: expectedOutput computed by executing each solution against its
// seed data, so any correct user query validates. Do not hand-edit outputs;
// edit the generator drafts and re-run instead.
import type { SqlProblem } from './sqlProblems';

export const SQL_EXTRA_PROBLEMS: SqlProblem[] = [
  {
    id: 200,
    title: 'Combine Two Tables',
    difficulty: 'Easy',
    category: 'basic-joins',
    description: `Report the **first name, last name, city, and state** of each person in the Person table. If a person has no address, still report the person with \`null\` city and state.

Return the result table in **any order**.`,
    tables: [
      {
        name: 'Person',
        columns: ['personId', 'lastName', 'firstName'],
        rows: [
          [1, 'Wang', 'Allen'],
          [2, 'Alice', 'Bob'],
        ],
        createSql: `CREATE TABLE Person (
  personId INTEGER PRIMARY KEY,
  lastName TEXT,
  firstName TEXT
);`,
        insertSql: `INSERT INTO Person (personId, lastName, firstName) VALUES
(1, 'Wang', 'Allen'),
(2, 'Alice', 'Bob');`,
      },
      {
        name: 'Address',
        columns: ['addressId', 'personId', 'city', 'state'],
        rows: [
          [1, 2, 'New York City', 'New York'],
          [2, 3, 'Leetcode', 'California'],
        ],
        createSql: `CREATE TABLE Address (
  addressId INTEGER PRIMARY KEY,
  personId INTEGER,
  city TEXT,
  state TEXT
);`,
        insertSql: `INSERT INTO Address (addressId, personId, city, state) VALUES
(1, 2, 'New York City', 'New York'),
(2, 3, 'Leetcode', 'California');`,
      },
    ],
    expectedOutput: {
      columns: ['firstName', 'lastName', 'city', 'state'],
      rows: [
        ['Allen', 'Wang', null, null],
        ['Bob', 'Alice', 'New York City', 'New York'],
      ],
    },
    hints: [
      `You must keep every person even when they have no matching address — which JOIN keeps all rows of the left table?`,
      `A LEFT JOIN from Person to Address fills city/state with NULL when there is no address.`,
      `Join on Person.personId = Address.personId.`,
    ],
    solution: `SELECT p.firstName, p.lastName, a.city, a.state
FROM Person p
LEFT JOIN Address a ON p.personId = a.personId;`,
    starterCode: `-- Combine Two Tables
-- Write your SQL below

SELECT`,
  },
  {
    id: 201,
    title: 'Customers Who Never Order',
    difficulty: 'Easy',
    category: 'basic-joins',
    description: `Find all customers who **never** placed any order.

Return the result table in **any order**. The output column should be named \`Customers\`.`,
    tables: [
      {
        name: 'Customers',
        columns: ['id', 'name'],
        rows: [
          [1, 'Joe'],
          [2, 'Henry'],
          [3, 'Sam'],
          [4, 'Max'],
        ],
        createSql: `CREATE TABLE Customers (
  id INTEGER PRIMARY KEY,
  name TEXT
);`,
        insertSql: `INSERT INTO Customers (id, name) VALUES
(1, 'Joe'),
(2, 'Henry'),
(3, 'Sam'),
(4, 'Max');`,
      },
      {
        name: 'Orders',
        columns: ['id', 'customerId'],
        rows: [
          [1, 3],
          [2, 1],
        ],
        createSql: `CREATE TABLE Orders (
  id INTEGER PRIMARY KEY,
  customerId INTEGER
);`,
        insertSql: `INSERT INTO Orders (id, customerId) VALUES
(1, 3),
(2, 1);`,
      },
    ],
    expectedOutput: {
      columns: ['Customers'],
      rows: [
        ['Henry'],
        ['Max'],
      ],
    },
    hints: [
      `The set of customers who ordered is exactly the customerId values present in Orders.`,
      `You want customers whose id is NOT in that set.`,
      `Use NOT IN (SELECT customerId FROM Orders) — or a LEFT JOIN … WHERE Orders.id IS NULL.`,
    ],
    solution: `SELECT name AS Customers
FROM Customers
WHERE id NOT IN (SELECT customerId FROM Orders);`,
    starterCode: `-- Customers Who Never Order
-- Write your SQL below

SELECT`,
  },
  {
    id: 202,
    title: 'Employees Earning More Than Their Managers',
    difficulty: 'Easy',
    category: 'basic-joins',
    description: `Find the employees who earn **more than their managers**.

Return the result table in **any order**. The output column should be named \`Employee\`.`,
    tables: [
      {
        name: 'Employee',
        columns: ['id', 'name', 'salary', 'managerId'],
        rows: [
          [1, 'Joe', 70000, 3],
          [2, 'Henry', 80000, 4],
          [3, 'Sam', 60000, null],
          [4, 'Max', 90000, null],
        ],
        createSql: `CREATE TABLE Employee (
  id INTEGER PRIMARY KEY,
  name TEXT,
  salary INTEGER,
  managerId INTEGER
);`,
        insertSql: `INSERT INTO Employee (id, name, salary, managerId) VALUES
(1, 'Joe', 70000, 3),
(2, 'Henry', 80000, 4),
(3, 'Sam', 60000, NULL),
(4, 'Max', 90000, NULL);`,
      },
    ],
    expectedOutput: {
      columns: ['Employee'],
      rows: [
        ['Joe'],
      ],
    },
    hints: [
      `Every employee references their manager via managerId, which points back into the same table.`,
      `Self-join Employee to itself: one alias for the employee, one for the manager.`,
      `Keep rows where employee.salary > manager.salary.`,
    ],
    solution: `SELECT e.name AS Employee
FROM Employee e
JOIN Employee m ON e.managerId = m.id
WHERE e.salary > m.salary;`,
    starterCode: `-- Employees Earning More Than Their Managers
-- Write your SQL below

SELECT`,
  },
  {
    id: 203,
    title: 'Duplicate Emails',
    difficulty: 'Easy',
    category: 'aggregations',
    description: `Report all **email addresses that appear more than once** in the Person table.

Return the result table in **any order**. The output column should be named \`Email\`.`,
    tables: [
      {
        name: 'Person',
        columns: ['id', 'email'],
        rows: [
          [1, 'a@b.com'],
          [2, 'c@d.com'],
          [3, 'a@b.com'],
        ],
        createSql: `CREATE TABLE Person (
  id INTEGER PRIMARY KEY,
  email TEXT
);`,
        insertSql: `INSERT INTO Person (id, email) VALUES
(1, 'a@b.com'),
(2, 'c@d.com'),
(3, 'a@b.com');`,
      },
    ],
    expectedOutput: {
      columns: ['Email'],
      rows: [
        ['a@b.com'],
      ],
    },
    hints: [
      `Group the rows by email so identical emails collapse into one group.`,
      `Count how many rows fall into each group.`,
      `Keep only groups with COUNT(*) > 1 using HAVING.`,
    ],
    solution: `SELECT email AS Email
FROM Person
GROUP BY email
HAVING COUNT(*) > 1;`,
    starterCode: `-- Duplicate Emails
-- Write your SQL below

SELECT`,
  },
  {
    id: 204,
    title: 'Customer Placing the Largest Number of Orders',
    difficulty: 'Easy',
    category: 'sorting-grouping',
    description: `Find the \`customer_number\` for the customer who placed the **largest number of orders**. The test data guarantees exactly one such customer.

The output column should be named \`customer_number\`.`,
    tables: [
      {
        name: 'Orders',
        columns: ['order_number', 'customer_number'],
        rows: [
          [1, 1],
          [2, 2],
          [3, 3],
          [4, 3],
        ],
        createSql: `CREATE TABLE Orders (
  order_number INTEGER PRIMARY KEY,
  customer_number INTEGER
);`,
        insertSql: `INSERT INTO Orders (order_number, customer_number) VALUES
(1, 1),
(2, 2),
(3, 3),
(4, 3);`,
      },
    ],
    expectedOutput: {
      columns: ['customer_number'],
      rows: [
        [3],
      ],
    },
    hints: [
      `Group orders by customer_number and count the orders per customer.`,
      `Order the groups by that count, highest first.`,
      `Take only the top row with LIMIT 1.`,
    ],
    solution: `SELECT customer_number
FROM Orders
GROUP BY customer_number
ORDER BY COUNT(*) DESC
LIMIT 1;`,
    starterCode: `-- Customer Placing the Largest Number of Orders
-- Write your SQL below

SELECT`,
  },
  {
    id: 205,
    title: 'Employees With Missing Information',
    difficulty: 'Easy',
    category: 'select',
    description: `An employee is missing information if their **name** (from Employees) or their **salary** (from Salaries) is absent. Report all such \`employee_id\` values, **ordered ascending**.`,
    tables: [
      {
        name: 'Employees',
        columns: ['employee_id', 'name'],
        rows: [
          [2, 'Crew'],
          [4, 'Haffman'],
        ],
        createSql: `CREATE TABLE Employees (
  employee_id INTEGER PRIMARY KEY,
  name TEXT
);`,
        insertSql: `INSERT INTO Employees (employee_id, name) VALUES
(2, 'Crew'),
(4, 'Haffman');`,
      },
      {
        name: 'Salaries',
        columns: ['employee_id', 'salary'],
        rows: [
          [5, 76071],
          [1, 22517],
          [4, 63539],
        ],
        createSql: `CREATE TABLE Salaries (
  employee_id INTEGER PRIMARY KEY,
  salary INTEGER
);`,
        insertSql: `INSERT INTO Salaries (employee_id, salary) VALUES
(5, 76071),
(1, 22517),
(4, 63539);`,
      },
    ],
    expectedOutput: {
      columns: ['employee_id'],
      rows: [
        [1],
        [2],
        [5],
      ],
    },
    hints: [
      `Employees present in one table but not the other are the ones missing information.`,
      `Ids in Employees but not in Salaries are missing salary; ids in Salaries but not Employees are missing name.`,
      `UNION the two NOT IN sets, then ORDER BY employee_id.`,
    ],
    solution: `SELECT employee_id FROM Employees WHERE employee_id NOT IN (SELECT employee_id FROM Salaries)
UNION
SELECT employee_id FROM Salaries WHERE employee_id NOT IN (SELECT employee_id FROM Employees)
ORDER BY employee_id;`,
    starterCode: `-- Employees With Missing Information
-- Write your SQL below

SELECT`,
  },
  {
    id: 206,
    title: 'Game Play Analysis I',
    difficulty: 'Easy',
    category: 'aggregations',
    description: `For each player, report the **first day they logged in** (their earliest \`event_date\`).

Return \`player_id\` and \`first_login\` in **any order**.`,
    tables: [
      {
        name: 'Activity',
        columns: ['player_id', 'device_id', 'event_date', 'games_played'],
        rows: [
          [1, 2, '2016-03-01', 5],
          [1, 2, '2016-05-02', 6],
          [2, 3, '2017-06-25', 1],
          [3, 1, '2016-03-02', 0],
          [3, 4, '2018-07-03', 5],
        ],
        createSql: `CREATE TABLE Activity (
  player_id INTEGER,
  device_id INTEGER,
  event_date TEXT,
  games_played INTEGER
);`,
        insertSql: `INSERT INTO Activity (player_id, device_id, event_date, games_played) VALUES
(1, 2, '2016-03-01', 5),
(1, 2, '2016-05-02', 6),
(2, 3, '2017-06-25', 1),
(3, 1, '2016-03-02', 0),
(3, 4, '2018-07-03', 5);`,
      },
    ],
    expectedOutput: {
      columns: ['player_id', 'first_login'],
      rows: [
        [1, '2016-03-01'],
        [2, '2017-06-25'],
        [3, '2016-03-02'],
      ],
    },
    hints: [
      `Each player has several activity rows; you want the earliest date per player.`,
      `Group the rows by player_id.`,
      `Use MIN(event_date) to get the first login in each group.`,
    ],
    solution: `SELECT player_id, MIN(event_date) AS first_login
FROM Activity
GROUP BY player_id;`,
    starterCode: `-- Game Play Analysis I
-- Write your SQL below

SELECT`,
  },
  {
    id: 207,
    title: 'Immediate Food Delivery I',
    difficulty: 'Easy',
    category: 'aggregations',
    description: `A delivery is **immediate** if the customer's preferred delivery date equals the order date. Report the **percentage of immediate orders**, rounded to 2 decimals, as \`immediate_percentage\`.`,
    tables: [
      {
        name: 'Delivery',
        columns: ['delivery_id', 'customer_id', 'order_date', 'customer_pref_delivery_date'],
        rows: [
          [1, 1, '2019-08-01', '2019-08-02'],
          [2, 5, '2019-08-02', '2019-08-02'],
          [3, 1, '2019-08-11', '2019-08-12'],
          [4, 3, '2019-08-24', '2019-08-24'],
          [5, 4, '2019-08-21', '2019-08-22'],
          [6, 2, '2019-08-11', '2019-08-13'],
        ],
        createSql: `CREATE TABLE Delivery (
  delivery_id INTEGER PRIMARY KEY,
  customer_id INTEGER,
  order_date TEXT,
  customer_pref_delivery_date TEXT
);`,
        insertSql: `INSERT INTO Delivery (delivery_id, customer_id, order_date, customer_pref_delivery_date) VALUES
(1, 1, '2019-08-01', '2019-08-02'),
(2, 5, '2019-08-02', '2019-08-02'),
(3, 1, '2019-08-11', '2019-08-12'),
(4, 3, '2019-08-24', '2019-08-24'),
(5, 4, '2019-08-21', '2019-08-22'),
(6, 2, '2019-08-11', '2019-08-13');`,
      },
    ],
    expectedOutput: {
      columns: ['immediate_percentage'],
      rows: [
        [33.33],
      ],
    },
    hints: [
      `Flag each row 1 when order_date = customer_pref_delivery_date, else 0.`,
      `The average of that flag is the fraction of immediate orders.`,
      `Multiply by 100 and ROUND(…, 2).`,
    ],
    solution: `SELECT ROUND(AVG(CASE WHEN order_date = customer_pref_delivery_date THEN 1.0 ELSE 0 END) * 100, 2) AS immediate_percentage
FROM Delivery;`,
    starterCode: `-- Immediate Food Delivery I
-- Write your SQL below

SELECT`,
  },
  {
    id: 208,
    title: 'Rearrange Products Table',
    difficulty: 'Easy',
    category: 'advanced-select',
    description: `Rearrange the wide Products table (one column per store) into rows of \`product_id\`, \`store\`, \`price\`. **Omit** rows where a product is not sold in a store (NULL price).

Return the result in **any order**.`,
    tables: [
      {
        name: 'Products',
        columns: ['product_id', 'store1', 'store2', 'store3'],
        rows: [
          [0, 95, 100, 105],
          [1, 70, null, 80],
        ],
        createSql: `CREATE TABLE Products (
  product_id INTEGER PRIMARY KEY,
  store1 INTEGER,
  store2 INTEGER,
  store3 INTEGER
);`,
        insertSql: `INSERT INTO Products (product_id, store1, store2, store3) VALUES
(0, 95, 100, 105),
(1, 70, NULL, 80);`,
      },
    ],
    expectedOutput: {
      columns: ['product_id', 'store', 'price'],
      rows: [
        [0, 'store1', 95],
        [1, 'store1', 70],
        [0, 'store2', 100],
        [0, 'store3', 105],
        [1, 'store3', 80],
      ],
    },
    hints: [
      `This is an unpivot: turn three price columns into three rows per product.`,
      `Write one SELECT per store and combine them with UNION ALL.`,
      `In each SELECT, filter out NULL prices so unsold combinations disappear.`,
    ],
    solution: `SELECT product_id, 'store1' AS store, store1 AS price FROM Products WHERE store1 IS NOT NULL
UNION ALL
SELECT product_id, 'store2', store2 FROM Products WHERE store2 IS NOT NULL
UNION ALL
SELECT product_id, 'store3', store3 FROM Products WHERE store3 IS NOT NULL;`,
    starterCode: `-- Rearrange Products Table
-- Write your SQL below

SELECT`,
  },
  {
    id: 209,
    title: 'Department Highest Salary',
    difficulty: 'Medium',
    category: 'advanced-select',
    description: `Find employees who have the **highest salary in each department**. A department can have multiple top earners.

Return \`Department\`, \`Employee\`, \`Salary\` in **any order**.`,
    tables: [
      {
        name: 'Employee',
        columns: ['id', 'name', 'salary', 'departmentId'],
        rows: [
          [1, 'Joe', 70000, 1],
          [2, 'Jim', 90000, 1],
          [3, 'Henry', 80000, 2],
          [4, 'Sam', 60000, 2],
          [5, 'Max', 90000, 1],
        ],
        createSql: `CREATE TABLE Employee (
  id INTEGER PRIMARY KEY,
  name TEXT,
  salary INTEGER,
  departmentId INTEGER
);`,
        insertSql: `INSERT INTO Employee (id, name, salary, departmentId) VALUES
(1, 'Joe', 70000, 1),
(2, 'Jim', 90000, 1),
(3, 'Henry', 80000, 2),
(4, 'Sam', 60000, 2),
(5, 'Max', 90000, 1);`,
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
  name TEXT
);`,
        insertSql: `INSERT INTO Department (id, name) VALUES
(1, 'IT'),
(2, 'Sales');`,
      },
    ],
    expectedOutput: {
      columns: ['Department', 'Employee', 'Salary'],
      rows: [
        ['IT', 'Jim', 90000],
        ['Sales', 'Henry', 80000],
        ['IT', 'Max', 90000],
      ],
    },
    hints: [
      `First compute the maximum salary per departmentId.`,
      `Join that back to Employee to find everyone matching their department maximum.`,
      `Join Department to translate departmentId into the department name.`,
    ],
    solution: `SELECT d.name AS Department, e.name AS Employee, e.salary AS Salary
FROM Employee e
JOIN Department d ON e.departmentId = d.id
JOIN (SELECT departmentId, MAX(salary) AS ms FROM Employee GROUP BY departmentId) m
  ON e.departmentId = m.departmentId AND e.salary = m.ms;`,
    starterCode: `-- Department Highest Salary
-- Write your SQL below

SELECT`,
  },
  {
    id: 210,
    title: 'Employees Earning More Than Department Average',
    difficulty: 'Medium',
    category: 'subqueries',
    description: `Report each employee whose salary is **strictly greater than the average salary of their own department**.

Return \`name\` and \`salary\` in **any order**.`,
    tables: [
      {
        name: 'Employee',
        columns: ['id', 'name', 'salary', 'departmentId'],
        rows: [
          [1, 'Joe', 70000, 1],
          [2, 'Jim', 90000, 1],
          [3, 'Henry', 80000, 2],
          [4, 'Sam', 60000, 2],
        ],
        createSql: `CREATE TABLE Employee (
  id INTEGER PRIMARY KEY,
  name TEXT,
  salary INTEGER,
  departmentId INTEGER
);`,
        insertSql: `INSERT INTO Employee (id, name, salary, departmentId) VALUES
(1, 'Joe', 70000, 1),
(2, 'Jim', 90000, 1),
(3, 'Henry', 80000, 2),
(4, 'Sam', 60000, 2);`,
      },
    ],
    expectedOutput: {
      columns: ['name', 'salary'],
      rows: [
        ['Jim', 90000],
        ['Henry', 80000],
      ],
    },
    hints: [
      `For each employee you need the average salary of the department they belong to.`,
      `A correlated subquery can compute AVG(salary) for the matching departmentId.`,
      `Keep rows where salary > that correlated average.`,
    ],
    solution: `SELECT e.name AS name, e.salary AS salary
FROM Employee e
WHERE e.salary > (SELECT AVG(e2.salary) FROM Employee e2 WHERE e2.departmentId = e.departmentId);`,
    starterCode: `-- Employees Earning More Than Department Average
-- Write your SQL below

SELECT`,
  },
  {
    id: 211,
    title: 'Nth Highest Salary',
    difficulty: 'Medium',
    category: 'advanced-select',
    description: `Report the **Nth highest distinct salary** from the Employee table. For this dataset, find the **2nd** highest (N = 2). If it does not exist, return \`null\`.

The output column should be named \`getNthHighestSalary\`.`,
    tables: [
      {
        name: 'Employee',
        columns: ['id', 'salary'],
        rows: [
          [1, 100],
          [2, 200],
          [3, 300],
        ],
        createSql: `CREATE TABLE Employee (
  id INTEGER PRIMARY KEY,
  salary INTEGER
);`,
        insertSql: `INSERT INTO Employee (id, salary) VALUES
(1, 100),
(2, 200),
(3, 300);`,
      },
    ],
    expectedOutput: {
      columns: ['getNthHighestSalary'],
      rows: [
        [200],
      ],
    },
    hints: [
      `Distinct salaries sorted descending put the Nth highest in position N — here N = 2.`,
      `ORDER BY salary DESC, then skip N−1 rows with OFFSET and take LIMIT 1.`,
      `Wrap it in an outer SELECT so an empty result becomes NULL instead of no rows.`,
    ],
    solution: `SELECT (
  SELECT DISTINCT salary
  FROM Employee
  ORDER BY salary DESC
  LIMIT 1 OFFSET 1
) AS getNthHighestSalary;`,
    starterCode: `-- Nth Highest Salary
-- Write your SQL below

SELECT`,
  },
  {
    id: 212,
    title: 'Market Analysis I',
    difficulty: 'Medium',
    category: 'advanced-select',
    description: `For each user, report their \`join_date\` and the number of orders they placed **as a buyer in 2019** (\`orders_in_2019\`). Users with no 2019 orders should show 0.

Return the result in **any order**.`,
    tables: [
      {
        name: 'Users',
        columns: ['user_id', 'join_date', 'favorite_brand'],
        rows: [
          [1, '2018-01-01', 'Lenovo'],
          [2, '2018-02-09', 'Samsung'],
          [3, '2018-01-19', 'LG'],
        ],
        createSql: `CREATE TABLE Users (
  user_id INTEGER PRIMARY KEY,
  join_date TEXT,
  favorite_brand TEXT
);`,
        insertSql: `INSERT INTO Users (user_id, join_date, favorite_brand) VALUES
(1, '2018-01-01', 'Lenovo'),
(2, '2018-02-09', 'Samsung'),
(3, '2018-01-19', 'LG');`,
      },
      {
        name: 'Orders',
        columns: ['order_id', 'order_date', 'item_id', 'buyer_id', 'seller_id'],
        rows: [
          [1, '2019-08-01', 4, 1, 2],
          [2, '2018-08-02', 2, 1, 3],
          [3, '2019-08-03', 3, 2, 3],
        ],
        createSql: `CREATE TABLE Orders (
  order_id INTEGER PRIMARY KEY,
  order_date TEXT,
  item_id INTEGER,
  buyer_id INTEGER,
  seller_id INTEGER
);`,
        insertSql: `INSERT INTO Orders (order_id, order_date, item_id, buyer_id, seller_id) VALUES
(1, '2019-08-01', 4, 1, 2),
(2, '2018-08-02', 2, 1, 3),
(3, '2019-08-03', 3, 2, 3);`,
      },
      {
        name: 'Items',
        columns: ['item_id', 'item_brand'],
        rows: [
          [4, 'Lenovo'],
          [2, 'Samsung'],
          [3, 'LG'],
        ],
        createSql: `CREATE TABLE Items (
  item_id INTEGER PRIMARY KEY,
  item_brand TEXT
);`,
        insertSql: `INSERT INTO Items (item_id, item_brand) VALUES
(4, 'Lenovo'),
(2, 'Samsung'),
(3, 'LG');`,
      },
    ],
    expectedOutput: {
      columns: ['buyer_id', 'join_date', 'orders_in_2019'],
      rows: [
        [1, '2018-01-01', 1],
        [2, '2018-02-09', 1],
        [3, '2018-01-19', 0],
      ],
    },
    hints: [
      `Start from Users so every user appears, even with zero orders.`,
      `LEFT JOIN Orders on buyer_id, but restrict the match to 2019 order dates inside the ON clause.`,
      `Group by the user and COUNT the matched order ids (COUNT ignores NULLs).`,
    ],
    solution: `SELECT u.user_id AS buyer_id, u.join_date, COUNT(o.order_id) AS orders_in_2019
FROM Users u
LEFT JOIN Orders o ON u.user_id = o.buyer_id AND o.order_date LIKE '2019%'
GROUP BY u.user_id, u.join_date;`,
    starterCode: `-- Market Analysis I
-- Write your SQL below

SELECT`,
  },
  {
    id: 213,
    title: 'Find the Start and End Number of Continuous Ranges',
    difficulty: 'Medium',
    category: 'advanced-string',
    description: `The Logs table has distinct \`log_id\` values. Report each **continuous range** of ids as \`start_id\`, \`end_id\`, ordered by \`start_id\`.`,
    tables: [
      {
        name: 'Logs',
        columns: ['log_id'],
        rows: [
          [1],
          [2],
          [3],
          [7],
          [8],
          [10],
        ],
        createSql: `CREATE TABLE Logs (
  log_id INTEGER PRIMARY KEY
);`,
        insertSql: `INSERT INTO Logs (log_id) VALUES
(1),
(2),
(3),
(7),
(8),
(10);`,
      },
    ],
    expectedOutput: {
      columns: ['start_id', 'end_id'],
      rows: [
        [1, 3],
        [7, 8],
        [10, 10],
      ],
    },
    hints: [
      `In a continuous run, log_id increases by exactly 1 each step, so (log_id − row_number) is constant across the run.`,
      `Compute ROW_NUMBER() OVER (ORDER BY log_id) and subtract it from log_id to label each run.`,
      `Group by that label and take MIN(log_id) and MAX(log_id).`,
    ],
    solution: `SELECT MIN(log_id) AS start_id, MAX(log_id) AS end_id
FROM (
  SELECT log_id, log_id - ROW_NUMBER() OVER (ORDER BY log_id) AS grp
  FROM Logs
) t
GROUP BY grp
ORDER BY start_id;`,
    starterCode: `-- Find the Start and End Number of Continuous Ranges
-- Write your SQL below

SELECT`,
  },
  {
    id: 214,
    title: 'Friend Requests: Who Has the Most Friends',
    difficulty: 'Medium',
    category: 'aggregations',
    description: `Each accepted request makes the requester and accepter friends of each other. Find the person with the **most friends** and report their \`id\` and friend count \`num\`. The test data guarantees a unique answer.`,
    tables: [
      {
        name: 'RequestAccepted',
        columns: ['requester_id', 'accepter_id', 'accept_date'],
        rows: [
          [1, 2, '2016-06-01'],
          [1, 3, '2016-06-01'],
          [2, 3, '2016-06-02'],
          [3, 4, '2016-06-09'],
        ],
        createSql: `CREATE TABLE RequestAccepted (
  requester_id INTEGER,
  accepter_id INTEGER,
  accept_date TEXT
);`,
        insertSql: `INSERT INTO RequestAccepted (requester_id, accepter_id, accept_date) VALUES
(1, 2, '2016-06-01'),
(1, 3, '2016-06-01'),
(2, 3, '2016-06-02'),
(3, 4, '2016-06-09');`,
      },
    ],
    expectedOutput: {
      columns: ['id', 'num'],
      rows: [
        [3, 3],
      ],
    },
    hints: [
      `A friendship counts for both people involved, so each row contributes to two ids.`,
      `UNION ALL the requester_id column with the accepter_id column into one id list.`,
      `Group by id, count, order by the count descending and take the top row.`,
    ],
    solution: `SELECT id, COUNT(*) AS num
FROM (
  SELECT requester_id AS id FROM RequestAccepted
  UNION ALL
  SELECT accepter_id FROM RequestAccepted
)
GROUP BY id
ORDER BY num DESC
LIMIT 1;`,
    starterCode: `-- Friend Requests: Who Has the Most Friends
-- Write your SQL below

SELECT`,
  },
  {
    id: 215,
    title: 'Consecutive Available Seats (Gaps and Islands)',
    difficulty: 'Medium',
    category: 'advanced-string',
    description: `The Cinema table lists seats with \`free\` = 1 when available. Report the \`seat_id\` of every free seat that is **adjacent to another free seat**, ordered ascending.`,
    tables: [
      {
        name: 'Cinema',
        columns: ['seat_id', 'free'],
        rows: [
          [1, 1],
          [2, 0],
          [3, 1],
          [4, 1],
          [5, 1],
        ],
        createSql: `CREATE TABLE Cinema (
  seat_id INTEGER PRIMARY KEY,
  free INTEGER
);`,
        insertSql: `INSERT INTO Cinema (seat_id, free) VALUES
(1, 1),
(2, 0),
(3, 1),
(4, 1),
(5, 1);`,
      },
    ],
    expectedOutput: {
      columns: ['seat_id'],
      rows: [
        [3],
        [4],
        [5],
      ],
    },
    hints: [
      `Two seats are neighbours when their seat_id values differ by exactly 1.`,
      `Self-join Cinema to itself on abs(a.seat_id − b.seat_id) = 1, requiring both free.`,
      `Use DISTINCT because a seat can be adjacent to a free seat on either side.`,
    ],
    solution: `SELECT DISTINCT a.seat_id
FROM Cinema a
JOIN Cinema b ON ABS(a.seat_id - b.seat_id) = 1 AND a.free = 1 AND b.free = 1
ORDER BY a.seat_id;`,
    starterCode: `-- Consecutive Available Seats (Gaps and Islands)
-- Write your SQL below

SELECT`,
  },
  {
    id: 216,
    title: 'Human Traffic of Stadium (3+ Consecutive Rows)',
    difficulty: 'Hard',
    category: 'advanced-string',
    description: `Report rows from Stadium where **three or more rows with consecutive ids** each have \`people\` ≥ 100. Order the result by \`visit_date\` (equivalently by id).`,
    tables: [
      {
        name: 'Stadium',
        columns: ['id', 'visit_date', 'people'],
        rows: [
          [1, '2017-01-01', 10],
          [2, '2017-01-02', 109],
          [3, '2017-01-03', 150],
          [4, '2017-01-04', 99],
          [5, '2017-01-05', 145],
          [6, '2017-01-06', 1455],
          [7, '2017-01-07', 199],
          [8, '2017-01-09', 188],
        ],
        createSql: `CREATE TABLE Stadium (
  id INTEGER PRIMARY KEY,
  visit_date TEXT,
  people INTEGER
);`,
        insertSql: `INSERT INTO Stadium (id, visit_date, people) VALUES
(1, '2017-01-01', 10),
(2, '2017-01-02', 109),
(3, '2017-01-03', 150),
(4, '2017-01-04', 99),
(5, '2017-01-05', 145),
(6, '2017-01-06', 1455),
(7, '2017-01-07', 199),
(8, '2017-01-09', 188);`,
      },
    ],
    expectedOutput: {
      columns: ['id', 'visit_date', 'people'],
      rows: [
        [5, '2017-01-05', 145],
        [6, '2017-01-06', 1455],
        [7, '2017-01-07', 199],
        [8, '2017-01-09', 188],
      ],
    },
    hints: [
      `First keep only rows with people ≥ 100, then find runs of consecutive ids among them.`,
      `(id − ROW_NUMBER() over ordered ids) is constant within a consecutive run.`,
      `Keep groups whose run length (COUNT) is at least 3.`,
    ],
    solution: `WITH q AS (
  SELECT id, visit_date, people,
         id - ROW_NUMBER() OVER (ORDER BY id) AS grp
  FROM Stadium
  WHERE people >= 100
)
SELECT id, visit_date, people
FROM q
WHERE grp IN (SELECT grp FROM q GROUP BY grp HAVING COUNT(*) >= 3)
ORDER BY id;`,
    starterCode: `-- Human Traffic of Stadium (3+ Consecutive Rows)
-- Write your SQL below

SELECT`,
  },
  {
    id: 217,
    title: 'Trips and Users',
    difficulty: 'Hard',
    category: 'advanced-string',
    description: `The cancellation rate of a day is the number of cancelled requests (by client or driver) divided by the total requests that day, counting **only requests where neither the client nor the driver is banned**. Report the \`Cancellation Rate\` (rounded to 2 decimals) for each day between 2013-10-01 and 2013-10-03.`,
    tables: [
      {
        name: 'Trips',
        columns: ['id', 'client_id', 'driver_id', 'city_id', 'status', 'request_at'],
        rows: [
          [1, 1, 10, 1, 'completed', '2013-10-01'],
          [2, 2, 11, 1, 'cancelled_by_driver', '2013-10-01'],
          [3, 3, 12, 6, 'completed', '2013-10-01'],
          [4, 4, 13, 6, 'cancelled_by_client', '2013-10-01'],
          [5, 1, 10, 1, 'completed', '2013-10-02'],
          [6, 2, 11, 6, 'completed', '2013-10-02'],
          [7, 3, 12, 6, 'completed', '2013-10-02'],
          [8, 2, 12, 12, 'completed', '2013-10-03'],
          [9, 3, 10, 12, 'completed', '2013-10-03'],
          [10, 4, 13, 12, 'cancelled_by_driver', '2013-10-03'],
        ],
        createSql: `CREATE TABLE Trips (
  id INTEGER PRIMARY KEY,
  client_id INTEGER,
  driver_id INTEGER,
  city_id INTEGER,
  status TEXT,
  request_at TEXT
);`,
        insertSql: `INSERT INTO Trips (id, client_id, driver_id, city_id, status, request_at) VALUES
(1, 1, 10, 1, 'completed', '2013-10-01'),
(2, 2, 11, 1, 'cancelled_by_driver', '2013-10-01'),
(3, 3, 12, 6, 'completed', '2013-10-01'),
(4, 4, 13, 6, 'cancelled_by_client', '2013-10-01'),
(5, 1, 10, 1, 'completed', '2013-10-02'),
(6, 2, 11, 6, 'completed', '2013-10-02'),
(7, 3, 12, 6, 'completed', '2013-10-02'),
(8, 2, 12, 12, 'completed', '2013-10-03'),
(9, 3, 10, 12, 'completed', '2013-10-03'),
(10, 4, 13, 12, 'cancelled_by_driver', '2013-10-03');`,
      },
      {
        name: 'Users',
        columns: ['users_id', 'banned', 'role'],
        rows: [
          [1, 'No', 'client'],
          [2, 'Yes', 'client'],
          [3, 'No', 'client'],
          [4, 'No', 'client'],
          [10, 'No', 'driver'],
          [11, 'No', 'driver'],
          [12, 'No', 'driver'],
          [13, 'No', 'driver'],
        ],
        createSql: `CREATE TABLE Users (
  users_id INTEGER PRIMARY KEY,
  banned TEXT,
  role TEXT
);`,
        insertSql: `INSERT INTO Users (users_id, banned, role) VALUES
(1, 'No', 'client'),
(2, 'Yes', 'client'),
(3, 'No', 'client'),
(4, 'No', 'client'),
(10, 'No', 'driver'),
(11, 'No', 'driver'),
(12, 'No', 'driver'),
(13, 'No', 'driver');`,
      },
    ],
    expectedOutput: {
      columns: ['Day', 'Cancellation Rate'],
      rows: [
        ['2013-10-01', 0.33],
        ['2013-10-02', 0],
        ['2013-10-03', 0.5],
      ],
    },
    hints: [
      `Join Trips to Users twice — once for the client, once for the driver — keeping only unbanned (banned = No) people.`,
      `A request is cancelled when status starts with 'cancelled' (by client or driver).`,
      `Group by request_at; rate = SUM(cancelled) / COUNT(*), rounded to 2 decimals.`,
    ],
    solution: `SELECT t.request_at AS Day,
       ROUND(SUM(CASE WHEN t.status LIKE 'cancelled%' THEN 1.0 ELSE 0 END) / COUNT(*), 2) AS "Cancellation Rate"
FROM Trips t
JOIN Users c ON t.client_id = c.users_id AND c.banned = 'No'
JOIN Users d ON t.driver_id = d.users_id AND d.banned = 'No'
WHERE t.request_at BETWEEN '2013-10-01' AND '2013-10-03'
GROUP BY t.request_at
ORDER BY t.request_at;`,
    starterCode: `-- Trips and Users
-- Write your SQL below

SELECT`,
  },
  {
    id: 218,
    title: 'Median Employee Salary',
    difficulty: 'Hard',
    category: 'advanced-string',
    description: `Report the rows holding the **median salary** for each company. For an odd count there is one median row; for an even count there are two middle rows.

Return \`id\`, \`company\`, \`salary\`.`,
    tables: [
      {
        name: 'Employee',
        columns: ['id', 'company', 'salary'],
        rows: [
          [1, 'A', 2341],
          [2, 'A', 341],
          [3, 'A', 15],
          [4, 'A', 15314],
          [5, 'A', 451],
          [6, 'A', 513],
          [7, 'B', 15],
          [8, 'B', 13],
          [9, 'B', 1154],
        ],
        createSql: `CREATE TABLE Employee (
  id INTEGER PRIMARY KEY,
  company TEXT,
  salary INTEGER
);`,
        insertSql: `INSERT INTO Employee (id, company, salary) VALUES
(1, 'A', 2341),
(2, 'A', 341),
(3, 'A', 15),
(4, 'A', 15314),
(5, 'A', 451),
(6, 'A', 513),
(7, 'B', 15),
(8, 'B', 13),
(9, 'B', 1154);`,
      },
    ],
    expectedOutput: {
      columns: ['id', 'company', 'salary'],
      rows: [
        [5, 'A', 451],
        [6, 'A', 513],
        [7, 'B', 15],
      ],
    },
    hints: [
      `Rank salaries within each company and also compute the company row count.`,
      `The middle position(s) satisfy rank ≥ cnt/2 and rank ≤ cnt/2 + 1.`,
      `Use ROW_NUMBER() and COUNT(*) as window functions partitioned by company.`,
    ],
    solution: `WITH r AS (
  SELECT id, company, salary,
         ROW_NUMBER() OVER (PARTITION BY company ORDER BY salary, id) AS rn,
         COUNT(*) OVER (PARTITION BY company) AS cnt
  FROM Employee
)
SELECT id, company, salary
FROM r
WHERE rn >= cnt * 1.0 / 2 AND rn <= cnt * 1.0 / 2 + 1;`,
    starterCode: `-- Median Employee Salary
-- Write your SQL below

SELECT`,
  },
  {
    id: 219,
    title: 'Get the Second Most Recent Activity',
    difficulty: 'Hard',
    category: 'advanced-string',
    description: `For each user report their **second most recent activity**. If a user has only one activity, report that one.

Return \`username\`, \`activity\`, \`startDate\`, \`endDate\`.`,
    tables: [
      {
        name: 'UserActivity',
        columns: ['username', 'activity', 'startDate', 'endDate'],
        rows: [
          ['Alice', 'Travel', '2020-02-12', '2020-02-20'],
          ['Alice', 'Dancing', '2020-02-21', '2020-02-23'],
          ['Alice', 'Travel', '2020-02-24', '2020-02-28'],
          ['Bob', 'Travel', '2020-02-11', '2020-02-18'],
        ],
        createSql: `CREATE TABLE UserActivity (
  username TEXT,
  activity TEXT,
  startDate TEXT,
  endDate TEXT
);`,
        insertSql: `INSERT INTO UserActivity (username, activity, startDate, endDate) VALUES
('Alice', 'Travel', '2020-02-12', '2020-02-20'),
('Alice', 'Dancing', '2020-02-21', '2020-02-23'),
('Alice', 'Travel', '2020-02-24', '2020-02-28'),
('Bob', 'Travel', '2020-02-11', '2020-02-18');`,
      },
    ],
    expectedOutput: {
      columns: ['username', 'activity', 'startDate', 'endDate'],
      rows: [
        ['Alice', 'Dancing', '2020-02-21', '2020-02-23'],
        ['Bob', 'Travel', '2020-02-11', '2020-02-18'],
      ],
    },
    hints: [
      `Rank each user’s activities by startDate descending, and also count how many they have.`,
      `The second most recent is rank 2.`,
      `Also keep the single row when the user’s activity count is 1.`,
    ],
    solution: `WITH r AS (
  SELECT username, activity, startDate, endDate,
         ROW_NUMBER() OVER (PARTITION BY username ORDER BY startDate DESC) AS rn,
         COUNT(*) OVER (PARTITION BY username) AS cnt
  FROM UserActivity
)
SELECT username, activity, startDate, endDate
FROM r
WHERE rn = 2 OR cnt = 1;`,
    starterCode: `-- Get the Second Most Recent Activity
-- Write your SQL below

SELECT`,
  },
  {
    id: 220,
    title: 'Leetcode Tournament Winners',
    difficulty: 'Hard',
    category: 'advanced-string',
    description: `Each player belongs to a group and scores points across matches. The **winner of a group** is the player with the highest total score; ties break to the **lowest player_id**. Report \`group_id\` and the winning \`player_id\`.`,
    tables: [
      {
        name: 'Players',
        columns: ['player_id', 'group_id'],
        rows: [
          [15, 1],
          [25, 1],
          [30, 1],
          [45, 1],
          [10, 2],
          [35, 2],
          [50, 2],
          [20, 3],
          [40, 3],
        ],
        createSql: `CREATE TABLE Players (
  player_id INTEGER PRIMARY KEY,
  group_id INTEGER
);`,
        insertSql: `INSERT INTO Players (player_id, group_id) VALUES
(15, 1),
(25, 1),
(30, 1),
(45, 1),
(10, 2),
(35, 2),
(50, 2),
(20, 3),
(40, 3);`,
      },
      {
        name: 'Matches',
        columns: ['match_id', 'first_player', 'second_player', 'first_score', 'second_score'],
        rows: [
          [1, 15, 45, 3, 0],
          [2, 30, 25, 1, 2],
          [3, 30, 15, 2, 0],
          [4, 40, 20, 5, 2],
          [5, 35, 50, 1, 1],
        ],
        createSql: `CREATE TABLE Matches (
  match_id INTEGER PRIMARY KEY,
  first_player INTEGER,
  second_player INTEGER,
  first_score INTEGER,
  second_score INTEGER
);`,
        insertSql: `INSERT INTO Matches (match_id, first_player, second_player, first_score, second_score) VALUES
(1, 15, 45, 3, 0),
(2, 30, 25, 1, 2),
(3, 30, 15, 2, 0),
(4, 40, 20, 5, 2),
(5, 35, 50, 1, 1);`,
      },
    ],
    expectedOutput: {
      columns: ['group_id', 'player_id'],
      rows: [
        [1, 15],
        [2, 35],
        [3, 40],
      ],
    },
    hints: [
      `A player’s total score comes from matches where they were the first OR the second player.`,
      `UNION ALL the (first_player, first_score) and (second_player, second_score) pairs, then sum per player.`,
      `Rank players within each group by total score DESC, player_id ASC, and keep rank 1.`,
    ],
    solution: `WITH scores AS (
  SELECT first_player AS player_id, first_score AS score FROM Matches
  UNION ALL
  SELECT second_player, second_score FROM Matches
),
tot AS (
  SELECT p.group_id, p.player_id, COALESCE(SUM(s.score), 0) AS total
  FROM Players p
  LEFT JOIN scores s ON p.player_id = s.player_id
  GROUP BY p.group_id, p.player_id
)
SELECT group_id, player_id
FROM (
  SELECT group_id, player_id,
         RANK() OVER (PARTITION BY group_id ORDER BY total DESC, player_id ASC) AS rk
  FROM tot
)
WHERE rk = 1
ORDER BY group_id;`,
    starterCode: `-- Leetcode Tournament Winners
-- Write your SQL below

SELECT`,
  },
  {
    id: 221,
    title: 'Find Cumulative Salary of an Employee',
    difficulty: 'Hard',
    category: 'advanced-string',
    description: `For each employee, report the **cumulative salary over the most recent 3 months, excluding the single most recent month**. Return \`Id\`, \`Month\`, \`Salary\`, ordered by \`Id\` and then \`Month\` descending.`,
    tables: [
      {
        name: 'Employee',
        columns: ['id', 'month', 'salary'],
        rows: [
          [1, 1, 20],
          [1, 2, 30],
          [1, 3, 40],
          [2, 1, 20],
          [2, 2, 30],
        ],
        createSql: `CREATE TABLE Employee (
  id INTEGER,
  month INTEGER,
  salary INTEGER
);`,
        insertSql: `INSERT INTO Employee (id, month, salary) VALUES
(1, 1, 20),
(1, 2, 30),
(1, 3, 40),
(2, 1, 20),
(2, 2, 30);`,
      },
    ],
    expectedOutput: {
      columns: ['Id', 'Month', 'Salary'],
      rows: [
        [1, 2, 50],
        [1, 1, 20],
        [2, 1, 20],
      ],
    },
    hints: [
      `For each employee find their latest month and drop rows in that month.`,
      `For every remaining month, sum salaries from that month and the two months before it.`,
      `A correlated subquery over month BETWEEN month−2 AND month gives the 3-month window sum.`,
    ],
    solution: `WITH mx AS (SELECT id, MAX(month) AS m FROM Employee GROUP BY id)
SELECT e.id AS Id, e.month AS Month,
       (SELECT SUM(e2.salary) FROM Employee e2
        WHERE e2.id = e.id AND e2.month BETWEEN e.month - 2 AND e.month) AS Salary
FROM Employee e
JOIN mx ON e.id = mx.id
WHERE e.month <> mx.m
ORDER BY e.id, e.month DESC;`,
    starterCode: `-- Find Cumulative Salary of an Employee
-- Write your SQL below

SELECT`,
  },
  {
    id: 222,
    title: 'Report Contiguous Dates',
    difficulty: 'Hard',
    category: 'advanced-string',
    description: `Given days a task **failed** and days it **succeeded** in 2019, report the contiguous date periods for each state as \`period_state\`, \`start_date\`, \`end_date\`, ordered by \`start_date\`.`,
    tables: [
      {
        name: 'Failed',
        columns: ['fail_date'],
        rows: [
          ['2018-12-28'],
          ['2018-12-29'],
          ['2019-01-04'],
          ['2019-01-05'],
        ],
        createSql: `CREATE TABLE Failed (
  fail_date TEXT
);`,
        insertSql: `INSERT INTO Failed (fail_date) VALUES
('2018-12-28'),
('2018-12-29'),
('2019-01-04'),
('2019-01-05');`,
      },
      {
        name: 'Succeeded',
        columns: ['success_date'],
        rows: [
          ['2018-12-30'],
          ['2018-12-31'],
          ['2019-01-01'],
          ['2019-01-02'],
          ['2019-01-03'],
          ['2019-01-06'],
        ],
        createSql: `CREATE TABLE Succeeded (
  success_date TEXT
);`,
        insertSql: `INSERT INTO Succeeded (success_date) VALUES
('2018-12-30'),
('2018-12-31'),
('2019-01-01'),
('2019-01-02'),
('2019-01-03'),
('2019-01-06');`,
      },
    ],
    expectedOutput: {
      columns: ['period_state', 'start_date', 'end_date'],
      rows: [
        ['succeeded', '2019-01-01', '2019-01-03'],
        ['failed', '2019-01-04', '2019-01-05'],
        ['succeeded', '2019-01-06', '2019-01-06'],
      ],
    },
    hints: [
      `Combine both tables into one list tagged with its state, restricted to 2019.`,
      `Within a state, subtracting a per-state row number (in date order) from the date yields a constant anchor for each contiguous run.`,
      `Group by (state, anchor) and take MIN/MAX date.`,
    ],
    solution: `WITH t AS (
  SELECT 'failed' AS period_state, fail_date AS dt FROM Failed WHERE fail_date BETWEEN '2019-01-01' AND '2019-12-31'
  UNION ALL
  SELECT 'succeeded', success_date FROM Succeeded WHERE success_date BETWEEN '2019-01-01' AND '2019-12-31'
),
g AS (
  SELECT period_state, dt,
         DATE(dt, '-' || (ROW_NUMBER() OVER (PARTITION BY period_state ORDER BY dt)) || ' days') AS grp
  FROM t
)
SELECT period_state, MIN(dt) AS start_date, MAX(dt) AS end_date
FROM g
GROUP BY period_state, grp
ORDER BY start_date;`,
    starterCode: `-- Report Contiguous Dates
-- Write your SQL below

SELECT`,
  },
  {
    id: 223,
    title: 'Swap Salary',
    difficulty: 'Easy',
    category: 'advanced-string',
    description: `Swap all \`f\` and \`m\` values in the \`sex\` column with a **single UPDATE** (no intermediate temp table). Then \`SELECT * FROM Salary ORDER BY id\` so the editor can verify the swapped table.`,
    tables: [
      {
        name: 'Salary',
        columns: ['id', 'name', 'sex', 'salary'],
        rows: [
          [1, 'A', 'm', 2500],
          [2, 'B', 'f', 1500],
          [3, 'C', 'm', 5500],
          [4, 'D', 'f', 500],
        ],
        createSql: `CREATE TABLE Salary (
  id INTEGER PRIMARY KEY,
  name TEXT,
  sex TEXT,
  salary INTEGER
);`,
        insertSql: `INSERT INTO Salary (id, name, sex, salary) VALUES
(1, 'A', 'm', 2500),
(2, 'B', 'f', 1500),
(3, 'C', 'm', 5500),
(4, 'D', 'f', 500);`,
      },
    ],
    expectedOutput: {
      columns: ['id', 'name', 'sex', 'salary'],
      rows: [
        [1, 'A', 'f', 2500],
        [2, 'B', 'm', 1500],
        [3, 'C', 'f', 5500],
        [4, 'D', 'm', 500],
      ],
    },
    hints: [
      `A single UPDATE with a CASE expression flips each value: m → f and f → m.`,
      `UPDATE Salary SET sex = CASE sex WHEN 'm' THEN 'f' ELSE 'm' END;`,
      `End with SELECT * FROM Salary ORDER BY id so the resulting table is shown and checked.`,
    ],
    solution: `UPDATE Salary SET sex = CASE sex WHEN 'm' THEN 'f' ELSE 'm' END;
SELECT id, name, sex, salary FROM Salary ORDER BY id;`,
    starterCode: `-- Swap Salary
-- Write your SQL below

SELECT`,
  },
];
