import React from 'react';
import {Row, Col, Container, Button, Form} from 'react-bootstrap';
import {recover_from_keys} from '../../utils/wallet_creation';

import WalletHome from "../wallet/home";

const safex = window.require("safex-nodejs-libwallet");

let {dialog} = window.require("electron").remote;

export default class RecoverKeys extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            daemon_host: '',
            daemon_port: 0,
            new_path: '',
            password: '',
            safex_key: null,
            success: false,
            network: 'mainnet',
            testnet: false,
            wallet: null,
            wallet_made: false,
            public_address: '',
            viewkey: '',
            spendkey: ''
        };
    }

    async componentDidMount() {

    }

    set_path = (e) => {
        e.preventDefault();

        let sails_path = dialog.showSaveDialogSync();
        let new_path = sails_path;

        try {
            if (new_path.length > 0) {
                this.setState({new_path: new_path});
            }
        } catch (err) {
            console.log("cancelled, no path set");
        }
    };

    change_path = (e) => {
        e.preventDefault();
        this.setState({new_path: ''})
    };
    set_daemon_state = (e) => {
        e.preventDefault();
        this.setState({daemon_host: e.target.daemon_host.value, daemon_port: parseInt(e.target.daemon_port.value)})
    };

    change_daemon = (e) => {
        e.preventDefault();
        this.setState({daemon_host: '', daemon_port: 0});
    };

    set_password = (e) => {
        e.preventDefault();
        if (e.target.password.value === e.target.repeat_password.value) {
            this.setState({password: e.target.password.value});
        } else {
            alert("passwords dont match");
        }
    };

    change_password = (e) => {
        e.preventDefault();
        this.setState({password: ''});
    };

    make_wallet = async (e) => {
        e.preventDefault();
        try {
            let daemon_string = `${this.state.daemon_host}:${this.state.daemon_port}`;
            let wallet = await recover_from_keys(
                this.state.new_path,
                this.state.password,
                0,
                this.state.network,
                daemon_string,
                this.state.public_address,
                this.state.viewkey,
                this.state.spendkey);
            console.log(wallet);
            this.setState({wallet_made: true, wallet: wallet});
        } catch (err) {
            console.error(err);
            console.error("error on initial recovery");
        }
    };

    set_to_testnet = (e) => {
        e.preventDefault();
        const target = e.target;
        if (target.checked === true) {
            this.setState({
                testnet: true,
                network: 'testnet'
            });
        } else {
            this.setState({
                testnet: false,
                network: 'mainnet'
            });
        }
    };

    show_password = (e) => {
        e.preventDefault();
        alert(this.state.password);
    };

    set_keys = (e) => {
        e.preventDefault();
        let items = e.target;
        try {
            if (safex.addressValid(items.public_address.value, this.state.network) &&
                items.viewkey.value.length > 63 &&
                items.spendkey.value.length > 63) {
                this.setState({
                    viewkey: items.viewkey.value,
                    spendkey: items.spendkey.value,
                    public_address: items.public_address.value
                })
            } else {
                alert("not a valid safex address");
            }

        } catch (err) {
            console.error(err);
            console.error("error at setting the keys");
        }
    };

    reset_keys = (e) => {
        this.setState({
            public_address: '',
            viewkey: '',
            spendkey: ''
        })
    };

    exit_home = (e) => {
        e.preventDefault();
        this.props.history.push({pathname: '/'});
    };

    render() {
        return (
            <div>
                {this.state.wallet_made ?
                    (<div>
                        <WalletHome
                            wallet={this.state.wallet}/>
                    </div>) :
                    (<Container>
                        <button onClick={this.exit_home}>exit home</button>
                        <Row className="justify-content-md-center">
                            <Col sm={6}>
                                <p>
                                    This pathway will allow you to restore a wallet from your Safex public address,
                                    private view and spend key.
                                </p>
                                <p>
                                    <input
                                        name="isTestnet"
                                        type="checkbox"
                                        checked={this.state.testnet}
                                        onChange={this.set_to_testnet}/>
                                </p>
                            </Col>
                        </Row>

                        {this.state.public_address.length > 0 ?
                            (<div></div>) :
                            (<Row className="justify-content-md-center">
                                <Col sm={6}>
                                    <div>
                                        <p>
                                            Enter your Public Address, Private Spend Key, and Private View Key
                                        </p>
                                        <div>
                                            <Form id="set_keys" onSubmit={this.set_keys}>
                                                Public Address <Form.Control name="public_address"
                                                                             defaultValue="Safex5..."
                                                                             placedholder="set the ip address of the safex blockchain"/>
                                                Spend Key <Form.Control name="spendkey" defaultValue="..."
                                                                        placedholder="set the port of the safex blockchain"/>
                                                View Key <Form.Control name="viewkey" defaultValue="..."
                                                                       placedholder="set the port of the safex blockchain"/>
                                                <Button type="submit" variant="primary" size="lg" block>set
                                                    key set</Button>
                                            </Form>
                                        </div>
                                    </div>
                                </Col>
                            </Row>)
                        }

                        {this.state.public_address.length > 0 &&
                        this.state.new_path.length < 1 ?
                            (<Row className="justify-content-md-center">
                                <Col sm={6}>
                                    <div>
                                        <p>
                                            Set the path where to save your new wallet file
                                        </p>
                                        <Form id="set_path" onSubmit={this.set_path}>
                                            <Button type="submit" variant="primary" size="lg" block>Select File
                                                Path</Button>
                                        </Form>
                                    </div>
                                </Col>
                            </Row>) :
                            (<div></div>)
                        }

                        {this.state.new_path.length > 0 &&
                        this.state.public_address.length > 0 &&
                        this.state.password.length < 1 ?
                            (<Row className="justify-content-md-center">
                                <Col sm={6}>
                                    <div>
                                        <div>
                                            <Form id="set_password" onSubmit={this.set_password}>
                                                <Form.Control name="password" type="password"
                                                              placedholder="set the ip address of the safex blockchain"/>
                                                <Form.Control name="repeat_password" type="password"
                                                              placedholder="set the port of the safex blockchain"/>
                                                <Button type="submit" variant="primary" size="lg" block>set
                                                    password</Button>
                                            </Form>
                                        </div>

                                    </div>
                                </Col>
                            </Row>) :
                            (<div></div>)
                        }

                        {this.state.new_path.length > 0 &&
                        this.state.public_address.length > 0 &&
                        this.state.password.length > 0 &&
                        this.state.daemon_host.length < 1 ?
                            (<Row className="justify-content-md-center">
                                <Col sm={6}>
                                    <div>
                                        <Form id="set_daemon" onSubmit={this.set_daemon_state}>
                                            <Form.Control name="daemon_host" defaultValue="127.0.0.1"
                                                          placedholder="set the ip address of the safex blockchain"/>
                                            <Form.Control name="daemon_port" defaultValue="17402"
                                                          placedholder="set the port of the safex blockchain"/>
                                            <Button type="submit" variant="primary" size="lg" block>set
                                                connection</Button>
                                        </Form>
                                    </div>
                                </Col>
                            </Row>) :
                            (<div></div>)
                        }

                        {this.state.new_path.length > 0 &&
                        this.state.daemon_host.length > 0 &&
                        this.state.password.length > 0 &&
                        this.state.public_address.length > 0 ?
                            (<Row className="justify-content-md-center">
                                <Col sm={6}>
                                    <div>
                                        <div>
                                            <ul>
                                                <li>public address: {this.state.public_address}</li>
                                                <li>view key: Hidden for Security</li>
                                                <li>spend key: Hidden for Security</li>
                                                <li>If you want to change any of these keys
                                                    <button onClick={this.reset_keys}>click this button</button>
                                                </li>
                                            </ul>
                                        </div>
                                        <div>
                                            <p>
                                                this file will be saved to {this.state.new_path} <Button
                                                onClick={this.change_path}>change path?</Button>
                                            </p>
                                        </div>
                                        <div>
                                            <p>
                                                your chosen password is
                                                : {[...Array(this.state.password.length)].map((key) =>
                                                <span key={key}>♦</span>)}

                                                <Button
                                                    onClick={this.show_password}>show password</Button>
                                                <Button
                                                    onClick={this.change_password}>change password</Button>
                                            </p>
                                        </div>
                                        <div>
                                            <p>
                                                you will be connected
                                                to {this.state.daemon_host}:{this.state.daemon_port} for
                                                blockchain synchronization<Button
                                                onClick={this.change_daemon}>change safex network connection?</Button>
                                            </p>
                                        </div>

                                        <Button onClick={this.make_wallet} variant="primary" size="lg" block>Make
                                            the New Wallet</Button>
                                    </div>
                                </Col>
                            </Row>) :
                            (<div></div>)
                        }
                    </Container>)
                }
            </div>
        );
    }
}