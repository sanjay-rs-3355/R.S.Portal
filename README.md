🚀 R.S. Portal – Real-Time Collaboration Platform

A full-stack project management and team collaboration system built using Node.js, Express, MySQL, Socket.IO, and Vanilla JavaScript.

🔧 Tech Stack

Frontend:

    HTML, CSS, JavaScript

    Chart.js (analytics)

    Socket.IO (real-time updates)

Backend:

    Node.js

    Express.js

    MySQL

    JWT Authentication

    REST API Architecture

📌 Core Features

1.User Registration & Login (JWT-based authentication)

2.Create & Manage Projects

3.Add / Remove Project Members

4.Task Management (status, priority, deadline)

5.Dynamic Dashboard with real-time statistics

6.Project-based real-time chat

7.Secure API routes with middleware protection

🗄️ Database Structure

1.Relational schema including:

2.users

3.projects

4.project_members

5.tasks

6.task_status_history

7.messages

8.notifications

9.project_invitations

Supports:

1.One-to-many (projects → tasks)

2.Many-to-many (projects ↔ users)

📊 Dashboard Includes

1.Total Projects

2.Total Tasks

3.Completed Tasks

4.Total Members

5.Task Status Distribution (Dynamic Doughnut Chart)

6.Upcoming Deadlines

Team Overview

🔌 API Modules

/api/auth – Authentication

/api/dashboard – Analytics

/api/projects – Project management

/api/tasks – Task management

Real-time messaging via Socket.IO

▶️ Run Locally
npm install
npm start

Server runs at:

http://localhost:5000

🎯 Purpose

1.Built to demonstrate:

2.Secure authentication flow

3.REST API design

4.Relational database modeling

5.Real-time communication

6.Full-stack integration
