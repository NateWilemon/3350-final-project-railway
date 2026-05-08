DELIMITER $$

-- Creates a procedure that creates a user using email (verifies it's a school email)
-- It also requires a password to be hashed and stores the time the user was created at.
CREATE PROCEDURE create_user (
    IN p_email VARCHAR(255),
    IN p_password_hashed VARCHAR(255)
)
BEGIN
    IF p_email NOT LIKE '%@csub.edu' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Email must have a @csub.edu address';
    END IF;

    INSERT INTO users (email, password_hashed, created_at)
    VALUES (p_email, p_password_hashed, NOW());
END $$

-- This is how a profile is created for a user.
CREATE PROCEDURE create_profile (
    IN p_user_id INT,
    IN p_name VARCHAR(100),
    IN p_birthdate DATE,
    IN p_gender VARCHAR(50),
    IN p_looking_for VARCHAR(100),
    IN p_major VARCHAR(100),
    IN p_bio TEXT
)
BEGIN
    INSERT INTO profiles (user_id, name, birthdate, gender, looking_for, major, bio)
    VALUES (p_user_id, p_name, p_birthdate, p_gender, p_looking_for, p_major, p_bio);
END $$

-- This is going to tell us what happened upon a swipe being done.
CREATE PROCEDURE record_swipe (
    IN p_user_id INT,
    IN p_target_id INT,
    IN p_decision VARCHAR(50)
)
BEGIN
    INSERT INTO swipes (user_id, target_id, decision)
    VALUES (p_user_id, p_target_id, p_decision);
END $$

CREATE PROCEDURE create_match (
    IN p_user1_id INT,
    IN p_user2_id INT
)
BEGIN
    INSERT INTO matches (user1_id, user2_id, status, matched_at)
    VALUES (p_user1_id, p_user2_id, 'active', NOW());

    SELECT LAST_INSERT_ID() AS match_id;
END $$


-- This puts our match into a conversation.
CREATE PROCEDURE create_conversation (
    IN p_match_id INT
)
BEGIN
    INSERT INTO conversations (match_id, last_message_at)
    VALUES (p_match_id, NOW());
END $$

-- This is our procedure for sending a message.
CREATE PROCEDURE send_message (
    IN p_conversation_id INT,
    IN p_user_id INT,
    IN p_body TEXT
)
BEGIN
    INSERT INTO messages (conversation_id, user_id, body, sent_at)
    VALUES (p_conversation_id, p_user_id, p_body, NOW());

    UPDATE conversations
    SET last_message_at = NOW()
    WHERE conversation_id = p_conversation_id;
END $$

-- This is the procedure for creating a report when a user reports another user.
CREATE PROCEDURE create_report (
    IN p_user_id INT,
    IN p_conversation_id INT,
    IN p_reason VARCHAR(255),
    IN p_details TEXT
)
BEGIN
    INSERT INTO reports (user_id, conversation_id, reason, details, stat)
    VALUES (p_user_id, p_conversation_id, p_reason, p_details, 'pending');
END $$

-- Inserting hobbies into a profile.
CREATE PROCEDURE add_profile_hobby (
    IN p_profile_id INT,
    IN p_hobby_id INT
)
BEGIN
    INSERT INTO profile_hobbies (profile_id, hobby_id)
    VALUES (p_profile_id, p_hobby_id);
END $$

-- This procedure helps with matchmaking.
-- It returns users who match preferences and share either a major or at least one hobby.
-- Users swiped yes are hidden, but users swiped no can reappear later.
CREATE PROCEDURE get_discover_candidates (
    IN p_user_id INT
)
BEGIN
    SELECT DISTINCT
        u.user_id,
        p.profile_id,
        p.name,
        p.birthdate,
        p.gender,
        p.looking_for,
        p.major,
        p.bio,
        CASE
            WHEN s.swipe_id IS NULL THEN 0
            WHEN s.decision = 'no' THEN 1
        END AS queue_order
    FROM users u
    JOIN profiles p
        ON u.user_id = p.user_id
    JOIN profiles me
        ON me.user_id = p_user_id
    LEFT JOIN swipes s
        ON s.user_id = p_user_id
       AND s.target_id = u.user_id
    LEFT JOIN profile_hobbies ph_candidate
        ON ph_candidate.profile_id = p.profile_id
    LEFT JOIN profile_hobbies ph_me
        ON ph_me.profile_id = me.profile_id
       AND ph_me.hobby_id = ph_candidate.hobby_id
    WHERE u.user_id <> p_user_id
      AND (s.swipe_id IS NULL OR s.decision = 'no')
      AND p.gender = me.looking_for
      AND p.looking_for = me.gender
      AND (
            p.major = me.major
            OR ph_me.hobby_id IS NOT NULL
          )
    ORDER BY queue_order ASC;
END $$



--This is going to get the profile of a user given their id.
-- gives the profile id, name, birthdate, etc, etc.
CREATE PROCEDURE get_user_profile (
    IN p_user_id INT
)
BEGIN
    SELECT
        p.profile_id,
        p.name,
        p.birthdate,
        p.gender,
        p.looking_for,
        p.major,
        p.bio,
        u.email,
        u.email_verified,
        u.status,
        u.created_at,
        u.last_login
    FROM profiles p
    JOIN users u
        ON p.user_id = u.user_id
    WHERE p.user_id = p_user_id;
END $$

--Get the active matches for users. 
CREATE PROCEDURE get_user_matches (
    IN p_user_id INT
)
BEGIN
    SELECT
        match_id,
        user1_id,
        user2_id,
        status,
        matched_at,
        closed_at,
        close_reason
    FROM matches
    WHERE (user1_id = p_user_id
       OR user2_id = p_user_id)
      AND status = 'active';
END $$


-- Checks if two users have both swiped yes on each other.
CREATE PROCEDURE check_mutual_like (
    IN p_user_id INT,
    IN p_target_id INT
)
BEGIN
    SELECT COUNT(*) AS mutual_like_count
    FROM swipes s1
    JOIN swipes s2
        ON s1.user_id = p_user_id
       AND s1.target_id = p_target_id
       AND s1.decision = 'yes'
       AND s2.user_id = p_target_id
       AND s2.target_id = p_user_id
       AND s2.decision = 'yes';
END $$

--gets the conversation for given match id
CREATE PROCEDURE get_conversation_by_match (
    IN p_match_id INT
)
BEGIN
    SELECT
        conversation_id,
        last_message_at,
        closed_at,
        close_reason,
        match_id
    FROM conversations
    WHERE match_id = p_match_id;
END $$

-- get all messages for a conversation. 
CREATE PROCEDURE get_conversation_messages (
    IN p_conversation_id INT
)
BEGIN
    SELECT
        message_id,
        body,
        sent_at,
        conversation_id,
        user_id,
        report_id
    FROM messages
    WHERE conversation_id = p_conversation_id
    ORDER BY sent_at ASC;
END $$
 
-- this shows what hobbies a profile has. 
CREATE PROCEDURE get_profile_hobbies (
    IN p_profile_id INT
)
BEGIN
    SELECT
        h.hobby_id,
        h.hobby
    FROM profile_hobbies ph
    JOIN hobbies h
        ON ph.hobby_id = h.hobby_id
    WHERE ph.profile_id = p_profile_id;
END $$

-- this shows all the conversations a user is having as well as match info. 
CREATE PROCEDURE get_user_conversations (
    IN p_user_id INT
)
BEGIN
    SELECT
        c.conversation_id,
        c.is_revealed,
        c.last_message_at,
        c.closed_at,
        c.close_reason,
        c.match_id,
        m.user1_id,
        m.user2_id
    FROM conversations c
    JOIN matches m
        ON c.match_id = m.match_id
    WHERE m.user1_id = p_user_id
       OR m.user2_id = p_user_id;
END $$

--get all photos for a profile
CREATE PROCEDURE get_profile_photos (
    IN p_profile_id INT
)
BEGIN
    SELECT
        photo_id,
        position,
        is_primary,
        is_approved,
        profile_id
    FROM profile_photos
    WHERE profile_id = p_profile_id
    ORDER BY position ASC;
END $$

-- Blocks one user from interacting with another user. 
CREATE PROCEDURE block_user{
    IN p_blocker_user_id INT, 
    IN p_blocked_user_id INT
}
BEGIN
    INSERT INTO user_blocks (blocker_user_id, blocked_user_id)
    VALUES (p_blocker_user_id, p_blocked_user_id);
END $$





DELIMITER ;
