# Task HTML Generator Skill

## Description
This skill processes tasks from `tasks/task.md` and generates structured HTML files using the "Task _ Project Monitor.html" template.

## Input
- File: `tasks/task.md`

Each task contains:
- Task Number
- ProjectName
- Beneficiary
- Description
- Development Stages
- Review, Deployment & Bug Fix
- Notes
- Date Planned
- Started
- Assignee

## Processing Logic

For each task:

1. Extract fields from markdown
2. Map fields:
   - Notes → Notes field
   - Beneficiary → Beneficiary field
   - Task Number → Task Number field
   - Description → Description field
   - Development Stages -> Development field
   - Review, Deployment & Bug Fix -> Review, Deployment & Bug Fix field
3. Set values:
   - Assignee → "Maahyar" if missing
   - Planning Effort → Planning Effort
   - Planning Date Started → Planning Date Started
   - Planning Target Finish → Planning Target Finish
   - Planning Actual Finish → Planning Actual Finish
   - Design Effort → Planning Effort
   - Design Date Started → Planning Date Started
   - Design Target Finish → Planning Target Finish
   - Design Actual Finish → Planning Actual Finish
   - Coding Effort → Planning Effort
   - Coding Date Started → Planning Date Started
   - Coding Target Finish → Planning Target Finish
   - Coding Actual Finish → Planning Actual Finish
   - Testing Effort → Planning Effort
   - Testing Date Started → Planning Date Started
   - Testing Target Finish → Planning Target Finish
   - Testing Actual Finish → Planning Actual Finish
   - Deployment Effort → Deployment Effort 
   - Deployment Date Started →  Deployment Date Started
   - Deployment Target Finish →  Deployment Target Finish
   - Deployment Actual Finish →  Deployment Actual Finish
   - Review Effort → Review Effort
   - Review Date Started → Review Date Started  
   - Review Target Finish → Review Target Finish 
   - Review Actual Finish → Review Actual Finish 

## Output

For each task, generate:

tasks/Task_{{task_number}}.html

based on:
Task _ Project Monitor.html template

## Rules
- Do not modify unrelated template fields
- One file per task
- Maintain consistent formatting
