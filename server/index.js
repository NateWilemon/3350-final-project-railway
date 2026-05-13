const express = require('express');
const app = express();
app.use(express.json());
const cors = require('cors');
app.use(cors());
const dotenv = require('dotenv');
dotenv.config();
const mysql = require('mysql2');

const con = mysql.createConnection({
    host: process.env.MYSQLHOST,
    port: process.env.MYSQLPORT,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE
});

con.connect(function(err) {
    if (err) throw err;
    console.log("Connected to DB.");
    require('./users')(app, con);
    require('./matchmaking')(app, con);
    app.listen(3001, () => console.log('Port is 3001'));
});
