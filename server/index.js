const express = require('express');
const app = express();
app.use(express.json());
const cors = require('cors');
app.use(cors());
const dotenv = require('dotenv');
dotenv.config();
const mysql = require('mysql2');

const con = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
});

con.connect(function(err) {
    if (err) throw err;
    console.log("Connected to DB.");
    require('./users')(app, con);
    require('./matchmaking')(app, con);
    app.listen(3001, () => console.log('Port is 3001'));
});
