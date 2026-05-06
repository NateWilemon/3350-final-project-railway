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
// decision is a string: "yes" or "no"
app.post('/swipe', async (req, res) => {
    console.log(req.body);

    const { userID, targetUserID, decision } = req.body;

    if (!userID || !targetUserID || !decision) {
        return res.status(400).json({
            message: "Send userID, targetUserID, and decision as 'yes' or 'no' string"
        });
    }

    if (decision !== 'yes' && decision !== 'no') {
        return res.status(400).json({
            message: "Decision must be 'yes' or 'no' string"
        });
    }

    // First, record the swipe
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

            // If the user swiped no, we are done
            if (decision === 'no') {
                return res.json({
                    message: 'Swipe recorded',
                    swipe: decision
                });
            }

            // If the user swiped yes, check if the other user also swiped yes
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

                    // If there is no mutual like yet, just record the swipe
                    if (mutualLikeCount === 0) {
                        return res.json({
                            message: 'Swipe recorded, no match yet',
                            swipe: decision
                        });
                    }

                    // If both users liked each other, create a match
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

                            // Get the newly created match id
                            const matchID = matchResults[0][0].match_id;

                            // Create a conversation for the new match
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
}