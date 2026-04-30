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
