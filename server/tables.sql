CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hashed VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    status VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login DATETIME
);

CREATE TABLE hobbies (
    hobby_id INT AUTO_INCREMENT PRIMARY KEY,
    hobby VARCHAR(100) NOT NULL
);


CREATE TABLE matches (
    match_id INT AUTO_INCREMENT PRIMARY KEY,
    user1_id INT NOT NULL,
    user2_id INT NOT NULL,
    status VARCHAR(50),
    matched_at DATETIME,
    closed_at DATETIME,
    close_reason VARCHAR(255),

    FOREIGN KEY (user1_id) REFERENCES users (user_id),
    FOREIGN KEY (user2_id) REFERENCES users(user_id)
);

CREATE TABLE conversations (
    conversation_id INT AUTO_INCREMENT PRIMARY KEY,
    ,
    last_message_at DATETIME,
    closed_at DATETIME,
    close_reason VARCHAR(255),
    match_id INT,

    FOREIGN KEY (match_id) REFERENCES matches(match_id)
);

CREATE TABLE user_conversations (
    user_id INT NOT NULL,
    conversation_id INT NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,

    PRIMARY KEY (user_id, conversation_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id)
);

CREATE TABLE profiles (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    birthdate DATE,
    gender VARCHAR(50),
    looking_for VARCHAR(100),
    major VARCHAR(100),
    bio TEXT,
    user_id INT,

    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE moderation (
    action_id INT AUTO_INCREMENT PRIMARY KEY,
    action_type VARCHAR(100),
    reason TEXT,
    start_at DATETIME,
    end_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INT,

    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE swipes (
    swipe_id INT AUTO_INCREMENT PRIMARY KEY,
    target_id INT NOT NULL,
    decision VARCHAR(50),
    user_id INT,

    FOREIGN KEY (target_id) REFERENCES users(user_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    reason VARCHAR(255),
    details TEXT,
    stat VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INT,
    conversation_id INT,

    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id)
);

CREATE TABLE messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    body TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    conversation_id INT,
    user_id INT,
    report_id INT,

    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (report_id) REFERENCES reports(report_id)
);

CREATE TABLE user_blocks (
    block_id INT AUTO_INCREMENT PRIMARY KEY,
    blocker_user_id int NOT NULL,
    blocked_user_id int NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (blocker_user_id) REFERENCES users(user_id),
    FOREIGN KEY (blocked_user_id) REFERENCES users(user_id)
);

CREATE TABLE profile_photos (
    photo_id INT AUTO_INCREMENT PRIMARY KEY,
    position INT,
    is_primary BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    profile_id INT,
    file_path VARCHAR(255),

    FOREIGN KEY (profile_id) REFERENCES profiles(profile_id)
);

CREATE TABLE profile_hobbies (
    profile_id INT NOT NULL,
    hobby_id INT NOT NULL,

    PRIMARY KEY (profile_id, hobby_id),

    FOREIGN KEY (profile_id) REFERENCES profiles(profile_id),
    FOREIGN KEY (hobby_id) REFERENCES hobbies(hobby_id)
);

CREATE TABLE one_time_codes (
    user_id INT,
    code VARCHAR(6),
    expiresAt DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
