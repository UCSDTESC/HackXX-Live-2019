const Bottleneck = require('bottleneck');
const Airtable = require('airtable');
const moment = require('moment');

const {SCHEDULE_FILE, ANNOUNCEMENT_FILE} = require('./shared');

const TIME_LIMIT = 1000 / 4;
const base = new Airtable({ apiKey: process.env.REACT_APP_AIRTABLE_KEY })
                .base('appY4r7VAncjUupmp')

const fs = require('fs');

console.log("Running Poller...");

const cache = {
    schedule: null,
    announcements: null
}

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


setInterval(
    () => {
    limiter.schedule(() => getSchedule())
        .then((res) => {

            fs.writeFileSync(__dirname + SCHEDULE_FILE, JSON.stringify(res), (e) => {
                console.log('error');
            })

        })
        .catch(e => {
            console.error(e)
        })

    limiter.schedule(() => getAnnouncements())
        .then((res) => {

            fs.writeFileSync(__dirname + ANNOUNCEMENT_FILE, JSON.stringify(res), (e) => {
                console.log('error');
            })
        })
        .catch(e => console.error(e))
    }
, TIME_LIMIT);



