# Task HTML Generator Skill

## Description
This skill processes tasks from `tasks/task.md` and generates structured HTML files using the "Task _ Project Monitor.html" template.

## Input
- File: `tasks/task.md`

Each task contains:
- Task Number
- Description
- Notes
- Beneficiary
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
3. Set values:
   - Assignee → "Maahyar" if missing
   - Date Planned → original value
   - Started → original value
   - Date Received → current date

## Output

For each task, generate:

tasks/Task_{{task_number}}.html

based on:
Task _ Project Monitor.html template

## Rules
- Do not modify unrelated template fields
- One file per task
- Maintain consistent formatting
