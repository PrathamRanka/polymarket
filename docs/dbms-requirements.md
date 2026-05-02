# DBMS Project Synopsis Requirements

## Course Information
- **Course Name:** Database Management Systems
- **Course Code:** UCS310
- **Degree:** B.Tech (2nd Year)

---

# 1. Title Page
Include:

- Project Title
- Course Name & Code
- Degree & Year
- Department / Institute Name
- Group Members (2–3 students) with Roll Numbers
- Lab Instructor Name
- Academic Year

---

# 2. Introduction
Include:

- Brief introduction to application domain
- Motivation for selecting the problem
- Why DBMS is better than file-based systems
- Importance of structured data storage

Example:
If building a prediction market platform:
Explain how large volumes of users, markets, trades, transactions, and outcomes require relational storage.

---

# 3. Problem Statement
Clearly define:

- Real-world problem being solved
- Existing system limitations
- Manual inefficiencies
- How database solves scalability/integrity issues

Example:
Traditional betting systems lack transparency, efficient transaction handling, and proper relational tracking.

---

# 4. Objectives of Project
Must include:

- Design ER model
- Convert ER → relational schema
- Apply normalization (up to 3NF/BCNF)
- Implement SQL queries
- Implement PL/SQL features
- Ensure data consistency
- Use transactions

---

# 5. Scope of Project
Define:

- Functional boundaries
- User roles
- System modules
- Backend-focused scope

Example:
Admin:
- Manage markets
- Resolve outcomes

Users:
- Place trades
- Manage wallets
- View predictions

System:
- Settlement engine
- Transaction management

---

# 6. Proposed System Description
Explain:

- System workflow
- Features
- Database efficiency improvements
- Integrity improvements

Example workflow:
1. User registers
2. User adds wallet balance
3. User enters prediction market
4. Places trade
5. Market closes
6. Winners receive payouts

---

# 7. Database Design

## 7.1 ER Diagram
Must define:

- Entities
- Attributes
- Relationships
- Cardinality
- Constraints

Example entities:
- Users
- Markets
- Orders
- Transactions
- Wallets
- Outcomes
- Admins

---

## 7.2 Relational Schema
For each table define:

- Table name
- Primary key
- Foreign key
- Relationships

Example:

Users(user_id PK, name, email)

Markets(market_id PK, title, expiry_date)

Orders(order_id PK, user_id FK, market_id FK)

Transactions(transaction_id PK, user_id FK)

---

# 8. Normalization

Document:

- Functional dependencies
- 1NF
- 2NF
- 3NF
- BCNF (if applicable)

Show final normalized schema.

---

# 9. Database Implementation

## 9.1 SQL Implementation

Must include:

### DDL
- CREATE
- ALTER
- DROP

### DML
- INSERT
- UPDATE
- DELETE

### Queries
- Joins
- Subqueries
- Aggregate functions
- GROUP BY
- HAVING
- Views

---

## 9.2 PL/SQL Components

Must include:

- Stored Procedures
- Functions
- Triggers
- Cursors
- Exception Handling

Example:
- Auto wallet deduction trigger
- Trade settlement procedure
- User profit calculation function

---

# 10. Transaction Management & Concurrency
(Optional but highly recommended)

Include:

- COMMIT
- ROLLBACK
- SAVEPOINT
- ACID properties
- Lock handling
- Consistency mechanisms

Example:
Prevent double spending during simultaneous trades.

---

# 11. Tools & Technologies Used

Mention:

- Oracle / MySQL / PostgreSQL
- SQL
- PL/SQL
- SQL Developer / MySQL Workbench
- Optional frontend/backend stack

Example:
- Next.js
- Node.js
- PostgreSQL

---

# 12. Expected Outcomes

Must demonstrate:

- Fully normalized database
- Efficient query performance
- Automated triggers/procedures
- Strong data integrity
- Real-world applicability

---

# AI Instructions

When analyzing this repository:

1. Read this file first
2. Analyze `/db` folder
3. Analyze backend APIs
4. Identify entities automatically
5. Generate:
   - ER diagram
   - Relational schema
   - Normalization explanation
   - SQL scripts
   - PL/SQL scripts
   - Final synopsis
   - Final LaTeX report

Prioritize backend/database implementation over frontend UI.