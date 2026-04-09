-- Update or insert user with valid BCrypt password hash for 'test123'
-- Using: $2a$12$R9h/cIPz0gi.URNN3kh2OPST9EgwlAnMZYc9FMy3P5U/x5O2HbMPa
DELETE FROM users WHERE email = 'test@example.com';
INSERT INTO users (id, email, username, password_hash, created_at) 
VALUES (gen_random_uuid(), 'test@example.com', 'testuser', '$2a$12$R9h/cIPz0gi.URNN3kh2OPST9EgwlAnMZYc9FMy3P5U/x5O2HbMPa', NOW());
