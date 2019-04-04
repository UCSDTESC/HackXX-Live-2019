import React from 'react';
import {Route, Switch} from 'react-router-dom';

import HackXXLayout from './2019/2019Layout';
import Live2019 from './2019/live';
class Routes extends React.Component {

    with2019Layout(Child) {
        return () =>
            (<HackXXLayout>
                <Child />
            </HackXXLayout>)
    }

    render() {
        return (
            <Switch>
                <Route path="/" exact component={this.with2019Layout(Live2019)}/>
            </Switch>
        )
    }
}

export default Routes;