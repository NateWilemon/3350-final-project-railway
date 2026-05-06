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
                                            ageWeight = 1 - ageDiff / 10;
                                            if (ageWeight < 0)
                                                ageWeight = 0;

                                            //final answer
                                            let answer = (majorWeight + hobbyWeight + ageWeight) / 3;
                                            console.log(answer);
                                            matchQueue.push({
                                                id: mat.user_id,
                                                score: answer,
                                                profile_id: mat.profile_id,
                                                first_name: mat.first_name,
                                                last_name: mat.last_name,
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

    // API endpoint to send a message
    app.post('/sendMessage', (req, res) => {
        const { conversationID, userID, body } = req.body;

        if (!conversationID || !userID || !body) {
            return res.status(400).json({
                message: 'Send conversationID, userID, and body'
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
    });

};
