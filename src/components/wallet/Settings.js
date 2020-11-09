import React from 'react';
import ReactJson from 'react-json-view';

import Navigation from './Navigation';

import {Row, Col, Container, Button, Table} from 'react-bootstrap';


export default class Settings extends React.Component {
    constructor(props) {
        super(props);
        this.state = {

        };



    }

    async componentDidMount() {
        console.log("load settings");
        console.log(this.props.history);


    };

    render() {
        return (
            <div style={{position: 'relative'}}>
                <Container>

                    <ReactJson src={this.props.history} />
                    <Row>
                        <Col>
                        </Col>
                        <Col>
                        </Col>

                    </Row>


                    <Row>
                        <Table>
                            <thead>
                            <tr>
                                <th>index</th>
                                <th>safex address</th>
                                <th>Cash</th>
                                <th>Tokens</th>
                                <th>actions</th>
                            </tr>
                            </thead>

                            <tbody>
                            </tbody>
                        </Table>
                    </Row>
                </Container>

            </div>
        );
    }


}
