import React, {Component} from 'react';
import Airtable from 'airtable';
import styled from 'styled-components';
import moment from 'moment';

import TextSchedule from '../../components/Schedule';
import ScheduleEvent from './ScheduleEvent';
import SchedulePopup from './SchedulePopup';
import Scroll from './ScheduleScroll';
import VerticalEvent from './VerticalEvent';
import Search from './ScheduleSearch';

import {
    BORDER_RADIUS, LIGHT_BLUE
} from '../../constants';

import {
    HideBelow,
} from '../../styles';

import {
    FRI_HOURS,
    SAT_HOURS,
    NUM_COLS,
    HOUR_WIDTH,
    CALENDAR_MARGIN,
    CAL_WIDTH,
    CAL_BG,
    GRADIENT_OFFSET,
    VERTICAL_HOUR_LINE_WIDTH,
    ROW_HEIGHT,
    ROW_MARGIN_TOP,
    LIGHT_BLUE as LIVE_BLUE
} from '../constants';

import { mediaBreakpointUp } from '../../../breakpoints';

const HideOnMobile = HideBelow('sm');

const HideAboveMobile = styled.div`
    ${mediaBreakpointUp('sm', `
        display: none !important;
    `)}
`

const Container = styled.div`
    width: 100%;
    border-top-left-radius: ${BORDER_RADIUS};
    border-top-right-radius: ${BORDER_RADIUS};
    border-bottom-left-radius: ${BORDER_RADIUS};
    border-bottom-right-radius: ${BORDER_RADIUS};
`

const Legend  = styled.div`
    background: ${CAL_BG};
    color: black;
    padding: 1rem 2rem;
    span {
        margin-left: 1rem;
    }
`

const Main = styled.div`
    background: ${CAL_BG};
    position: relative;
    overflow-x: auto;
    border: 0;

`

const Draggable = styled.div`
    width: ${CAL_WIDTH}px;
    text-align: left !important;
    height: calc(100% - 6rem);
    margin: 0 ${CALENDAR_MARGIN}px;

`

const Calendar = styled.div`
    height: 100%;
    width: ${NUM_COLS * HOUR_WIDTH}px;
    color: black;
    display: block;
    margin-top: 1rem;
    position: relative;
    background: repeating-linear-gradient(
        to right,
        ${CAL_BG},
        ${CAL_BG} ${GRADIENT_OFFSET}px,
        ${LIGHT_BLUE} ${GRADIENT_OFFSET + VERTICAL_HOUR_LINE_WIDTH}px,
        ${CAL_BG} ${GRADIENT_OFFSET + VERTICAL_HOUR_LINE_WIDTH}px,
        ${CAL_BG} ${HOUR_WIDTH}px
    );
`

const Times = styled.div`
    color: black;
    opacity: 0.5;
    font-size: 20px;
    width: 100%;
    
    span span {
        display: inline-block;

        width: ${HOUR_WIDTH}px;
    }
`

const Row = styled.div`
    height: ${ROW_HEIGHT}px;
    
    & + & {
        margin-top: ${ROW_MARGIN_TOP}px;
    }
`;

const LegendPill = styled.span`
    background: ${props => props.background || 'white'};
    border-radius: 5pc;
    padding: 0.5rem;
    margin: 0 0.1rem;
    color: ${props => props.color};
    box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.25);
    box-shadow:  1px solid rgba(0, 0, 0, 0.1);
    opacity: ${props => props.isActive ? '1' : '1'};

    &:hover {
        //cursor: pointer;
    }
`

const Day = styled.div`
`

class Schedule extends Component {

    constructor() {
        super();
        this.scrollRef = React.createRef();
        this.scrollerRef = React.createRef();
        this.state = {

            // holds the raw data extracted from airtable
            records: [],

            //holds the derived state from the airtable response
            rows: [[]],

            activeTab: 0,

            popup: {
                event: {},
                isOpen: false
            }
        }

        //reference to the Airtable API client
        this.base = new Airtable({ apiKey: process.env.REACT_APP_AIRTABLE_KEY })
                        .base('appY4r7VAncjUupmp')

        this.eventCategories = {
            'Main Events': {
                color: 'white',
                background: '#8E44AD'
            }, 
            'Food': {
                color: 'black',
                background: '#AEF9D6'
            }, 
            'Talks': {
                color: 'black',
                background: '#EF767A'
            }, 
            'Workshops': {
                color: 'black',
                background:'#43D2F0'
            }
        }

        this.startTime = moment("2019-04-06T17:00:00.000Z");

    }

    componentDidMount() {
        //getting data from the Schedule table
        /*this.base('Schedule')
            .select()
            .all()
            .then(records => records.map(r => r._rawJson.fields))
            .then(records => records.map((r) => ({
                ...r, 
                duration: moment(r.endTime).diff(moment(r.startTime), 'hours', true)
            })))
            .then(records => records.sort((a, b) => new Date(a.startTime) - new Date(b.startTime)))
            //using this.setState's callback function to trigger the derived data build when we have records
            .then(records => {
                console.log(records);
                this.setState({records}, this.createScheduleRows)
        })*/

        fetch('/api/schedule')
            .then(r => r.json())
            .then(records => {
                this.setState({records}, this.createScheduleRows)
            })
    }


    renderTimes(day) {
        const timeMap = {
            'Sat': FRI_HOURS,
            'Sun': SAT_HOURS
        }

        const startTime = {
            'Sat': 10,
            'Sun': 0
        }[day]

        let times = []

        for (let i = 0; i < timeMap[day]; i++) {
            times.push(<span>
                {moment.utc((startTime + i)*3600*1000).format('ha')}
            </span>);
        }

        return (
            <span className="d-inline-block">
                <Day>
                    {day}
                </Day>
                {times}
            </span>
        )
    }

    //helper function to get the hour index needed for ScheduleEvent's props
    hoursSinceStartTime(date) {
        return moment(date).diff(this.startTime, 'hours', true);
    }

    // method to check if a given event fits in a given row


    //maybe there's a better way to represent a row that makes this operation constant time?
    //1) maybe we can ensure a row is always sorted and binary search? probably not worth
    //2) some kind representation that can give you a 
    //   row[record[startTime]] = (true or false) if it's vacant at that time?
    //   then this function can be `return row.isFree(record[startTime]) && row.isFree(record[endTime])`
    //   you can write a class for this data structure
    //   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes
    fits(row, record, rowNum) {
        for (let i = 0; i < row.length; i++) {
            let currEvt = row[i];

            if (currEvt['endTime'] >= record['endTime'] || 
                currEvt['startTime'] >= record['startTime'] || 
                currEvt['startTime'] >= record['endTime'] ||
                currEvt['endTime'] >= record['startTime']) {
                return false;
            }
        }

        return true;
    }

    createScheduleRows() {
        let {records, rows} = this.state;
        //for every record...
        for (let i = 0;  i < records.length; i++) {

            if (!records[i].title || !records[i].startTime || !records[i].endTime) {
                continue;
            }

            for (let rowNum = 0; rowNum < rows.length; rowNum++) {
                //if the record fits in the current row
                if (this.fits(rows[rowNum], records[i], rowNum)) {

                    //add it to the row
                    rows[rowNum].push(records[i]);

                    //we're done, go to the next record
                    break;
                }
                else {
                    //we haven't found a row for this record and are at the 
                    //end of all of our current rows, so we create a new row
                    if (rowNum === rows.length - 1) {

                        //add a row with the record as it's only event
                        rows.push([records[i]]);

                        //we're done, go to next record
                        break;
                    }
                }
            }
        }

        //set row state, trigger re-render to show rows
        this.setState({rows})
    }
    
    renderLegend = () => {
        return <div className="row">
            {Object.keys(this.eventCategories).map((e, i) => (
                <LegendPill 
                    color={this.eventCategories[e].color}
                    background={this.eventCategories[e].background}
                    isActive={i === this.state.activeTab}
                    className="col-sm-auto text-sm-center"
                >
                    {e}
                </LegendPill>
            ))}
        </div>
    }

    showPopup = (event) => {
        const startsAt = this.hoursSinceStartTime(event['startTime']);
        this.setState({
            popup: {event: {
                ...event,
                startsAt
            }, isOpen: true}
        })
    }

    renderVerticalEvents = () => {
        return this.state.records
            .filter(x => x.verticalStyle)
            .map(r => <VerticalEvent 
                startsAt={this.hoursSinceStartTime(r['startTime'])}
                event={r}
            />)
    }

    renderRows = () => {
        const {records, rows} = this.state;
        return rows.map((row, rowIdx) => {
            return (
                <Row >
                    {row.map(r => <ScheduleEvent
                            startsAt={this.hoursSinceStartTime(r['startTime'])}
                            event={r}
                            showPopup={this.showPopup}
                            rowIdx={rowIdx}
                            color={this.eventCategories[r.type].background}
                        />)}
                </Row>
            )
        })
    }

    hidePopup = () => {

        if (!this.state.popup.isOpen) return;

        this.setState({
            popup: {
                isOpen: false,
                event: null
            }
        })
    }

    render() {

        if (!this.state.records) {
            return <div>Loading....</div>
        }
        return (
            <>
                <HideOnMobile 
                    as={Container} 
                    className="m-5 w-auto" 
                    onClick={this.hidePopup} 
                    
                >
                    <Search options={this.state.records} showPopup={this.showPopup}/>
                    <Legend className="container-fluid">
                        {this.renderLegend()}
                    </Legend>
                    <Main  ref={this.scrollRef}>
                        <Draggable>
                            <Times>
                                {this.renderTimes('Sat')}
                                {this.renderTimes('Sun')}
                            </Times>
                            <Calendar>
                                <SchedulePopup {...this.state.popup}/>
                                {this.renderRows()}
                                {this.renderVerticalEvents()}
                            </Calendar>
                        </Draggable>
                    </Main>
                    <Scroll scrollerRef={this.scrollerRef}/>
                </HideOnMobile>
                <HideAboveMobile as={Container}>
                    <TextSchedule data={this.state.records}/>
                </HideAboveMobile>
            </>
        )
    }
}

export default Schedule;