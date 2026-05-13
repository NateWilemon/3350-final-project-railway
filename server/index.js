const express = require('express');
const app = express();
app.use(express.json());
const cors = require('cors');
app.use(cors());
const dotenv = require('dotenv');
dotenv.config();
const fs = require('fs');
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
    loadProcedures();
    require('./users')(app, con);
    require('./matchmaking')(app, con);
    app.listen(3001, () => console.log('Port is 3001'));
});

function loadProcedures() {
    let sql = fs.readFileSync('procedures.sql', 'utf8');
    sql = sql.replace(/--[^\n]*/g, '');
    let procedures = sql
        .replace(/DELIMITER \$\$/g, '')
        .replace(/DELIMITER ;/g, '')
        .split('$$')
        .map(p => p.trim())
        .filter(p => p.toLowerCase().includes('create procedure'));
    procedures.forEach(proc => {
        con.query(proc, err => {
            if (err && err.code !== 'ER_SP_ALREADY_EXISTS') throw err;
        });
    });
    console.log("Procedures loaded");
}
