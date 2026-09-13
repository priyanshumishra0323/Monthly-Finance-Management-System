<!DOCTYPE html>
<html>
<head>
</head>
<body>

<h1>Monthly Finance Tracker</h1>

<h2>Project Description</h2>

<p>
Monthly Finance Tracker is a web-based personal finance management application developed using HTML, CSS, and JavaScript.
It helps users manage their monthly income and expenses, view financial summaries, analyze spending by category,
and maintain transaction history.
</p>

<h2>Features</h2>

<ul>
    <li>Add Income</li>
    <li>Add Expense</li>
    <li>Monthly Finance Tracking</li>
    <li>Income Summary</li>
    <li>Expense Summary</li>
    <li>Net Balance Calculation</li>
    <li>Category-wise Expense Breakdown</li>
    <li>Transaction History</li>
    <li>Undo Last Transaction</li>
    <li>Previous and Next Month Navigation</li>
</ul>

<h2> ⚒️ Technologies Used</h2>

<ul>
    <li>HTML5</li>
    <li>CSS3</li>
    <li>JavaScript (ES6+)</li>
</ul>

<h2>Data Structures Used</h2>

<h3>1. Hash Map</h3>

<p>
Monthly records are stored using JavaScript Objects. Every month acts as a key
and stores all transaction information for that month.
</p>

<h3>2. Stack</h3>

<p>
A Stack is used for the Undo functionality. The most recently added transaction
is removed first using the LIFO (Last In First Out) principle.
</p>

<h3>3. Array</h3>

<p>
Each month's transactions are stored inside an Array.
</p>

<h2>Working</h2>

<ol>
    <li>Select Income or Expense.</li>
    <li>Select a Category.</li>
    <li>Enter Description.</li>
    <li>Enter Amount.</li>
    <li>Click on "Add Record".</li>
    <li>The application stores the transaction.</li>
    <li>Income, Expense, and Net Balance are updated automatically.</li>
    <li>Category totals are updated.</li>
    <li>The transaction appears in the Transaction History.</li>
    <li>Users can move between months using Previous Month and Next Month buttons.</li>
    <li>The Undo button removes the last added transaction.</li>
</ol>

<h2>License</h2>

<p>
This project is developed for educational and academic purposes. Anyone can use,
modify, and improve this project for learning and practice.
</p>

</body>
</html>
