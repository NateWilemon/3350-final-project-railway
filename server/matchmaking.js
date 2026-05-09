const { size, uniq } = require("lodash");
const dotenv = require('dotenv');
dotenv.config();
const fs = require('fs');
const mysql = require('mysql2');



// Source - https://stackoverflow.com/a/21984136
// Posted by André Snede, modified by community. See post 'Timeline' for change history
// Retrieved 2026-05-02, License - CC BY-SA 4.0

function _calculateAge(birthday) { // birthday is a date
    var ageDifMs = Date.now() - birthday.getTime();
    var ageDate = new Date(ageDifMs); // miliseconds from epoch
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}


module.exports = function startMatchmaking(app, con) {
    app.post('/getQueue', async (req, res) => {
        const { userID } = req.body;
        console.log(req.body);
        //checks if they submitted user
        if (!userID) {
            return res.json({ message: 'Requires UserID' });
        }
        //checks if user exists
        con.query('SELECT * FROM users WHERE user_id = ?', [userID], (err, rows) => {
            if (err)
                return res.json({ message: 'Database error' });
            if (rows.length === 0)
                return res.json({ message: 'UserId does not exist' });

            //stores user profile
            con.query('CALL get_user_profile(?)',
                [userID],
                (err, results) => {
                    if (err)
                        return res.json({ message: 'Database error', error: err.message });
                    let user = results[0][0];
                    //console.log(user);

                    //gets hobbies for user
                    con.query('CALL get_profile_hobbies(?)',
                        [user.profile_id],
                        (err, results) => {
                            if (err)
                                return res.json({ message: 'Database error', error: err.message });
                            user.hobbies = results[0].map(r => r.hobby);

                            //gets cannidates for matchmaking
                            //query includes hard filters
                            con.query('CALL get_discover_candidates(?)',
                                [userID],
                                (err, results) => {
                                    if (err)
                                        return res.json({ message: 'Database error', error: err.message });
                                    let canidates = results[0];
                                    console.log(canidates);

                                    //gets hobbies for canidates
                                    const hobbyPromises = canidates.map((mat) => {
                                        return new Promise((resolve, reject) => {
                                            con.query('CALL get_profile_hobbies(?)', [mat.profile_id], (err, results) => {
                                                if (err) reject(err);
                                                mat.hobbies = results[0].map(r => r.hobby);
                                                resolve();
                                            });
                                        });
                                    });

                                    Promise.all(hobbyPromises).then(() => {
                                        let matchQueue = [];
                                        canidates.forEach((mat) => {
                                            //rank matches, rank with 3 categories
                                            let majorWeight = 0, hobbyWeight = 0, ageWeight = 0;

                                            //major
                                            if (user.major == mat.major)
                                                majorWeight = 1;

                                            //hobby
                                            let hobCount = 0;
                                            let uniqueHobbies = 0;
                                            hobCount = user.hobbies.filter(hob => mat.hobbies.includes(hob)).length;
                                            uniqueHobbies = new Set(user.hobbies.concat(mat.hobbies)).size;
                                            if (hobCount == 0)
                                                hobbyWeight = 0;
                                            else
                                                hobbyWeight = hobCount / uniqueHobbies;

                                            //age
                                            let mainAge = _calculateAge(new Date(user.birthdate));
                                            let matAge = _calculateAge(new Date(mat.birthdate));
                                            let ageDiff = Math.abs(mainAge - matAge);
                                            const k = 0.15; //exponential decay rate
                                            ageWeight = Math.exp(-k * ageDiff);

                                            //final answer
                                            let answer = (majorWeight + hobbyWeight + ageWeight) / 3;
                                            console.log(answer);

                                            matchQueue.push({
                                                id: mat.user_id,
                                                score: answer,
                                                profile_id: mat.profile_id,
                                                name: mat.name,
                                                birthdate: mat.birthdate,
                                                age: _calculateAge(new Date(mat.birthdate)),
                                                major: mat.major,
                                                bio: mat.bio,
                                                gender: mat.gender,
                                                profile_picture: mat.profile_picture,
                                                hobbies: mat.hobbies
                                            });
                                        });

                                        matchQueue.sort((a, b) => b.score - a.score);
                                        return res.json({ queue: matchQueue });

                                    }).catch((err) => res.json({ message: 'Database error', error: err.message }));
                                }
                            );
                        }
                    );
                }
            );
        });
    });

// API endpoint to close a conversation
app.post('/closeConversation', (req, res) => {
    const { conversationID } = req.body;

    if (!conversationID) {
        return res.status(400).json({
            message: 'Send conversationID'
        });
    }

    con.query(
        `
        UPDATE conversations
        SET closed_at = NOW(),
            close_reason = 'closed'
        WHERE conversation_id = ?
        `,
        [conversationID],
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    message: 'Database error while closing conversation',
                    error: err.message
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: 'Conversation not found'
                });
            }

            return res.json({
                message: 'Conversation closed successfully',
                conversationID: conversationID
            });
        }
    );
});


// API endpoint to block a user
app.post('/blockUser', (req, res) => {
    const { userID, targetUserID } = req.body;

    if (!userID || !targetUserID) {
        return res.status(400).json({
            message: 'Send userID and targetUserID'
        });
    }

    con.query(
        'CALL block_user(?, ?)',
        [userID, targetUserID],
        (err) => {
            if (err) {
                return res.status(500).json({
                    message: 'Database error while blocking user',
                    error: err.message
                });
            }

            con.query(
                `
                UPDATE matches
                SET status = 'closed',
                    closed_at = NOW(),
                    close_reason = 'blocked'
                WHERE (user1_id = ? AND user2_id = ?)
                   OR (user1_id = ? AND user2_id = ?)
                `,
                [userID, targetUserID, targetUserID, userID],
                (err) => {
                    if (err) {
                        return res.status(500).json({
                            message: 'User blocked, but error closing match',
                            error: err.message
                        });
                    }

                    return res.json({
                        message: 'User blocked successfully',
                        blockedUserID: targetUserID
                    });
                }
            );
        }
    );
});





    // API endpoint to swipe yes or no
    app.post('/swipe', async (req, res) => {
        console.log(req.body);

        const { userID, targetUserID, decision } = req.body;

        if (!userID || !targetUserID || !decision) {
            return res.status(400).json({
                message: "Send userID, targetUserID, and decision as 'yes' or 'no'"
            });
        }

        if (decision !== 'yes' && decision !== 'no') {
            return res.status(400).json({
                message: "Decision must be 'yes' or 'no'"
            });
        }

        con.query(
            'CALL record_swipe(?, ?, ?)',
            [userID, targetUserID, decision],
            (err) => {
                if (err) {
                    return res.status(500).json({
                        message: 'Database error while recording swipe',
                        error: err.message
                    });
                }

                if (decision === 'no') {
                    return res.json({
                        message: 'Swipe recorded',
                        swipe: decision,
                        matched: false
                    });
                }

                con.query(
                    'CALL check_mutual_like(?, ?)',
                    [userID, targetUserID],
                    (err, results) => {
                        if (err) {
                            return res.status(500).json({
                                message: 'Database error while checking mutual like',
                                error: err.message
                            });
                        }

                        const mutualLikeCount = results[0][0].mutual_like_count;

                        if (mutualLikeCount === 0) {
                            return res.json({
                                message: 'Swipe recorded, no match yet',
                                swipe: decision,
                                matched: false
                            });
                        }

                        con.query(
                            'CALL create_match(?, ?)',
                            [userID, targetUserID],
                            (err, matchResults) => {
                                if (err) {
                                    return res.status(500).json({
                                        message: 'Database error while creating match',
                                        error: err.message
                                    });
                                }

                                const matchID = matchResults[0][0].match_id;

                                con.query(
                                    'CALL create_conversation(?)',
                                    [matchID],
                                    (err) => {
                                        if (err) {
                                            return res.status(500).json({
                                                message: 'Database error while creating conversation',
                                                error: err.message
                                            });
                                        }

                                        return res.json({
                                            message: 'Swipe recorded and match created',
                                            swipe: decision,
                                            matched: true,
                                            matchID: matchID
                                        });
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    });

// API endpoint to unblock a user
app.post('/unblockUser', (req, res) => {
    const { userID, targetUserID } = req.body;

    if (!userID || !targetUserID) {
        return res.status(400).json({
            message: 'Send userID and targetUserID'
        });
    }

    con.query(
        `
        DELETE FROM user_blocks
        WHERE blocker_user_id = ?
          AND blocked_user_id = ?
        `,
        [userID, targetUserID],
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    message: 'Database error while unblocking user',
                    error: err.message
                });
            }

            return res.json({
                message: 'User unblocked successfully',
                unblockedUserID: targetUserID
            });
        }
    );
});

// API endpoint to get users blocked by a user
app.get('/blockedUsers/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);

    if (!userId) {
        return res.status(400).json({
            message: 'Missing userId'
        });
    }

    con.query(
        `
        SELECT
            ub.block_id,
            ub.created_at,
            u.user_id,
            p.profile_id,
            p.name,
            p.major,
            p.bio
        FROM user_blocks ub
        JOIN users u
            ON ub.blocked_user_id = u.user_id
        JOIN profiles p
            ON u.user_id = p.user_id
        WHERE ub.blocker_user_id = ?
        ORDER BY ub.created_at DESC
        `,
        [userId],
        (err, blockedUsers) => {
            if (err) {
                return res.status(500).json({
                    message: 'Database error while getting blocked users',
                    error: err.message
                });
            }

            return res.json({
                blockedUsers: blockedUsers
            });
        }
    );
});
    // API endpoint to get only open conversations for a user
    app.get('/activeConversations/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);

    if (!userId) {
        return res.status(400).json({ message: 'Missing userId' });
    }

    con.query(
        `
        SELECT
            c.conversation_id,
            c.match_id,
            c.last_message_at,
            m.user1_id,
            m.user2_id
        FROM conversations c
        JOIN matches m
            ON c.match_id = m.match_id
        WHERE (m.user1_id = ? OR m.user2_id = ?)
          AND m.status = 'active'
          AND c.closed_at IS NULL
        ORDER BY c.last_message_at DESC
        `,
        [userId, userId],
        (err, conversations) => {
            if (err) {
                return res.status(500).json({
                    message: 'Database error while getting conversations',
                    error: err.message
                });
            }

            if (conversations.length === 0) {
                return res.json({ conversations: [] });
            }

            let completed = 0;
            const convoList = [];

            conversations.forEach((conversation) => {
                const otherUserId =
                    conversation.user1_id === userId
                        ? conversation.user2_id
                        : conversation.user1_id;

                con.query('CALL get_user_profile(?)', [otherUserId], (err, profileResults) => {
                    completed++;

                    if (!err && profileResults[0] && profileResults[0][0]) {
                        convoList.push({
                            conversation_id: conversation.conversation_id,
                            match_id: conversation.match_id,
                            last_message_at: conversation.last_message_at,
                            other_user: profileResults[0][0]
                        });
                    }

                    if (completed === conversations.length) {
                        return res.json({ conversations: convoList });
                    }
                });
            });
        }
    );
});

    // API endpoint to reopen a conversation
    app.post('/openConversation', (req, res) => {
    const { conversationID } = req.body;

    if (!conversationID) {
        return res.status(400).json({
            message: 'Send conversationID'
        });
    }

    con.query(
        `
        UPDATE conversations
        SET closed_at = NULL,
            close_reason = NULL
        WHERE conversation_id = ?
        `,
        [conversationID],
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    message: 'Database error while reopening conversation',
                    error: err.message
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: 'Conversation not found'
                });
            }

            return res.json({
                message: 'Conversation reopened successfully',
                conversationID: conversationID
            });
        }
    );
});




    // API endpoint to get matches for a user
    app.get('/matches/:userId', (req, res) => {
        const userId = parseInt(req.params.userId);

        if (!userId) {
            return res.status(400).json({ message: 'Missing userId' });
        }

        con.query('CALL get_user_matches(?)', [userId], (err, results) => {
            if (err) {
                return res.status(500).json({
                    message: 'Database error while getting matches',
                    error: err.message
                });
            }

            const matches = results[0];

            if (!matches || matches.length === 0) {
                return res.json({ matches: [] });
            }

            let completed = 0;
            const matchList = [];

            matches.forEach((match) => {
                const otherUserId =
                    match.user1_id === userId ? match.user2_id : match.user1_id;

                con.query('CALL get_user_profile(?)', [otherUserId], (err, profileResults) => {
                    completed++;

                    if (!err && profileResults[0] && profileResults[0][0]) {
                        matchList.push({
                            match_id: match.match_id,
                            status: match.status,
                            matched_at: match.matched_at,
                            other_user: profileResults[0][0]
                        });
                    }

                    if (completed === matches.length) {
                        return res.json({ matches: matchList });
                    }
                });
            });
        });
    });

    // API endpoint to get messages for a match
    app.get('/messages/:matchId', (req, res) => {
        const matchId = parseInt(req.params.matchId);

        if (!matchId) {
            return res.status(400).json({ message: 'Missing matchId' });
        }

        con.query('CALL get_conversation_by_match(?)', [matchId], (err, conversationResults) => {
            if (err) {
                return res.status(500).json({
                    message: 'Database error while getting conversation',
                    error: err.message
                });
            }

            if (!conversationResults[0] || conversationResults[0].length === 0) {
                return res.status(404).json({ message: 'Conversation not found' });
            }

            const conversation = conversationResults[0][0];
            const conversationId = conversation.conversation_id;

            con.query('CALL get_conversation_messages(?)', [conversationId], (err, messageResults) => {
                if (err) {
                    return res.status(500).json({
                        message: 'Database error while getting messages',
                        error: err.message
                    });
                }

                return res.json({
                    conversation: conversation,
                    messages: messageResults[0]
                });
            });
        });
    });

       // API endpoint to unmatch two users
    app.post('/unmatch', (req, res) => {
        const { matchID } = req.body;

        if (!matchID) {
            return res.status(400).json({
                message: 'Send matchID'
            });
        }

        con.query(
            `
            UPDATE matches
            SET status = 'closed',
                closed_at = NOW(),
                close_reason = 'unmatched'
            WHERE match_id = ?
            `,
            [matchID],
            (err, result) => {
                if (err) {
                    return res.status(500).json({
                        message: 'Database error while unmatching',
                        error: err.message
                    });
                }

                if (result.affectedRows === 0) {
                    return res.status(404).json({
                        message: 'Match not found'
                    });
                }

                return res.json({
                    message: 'Unmatched successfully',
                    matchID: matchID
                });
            }
        );
    });

    // API endpoint to send a message
    app.post('/sendMessage', (req, res) => {
        const { conversationID, userID, body } = req.body;

        if (!conversationID || !userID || !body) {
            return res.status(400).json({
                message: 'Send conversationID, userID, and body'
            });
        }

       con.query(
    `
    SELECT m.user1_id, m.user2_id
    FROM conversations c
    JOIN matches m
        ON c.match_id = m.match_id
    WHERE c.conversation_id = ?
    `,
    [conversationID],
    (err, rows) => {
        if (err) {
            return res.status(500).json({
                message: 'Database error while checking conversation',
                error: err.message
            });
        }

        if (rows.length === 0) {
            return res.status(404).json({
                message: 'Conversation not found'
            });
        }

        const match = rows[0];
        const otherUserID =
            match.user1_id === userID ? match.user2_id : match.user1_id;

        con.query(
            `
            SELECT block_id
            FROM user_blocks
            WHERE (blocker_user_id = ? AND blocked_user_id = ?)
               OR (blocker_user_id = ? AND blocked_user_id = ?)
            `,
            [userID, otherUserID, otherUserID, userID],
            (err, blockRows) => {
                if (err) {
                    return res.status(500).json({
                        message: 'Database error while checking block status',
                        error: err.message
                    });
                }

                if (blockRows.length > 0) {
                    return res.status(403).json({
                        message: 'Cannot send message because one user has blocked the other'
                    });
                }

                con.query(
                    'CALL send_message(?, ?, ?)',
                    [conversationID, userID, body],
                    (err) => {
                        if (err) {
                            return res.status(500).json({
                                message: 'Database error while sending message',
                                error: err.message
                            });
                        }

                        return res.json({
                            message: 'Message sent'
                        });
                    }
                );
            }
        );
    }
);
    });

};
