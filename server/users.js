const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();
const fs = require('fs');
const multer = require('multer')
const path = require('path');
const upload = multer({ dest: path.join(__dirname, 'photos/') })
const SibApiV3Sdk = require('@getbrevo/brevo')
const brevoClient = SibApiV3Sdk.ApiClient.instance
brevoClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY
const transactionalApi = new SibApiV3Sdk.TransactionalEmailsApi()
const { resolve } = require('dns');



//generates a one time passcode
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};


//exports calls to index and connects to DB from index
module.exports = function startUser(app, con) {
    //api endpoint to create account
    app.post('/createAccount', async (req, res) => {
        const { email, password } = req.body;
        console.log(req.body);
        //checks to see if they submitted email and password
        if (!email || !password) {
            return res.json({ message: 'Send an email and password' });
        }

        con.query('SELECT * FROM users WHERE email = ?', [email], async (err, rows) => {
            if (err) {
                console.log('Select error:', err.message)
                return res.json({ message: 'Database error' });
            }
            if (rows.length > 0)
                return res.json({ message: 'Email is already in use' });


            //encrpyts password and runs db querry
            const hashed = await bcrypt.hash(password, 10);
            con.query('CALL create_user(?, ?)', [email, hashed], (err) => {
                if (err) {
                    //if non csub email, error state 45000
                    if (err.sqlState === '45000') {
                        return res.json({ message: err.message });
                    }
                    console.log('Select error:', err.message)
                    return res.json({ message: 'Database error' });
                }

                return res.status(201).json({ message: 'Account created successfully' });
            });
        });

    });

    //API endpoint to send an email to user
    //sends an email to the user with a 6 digit code
    app.post('/sendEmail', async (req, res) => {
        const { email, userID } = req.body;
        if (!email || !userID) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        //verifies user account exists and that email is correct for user account
        con.query('SELECT * FROM users WHERE user_id = ?', [userID], async (err, rows) => {
            if (err)
                return res.status(500).json({ message: 'Database error' });
            if (rows.length == 0)
                return res.status(404).json({ message: 'User not found' });
            if (rows[0].email !== email)
                return res.status(400).json({ message: 'Email does not match' });
            //expirtaion is current time + 1 hour
            let expire = new Date();
            expire.setMinutes(expire.getMinutes() + 30);
            //converts to UTC which is what MYSQL DB uses
            expire = expire.toISOString().slice(0, 19).replace('T', ' ');
            //code is a 6 digit randomly generated number
            let code = generateOTP();
            con.query("DELETE FROM one_time_codes WHERE user_id = ?", [userID], (err) => {
                if (err)
                    return res.status(500).json({ message: 'Database error' });
                con.query("INSERT INTO one_time_codes (user_id, code, expiresAt) VALUES (?,?,?)", [userID, code, expire], async (err) => {
                    if (err) {
                        return res.status(401).json({ message: 'Database error' });
                    }
                    try {
                        //sends OTP email using brevo
                        await transactionalApi.sendTransacEmail({
                            sender: { email: process.env.BREVO_SENDER, name: 'Rowdy' },
                            to: [{ email: email }],
                            subject: 'Email Verification OTP',
                            htmlContent: `
                            <div style="font-family: Arial, sans-serif; padding: 20px;">
                                <h2>Email Verification</h2>
                                <p>Your OTP for email verification is:</p>
                                <h1 style="color: #234452; letter-spacing: 5px;">${code}</h1>
                                <p>This OTP will expire in 30 minutes.</p>
                            </div>
                            `,
                        });
                        return res.status(200).json({ message: 'OTP sent' });
                    } catch (err) {
                        console.log('Email error:', err);
                        return res.status(500).json({ message: 'Failed to send email' });
                    }
                });
            });
        });
    });

    //API endpoint to verify user email code
    //updates DB saying user was verified
    app.post('/verifyEmail', async (req, res) => {
        const { userID, code } = req.body;

        if (!userID || !code) {
            return res.json({ message: 'Send Email and Code' });
        }

        //code must be 6 digits
        if (code.length != 6)
            return res.status(400).json({ message: 'Email does not match' });

        con.query("SELECT * from one_time_codes WHERE user_id = ?", [userID], async (err, rows) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }
            let existingCode
            let expiration

            if (rows.length > 0) {
                existingCode = rows[0].code;
                expiration = rows[0].expiresAt;
            } else {
                return res.status(400).json({ message: 'No rows found for userID' });
            }

            //if code has already expired, return error message and delete old code

            if (new Date() > new Date(expiration)) {
                con.query("DELETE FROM one_time_codes WHERE user_id = ? AND code = ?", [userID, code], async (err) => {
                    if (err)
                        return res.status(500).json({ message: 'Database error' });
                    return res.status(400).json({ message: "Code already expired" })
                })
                //if code doesn't match, leave
            } else if (existingCode !== code) {
                return res.status(400).json({ message: "Code doesn't match" });
            } else {
                //code is valid and not expired
                con.query("UPDATE users SET email_verified = 1 WHERE user_id = ?", [userID], async (err) => {
                    if (err)
                        return res.status(500).json({ message: 'Database error' });
                    con.query("DELETE FROM one_time_codes WHERE user_id = ? AND code = ?", [userID, code], async (err) => {
                        if (err)
                            return res.status(500).json({ message: 'Database error' });
                        return res.status(200).json({ message: "User verified" })
                    });
                });
            }
        });

    });

    //api endpoint to login
    app.post('/login', async (req, res) => {
        console.log(req.body);
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Send an email and password' });
        }

        con.query('SELECT * FROM users WHERE email = ?', [email], async (err, rows) => {
            if (err) {
                console.log(err);
                return res.status(401).json({ message: 'Database error' });
            }

            if (rows.length == 0) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            const user = rows[0];
            const match = await bcrypt.compare(password, user.password_hashed);

            if (!match) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            return res.status(200).json({ message: 'Login successful', userId: user.user_id });
        });
    });

    //api endpoint to get a user's profile
    app.get('/profile/:userId', (req, res) => {
        const userId = req.params.userId;

        if (!userId) {
            return res.status(400).json({ message: 'Missing userId' });
        }

        con.query('CALL get_user_profile(?)', [userId], (err, results) => {
            if (err) {
                return res.json({ message: 'Database error', error: err.message });
            }

            if (!results[0] || results[0].length === 0) {
                return res.status(404).json({ message: 'Profile not found' });
            }

            return res.json({ profile: results[0][0] });
        });
    });


    //api endpoint to create profiles
    app.post('/createProfile', async (req, res) => {
        const { userID, name, birthdate, gender, looking_for, major, bio } = req.body;
        if (!userID || !name || !birthdate || !gender || !looking_for || !major || !bio) {
            return res.status(400).json({ message: 'Missing required profile fields' });
        }

        if (bio.length > 100) {
            return res.status(400).json({ message: 'Bio must not exceed 100 charecters' });
        } else {

            //checks if user id exists
            con.query('SELECT * FROM users WHERE user_id = ?', [userID], (err, rows) => {
                if (err)
                    return res.json({ message: 'Database error' });
                if (rows.length == 0)
                    return res.json({ message: 'User not found' });



                //checks if profile already exists and stops 
                con.query('SELECT * FROM profiles WHERE user_id = ?', [userID], (err, rows) => {
                    console.log("Checking for userID:", userID);
                    console.log("Rows found:", rows.length);
                    if (err)
                        return res.json({ message: 'Database error' });
                    if (rows.length > 0)
                        return res.json({ message: 'profile already exists' });

                    //creates profile
                    con.query('CALL create_profile(?,?,?,?,?,?,?)',
                        [userID, name, birthdate, gender, looking_for, major, bio],
                        (err) => {
                            if (err) return res.json({ message: 'Database error', error: err.message });
                            res.status(201).json({ message: 'Profile created!' });
                        }
                    );
                });
            });
        }
    });

    //api endpoint to update profile
    //needs userID though nothing else is needed
    app.post('/updateProfile', async (req, res) => {
        const { userID, name, birthdate, gender, looking_for, major, bio } = req.body;

        con.query('SELECT * FROM users WHERE user_id = ?', [userID], (err, rows) => {
            if (err)
                return res.status(500).json({ message: 'Database error' });
            if (rows.length == 0)
                return res.status(401).json({ message: 'User not found' });

            //if field exists, put in updates
            const updates = {}
            if (name)
                updates.name = name
            if (birthdate)
                updates.birthdate = birthdate
            if (gender)
                updates.gender = gender
            if (looking_for)
                updates.looking_for = looking_for
            if (major)
                updates.major = major
            if (bio !== undefined)
                updates.bio = bio

            //pass updates array into sql query
            con.query('UPDATE profiles SET ? WHERE user_id = ?', [updates, userID], (err) => {
                if (err) return res.status(500).json({ message: 'Database error' });
                return res.status(200).json({ message: 'Profile updated' });
            });
        });
    });


    //api endpoint to add a hobby to profile, needs user id
    app.post('/addHobby', async (req, res) => {
        const { userID, hobbies } = req.body;
        if (!userID || !Array.isArray(hobbies) || hobbies.length == 0) {
            return res.json({ message: 'Missing required hobby fields' });
        }
        //Checks that userID has a profile
        con.query('SELECT profile_id FROM users JOIN profiles ON users.user_id = profiles.user_id WHERE users.user_id = ?', [userID], (err, rows) => {
            if (err) return res.json({ message: 'Database error' });
            if (rows.length == 0) return res.json({ message: 'UserID does not have profile' });
            let PID = rows[0].profile_id;
            //Creates table of all hobbies and hobby ids to check if hobby already exists
            con.query('SELECT hobby_id, hobby FROM hobbies WHERE hobby IN (?)', [hobbies], (err, hobbyRows) => {
                if (err) return res.json({ message: 'Database error', error: err.message });
                const foundHobbies = new Map(hobbyRows.map(r => [r.hobby, r.hobby_id]));
                const notFound = hobbies.filter(h => !foundHobbies.has(h));
                //if hobby doesn't exist already, create it on hobbies
                //inserts as promise
                const insertPromises = notFound.map((hobby) => {
                    return new Promise((resolve, reject) => {
                        con.query('INSERT INTO hobbies (hobby) VALUES (?)', [hobby], (err, result) => {
                            if (err) reject(err);
                            else {
                                foundHobbies.set(hobby, result.insertId);
                                resolve();
                            }
                        });
                    });
                });
                //Delete existing hobbies to insert new ones
                con.query('DELETE FROM profile_hobbies WHERE profile_id = ?', [PID], (err) => {
                    if (err) return res.json({ message: 'Database error' });
                    //adds hobby to profile
                    //insert as promise                              
                    Promise.all(insertPromises)
                        .then(() => {
                            const queries = hobbies.map((hobby) => {
                                return new Promise((resolve, reject) => {
                                    const hobbyID = foundHobbies.get(hobby);
                                    con.query('CALL add_profile_hobby(?,?)', [PID, hobbyID], (err) => {
                                        if (err) reject(err);
                                        else resolve();
                                    });
                                });
                            });
                            //executes all promises
                            Promise.all(queries)
                                .then(() => res.status(201).json({ message: 'Hobby added!' }))
                                .catch((err) => res.json({ message: 'Database error', error: err.message }));
                        })

                        .catch((err) => res.json({ message: 'Database error', error: err.message }));
                });
            });
        });
    });


    //api endpoint for reporting users
    app.post('/reportUser', async (req, res) => {
        //ID of user reporting
        //reasons is like category of report ex: fake CSUB account, harrasement, ect.
        //details is user text of what they did
        const { userID, conversationID, reasons, details, messageID } = req.body;
        if (!userID || !conversationID || !reasons || !messageID)
            return res.status(400).json({ message: 'Missing required fields' });

        con.query('SELECT * FROM users WHERE user_id = ?', [userID], async (err, rows) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: 'Database error' });
            }

            if (rows.length == 0) {
                return res.status(401).json({ message: 'Invalid userID' });
            }
            //id of reported user
            let reportUserId;
            con.query('SELECT user1_id, user2_id FROM conversations JOIN matches ON conversations.match_id = matches.match_id WHERE conversation_id = ?',
                [conversationID], async (err, rows) => {
                    if (err) {
                        console.log(err);
                        return res.status(500).json({ message: 'Database error' });
                    }

                    if (rows.length == 0) {
                        return res.status(401).json({ message: 'Invalid conversation ID' });
                    }
                    const user1 = rows[0].user1_id;
                    const user2 = rows[0].user2_id;
                    if (userID == user1)
                        reportUserId = user2
                    else
                        reportUserId = user1

                    //add new report column
                    con.query('CALL create_report(?, ?, ?, ?)', [reportUserId, conversationID, reasons, details], (err, result) => {
                        if (err)
                            return res.json({ message: 'Database error' });
                        //get id of user reported
                        con.query('SELECT MAX(report_id) AS reportID FROM reports WHERE user_id = ? AND conversation_id = ?',
                            [reportUserId, conversationID], (err, rows) => {
                                if (err)
                                    return res.status(500).json({ message: 'Database error' });

                                let reportID = rows[0].reportID;

                                //insert report into messages
                                con.query('UPDATE messages SET report_id = ? WHERE message_id = ?', [reportID, messageID], (err) => {
                                    if (err)
                                        return res.json({ message: 'Database error' });
                                    return res.status(201).json({ message: 'Report successfully added' });
                                });
                            })
                    });
                });
        });
    });


    //need to send as multipart fourm instead of json
    //includes userID, pfp as 1 or 0 for yes pfp or no pfp
    //and photo as photo
    app.post('/addpicture', upload.single('photo'), function (req, res, next) {
        //pfp should be a 1 or 0. 1 for pfp 0 for not.
        //if you already have a pfp passing 1 replaces it
        //this table can support multiple photos
        const { userID, pfp } = req.body;
        if (pfp != 0 && pfp != 1)
            return res.status(400).json({ message: 'pfp must be a 1 or 0' });
        if (!userID || !req.file) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        con.query('SELECT * FROM users WHERE user_id = ?', [userID], (err, rows) => {
            if (err)
                return res.json({ message: 'Database error' });
            if (rows.length == 0)
                return res.json({ message: 'User not found' });

            //get profileID
            con.query("CALL get_user_profile(?)", [userID], (err, results) => {
                if (err)
                    return res.status(500).json({ message: 'Database error' });
                let profileID = results[0][0].profile_id;
                let filePath = req.file.path;

                if (pfp == 1) {
                    //if new pfp remove old one
                    con.query('DELETE FROM profile_photos WHERE profile_id = ? AND is_primary = 1', [profileID], (err) => {
                        if (err)
                            return res.status(500).json({ message: 'Database error' });

                        con.query('INSERT INTO profile_photos (position, is_primary, is_approved, profile_id, file_path)' +
                            'VALUES(?,?,0,?,?)', [null, pfp, profileID, filePath], (err) => {
                                if (err) return res.status(500).json({ message: 'Database error' });
                                return res.status(201).json({ message: 'Photo uploaded!' });
                            });
                    });
                } else {
                    //grab photo position
                    con.query('SELECT COALESCE(MAX(position), 0) AS maxPos FROM profile_photos WHERE profile_id = ? AND is_primary = 0',
                        [profileID], (err, rows) => {
                            if (err)
                                return res.status(500).json({ message: 'Database error' });
                            let position = rows[0].maxPos + 1;

                            con.query('INSERT INTO profile_photos (position, is_primary, is_approved, profile_id, file_path)' +
                                'VALUES(?,?,0,?,?)', [position, pfp, profileID, filePath], (err) => {
                                    if (err) return res.status(500).json({ message: 'Database error' });
                                    return res.status(201).json({ message: 'Photo uploaded!' });
                                });
                        });
                }
            });
        });
    });

    //api endpoint to get pfp for a user
    app.post('/getPFP', async (req, res) => {
        const { userID } = req.body;
        if (!userID) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        con.query('SELECT * FROM users WHERE user_id = ?', [userID], (err, rows) => {
            if (err)
                return res.json({ message: 'Database error' });
            if (rows.length == 0)
                return res.json({ message: 'User not found' });

            //get profile id from userID
            con.query("CALL get_user_profile(?)", [userID], (err, results) => {
                if (err)
                    return res.status(500).json({ message: 'Database error' });
                let profileID = results[0][0].profile_id;

                con.query("SELECT file_path FROM profile_photos WHERE profile_id = ? AND is_primary = 1", [profileID], (err, rows) => {
                    if (err)
                        return res.status(500).json({ message: 'Database error' });
                    if (rows.length == 0)
                        return res.status(404).json({ message: 'No PFP found' });

                    res.sendFile(path.resolve(rows[0].file_path));
                });
            });
        });
    });

    //api endpoint to get all photos for a user
    app.post('/getPhotos', async (req, res) => {
        const { userID } = req.body;
        if (!userID) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        con.query('SELECT * FROM users WHERE user_id = ?', [userID], (err, rows) => {
            if (err)
                return res.json({ message: 'Database error' });
            if (rows.length == 0)
                return res.json({ message: 'User not found' });

            //get profile id from userID
            con.query("CALL get_user_profile(?)", [userID], (err, results) => {
                if (err)
                    return res.status(500).json({ message: 'Database error' });
                let profileID = results[0][0].profile_id;

                con.query("CALL get_profile_photos(?)", [profileID], (err, results) => {
                    if (err)
                        return res.status(500).json({ message: 'Database error' });
                    const photos = results[0].map(photo => ({
                        ...photo,
                        file_path: `http://localhost:3001/photo/${photo.photo_id}`
                    }));
                    return res.status(200).json({ photos });
                });
            });
        });
    });

    //don't use as endpoint, use get photos
    //this just assist with getphotos
    app.get('/photo/:photoId', (req, res) => {
        con.query('SELECT file_path FROM profile_photos WHERE photo_id = ?',
            [req.params.photoId], (err, rows) => {
                if (err) return res.status(500).json({ message: 'Database error' });
                if (rows.length == 0) return res.status(404).json({ message: 'Photo not found' });
                res.sendFile(path.resolve(rows[0].file_path));
            });
    });

    //deletes photo based on photo ID
    app.post('/deletePhotos', async (req, res) => {
        const { photoID } = req.body;
        if (!photoID) {
            return res.status(400).json({ message: 'Please Send photoID' });
        }

        con.query('DELETE FROM profile_photos WHERE photo_id = ?', [photoID], (err, result) => {
            if (err) return res.status(500).json({ message: 'Database error' });
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Photo not found' });
            return res.status(200).json({ message: 'Photo deleted' });
        });
    });


};
