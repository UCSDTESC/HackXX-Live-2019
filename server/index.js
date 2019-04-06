require('dotenv').config();
const express = require('express');
const fs = require('fs');
const {SCHEDULE_FILE, ANNOUNCEMENT_FILE} = require('./shared');

const port = process.env.port || 8000;
const app = express()

app.get('/api/schedule', (req, res) => {
    fs.readFile(__dirname + SCHEDULE_FILE, (err, data) => {
        res.json(
            JSON.parse(data.toString())
        )
    })
})

app.get('/api/announcements', (req, res) => {
    fs.readFile(__dirname + ANNOUNCEMENT_FILE, (err, data) => {
        res.json(
            JSON.parse(data.toString())
        )
    })
})

require('./poller');

app.listen(port, () => console.log(`Example app listening on port ${port}!`))