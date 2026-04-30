-- Password for all demo users: Password123!
INSERT INTO users (full_name, email, password_hash, role, phone, bio)
VALUES
  (
    'Yuan Liu',
    'yuan.liu@example.com',
    '$2b$12$daAouV9OBCtt2bwkNz9uxeTGsnXXS8FhqAT4yLpbm5w97G000aInm',
    'manager',
    '555-100-1000',
    'Project owner for CPS3500 SESMag assignment.'
  ),
  (
    'Alex Employee',
    'alex.employee@example.com',
    '$2b$12$daAouV9OBCtt2bwkNz9uxeTGsnXXS8FhqAT4yLpbm5w97G000aInm',
    'employee',
    '555-200-2000',
    'Employee profile sample.'
  ),
  (
    'Hannah HR',
    'hannah.hr@example.com',
    '$2b$12$daAouV9OBCtt2bwkNz9uxeTGsnXXS8FhqAT4yLpbm5w97G000aInm',
    'hr',
    '555-300-3000',
    'HR sample account.'
  );

INSERT INTO tasks (title, description, assigned_to, assigned_by, status, progress_percent, due_date)
VALUES
  (
    'Build API auth module',
    'Finalize login/logout and role checks for the project portal.',
    2,
    1,
    'in_progress',
    55,
    CURRENT_DATE + INTERVAL '3 day'
  ),
  (
    'Write integration tests',
    'Add test coverage for task assignment and progress updates.',
    3,
    1,
    'todo',
    10,
    CURRENT_DATE + INTERVAL '5 day'
  );

INSERT INTO progress_notes (task_id, user_id, note, progress_percent)
VALUES
  (
    1,
    2,
    'Implemented auth middleware and started session validation endpoints.',
    55
  ),
  (
    2,
    3,
    'Prepared test plan and selected API route cases for coverage.',
    10
  );
