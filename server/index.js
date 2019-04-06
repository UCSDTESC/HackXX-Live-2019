require('dotenv').config();

const express = require('express');
const fs = require('fs');
const Bottleneck = require('bottleneck');
const Airtable = require('airtable');
const moment = require('moment');
const TIME_LIMIT = 1000 / 5;

const port = process.env.PORT || 8000;
const app = express();

const base = new Airtable({ apiKey: process.env.REACT_APP_AIRTABLE_KEY })
                .base('appY4r7VAncjUupmp')

const getSchedule =  () => {
    return base('Schedule')
            .select()
            .all()
            .then(records => records.map(r => r._rawJson.fields))
            .then(records => records.map((r) => ({
                ...r, 
                duration: moment(r.endTime).diff(moment(r.startTime), 'hours', true)
            })))
            .then(records => records.sort((a, b) => new Date(a.startTime) - new Date(b.startTime)))
}

const getAnnouncements =  () => {
    return base('Announcements')
            .select()
            .all()
            .then(records => records.map(r => r._rawJson.fields))
}

//4 requests per second
const limiter = new Bottleneck({
    minTime: TIME_LIMIT,
    maxConcurrent: 1
});

app.get('/api/schedule', (req, res) => {
    limiter.schedule(() => getSchedule())
        .then((r) => {
            res.json(r)
        })
        .catch(e => {
            console.error(e)
        })
})

app.get('/api/announcements', (req, res) => {
    limiter.schedule(() => getAnnouncements())
        .then((r) => {
            res.json(r)
        })
        .catch(e => {
            console.error(e)
        })
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))