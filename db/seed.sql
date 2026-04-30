-- Password for all demo users: Password123!
INSERT INTO users (full_name, email, password_hash, role, phone, bio)
VALUES
  (
    'Yuan Liu',
    'yuan.liu@example.com',
    '$2b$12$L0Qf0TkPG4eHeBf4FD4rg.CW97z8wM/i7m4MUb8RhxPFfY2qM2N/C',
    'manager',
    '555-100-1000',
    'Project owner for CPS3500 SESMag assignment.'
  ),
  (
    'Alex Employee',
    'alex.employee@example.com',
    '$2b$12$L0Qf0TkPG4eHeBf4FD4rg.CW97z8wM/i7m4MUb8RhxPFfY2qM2N/C',
    'employee',
    '555-200-2000',
    'Employee profile sample.'
  ),
  (
    'Hannah HR',
    'hannah.hr@example.com',
    '$2b$12$L0Qf0TkPG4eHeBf4FD4rg.CW97z8wM/i7m4MUb8RhxPFfY2qM2N/C',
    'hr',
    '555-300-3000',
    'HR sample account.'
  );
