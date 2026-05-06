USE datingapp;

INSERT INTO users (email, password_hashed, email_verified, status, created_at)
VALUES
('user1@csub.edu', 'hashed_pw1', TRUE, 'active', NOW()),
('user2@csub.edu', 'hashed_pw2', TRUE, 'active', NOW()),
('user3@csub.edu', 'hashed_pw3', TRUE, 'active', NOW()),
('user4@csub.edu', 'hashed_pw4', TRUE, 'active', NOW());

INSERT INTO profiles (user_id, name, birthdate, gender, looking_for, major, bio)
VALUES
(1, 'Alice', '2003-05-01', 'Female', 'Male', 'Computer Science', 'I like coding and coffee'),
(2, 'Bob', '2002-08-12', 'Male', 'Female', 'Computer Science', 'Gaming and gym'),
(3, 'Charlie', '2001-02-20', 'Male', 'Female', 'Math', 'Math nerd and chess player'),
(4, 'Diana', '2004-11-30', 'Female', 'Male', 'Computer Science', 'Travel and photography');

INSERT INTO hobbies (hobby)
VALUES
('gaming'),
('travel'),
('reading'),
('gym'),
('photography'),
('chess');

INSERT INTO profile_hobbies (profile_id, hobby_id)
VALUES
(1, 1), -- Alice gaming
(1, 3), -- Alice reading
(2, 1), -- Bob gaming
(2, 4), -- Bob gym
(3, 6), -- Charlie chess
(3, 3), -- Charlie reading
(4, 2), -- Diana travel
(4, 5); -- Diana photography

INSERT INTO swipes (user_id, target_id, decision)
VALUES
(1, 2, 'yes'),
(2, 1, 'yes'), -- mutual like between user with id 1 and user with id 2
(1, 3, 'no'),
(3, 1, 'yes'),
(4, 2, 'yes');

INSERT INTO matches (user1_id, user2_id, status, matched_at)
VALUES
(1, 2, 'active', NOW());

INSERT INTO conversations (match_id, last_message_at)
VALUES
(1, NOW());


INSERT INTO messages (conversation_id, user_id, body, sent_at)
VALUES
(1, 1, 'Hey Bob!', NOW()),
(1, 2, 'Hey Alice! What’s up?', NOW());

INSERT INTO reveal_requests (match_id, user_id)
VALUES
(1, 1);

INSERT INTO reports (user_id, conversation_id, reason, details, stat)
VALUES
(1, 1, 'Spam', 'Testing report', 'pending');
