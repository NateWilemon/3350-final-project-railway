const express = require('express');
const app = express();
app.use(express.json());
const cors = require('cors');
app.use(cors());
const dotenv = require('dotenv');
dotenv.config();
const fs = require('fs');
const mysql = require('mysql2');

//temporary connection
//if we pass DB_NAME and it initilization breaks
//but we hand connection over to other files and those need DB_NAME
let tempCon = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});


//connect to your local database
//runs functions
//connects to other files to listen for api calls
// temp connection without database to create it
tempCon.connect(function (err) {
    if (err) throw err;
    tempCon.query("CREATE DATABASE IF NOT EXISTS datingapp", function (err) {
        if (err) throw err;
        tempCon.end();

        // now safe to connect with the database specified
        con = mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        con.connect(function (err) {
            if (err) throw err;
            console.log("Connected to DB.");
            fillTables();
            loadProcedures();
            require('./users')(app, con);
            require('./matchmaking')(app, con);
            app.listen(3001, () => console.log('Port is 3001'));
        });
    });
});

//creates DB if none exist
//runs fille tables
function initDB() {
    con.query("CREATE DATABASE IF NOT EXISTS datingapp", function (err) {
        if (err) throw err;
        //specifies DB name, datingAPP
        con.query("Use datingapp", function (err) {
            if (err) throw (err);
            fillTables();

        });
    });
}

//if tables don't exist, fill them
//uses tables.sql written by angel
function fillTables() {
    con.query("SHOW TABLES LIKE 'users'", (err, rows) => {
        if (err) throw err;
        if (rows.length > 0) {
            console.log("Tables already exist");
        } else {
            const data = fs.readFileSync('tables.sql', 'utf8');
            const queries = data.split(";").filter(q => q.trim());
            queries.forEach(query => {
                query += ";"
                con.query(query, function (err) {
                    if (err) throw err;
                })
            });
          console.log("Created tables");

// load sample data
const sampleData = fs.readFileSync('sample_data.sql', 'utf8');
const sampleQueries = sampleData.split(";").filter(q => q.trim());

sampleQueries.forEach(query => {
    query += ";"
    con.query(query, function (err) {
        if (err) throw err;
    });
});

console.log("Inserted sample data");

        }
    });

}

//reads procedures.sql and lets API calls use them
function loadProcedures() {
    let sql = fs.readFileSync('procedures.sql', 'utf8');
    sql = sql.replace(/--[^\n]*/g, '');

    // Remove DELIMITER lines, split on END $$
    let procedures = sql
        .replace(/--[^\n]*/g, '')
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
