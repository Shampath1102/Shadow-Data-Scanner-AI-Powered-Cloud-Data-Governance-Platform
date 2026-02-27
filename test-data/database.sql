-- Database dump
CREATE TABLE users (
    id INT,
    username VARCHAR(50),
    password VARCHAR(50) -- 'admin123'
);

INSERT INTO users VALUES (1, 'admin', 'encrypted_password_here');