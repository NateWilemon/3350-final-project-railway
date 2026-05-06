const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();
const fs = require('fs');

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
            if (err) return res.json({ message: 'Database error' });
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
                    return res.json({ message: 'Database error' });
                }

                return res.status(201).json({ message: 'Account created successfully' });
            });
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
                return res.json({ message: 'Database error' });
            }

            if (rows.length == 0) {
                return res.json({ message: 'Invalid email or password' });
            }

            const user = rows[0];
            const match = await bcrypt.compare(password, user.password_hashed);

            if (!match) {
                return res.json({ message: 'Invalid email or password' });
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
    });

    //api endpoint to add a hobby to profile, needs user id
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



};
