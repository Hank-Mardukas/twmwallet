import React from 'react';

import {Row, Col, Container, Button, Table, Form, Image, Modal} from 'react-bootstrap';

import { MDBDataTable } from 'mdbreact'

import {withRouter} from 'react-router-dom';

import {normalize_8decimals} from '../../utils/wallet_creation';

import {send_cash, send_tokens, stake_tokens, unstake_tokens, commit_txn} from "../../utils/wallet_actions";

import {get_staked_tokens, get_interest_map} from '../../utils/safexd_calls';

// Icon Imports
import { FaCogs, FaSearch } from 'react-icons/fa'
import { GiExitDoor } from 'react-icons/gi'
import { GrCubes } from 'react-icons/gr'
import { IconContext } from 'react-icons'



var nacl = window.require('tweetnacl');

var wallet;


class WalletHome extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            interface_view: 'home',
            address: '',
            wallet_path: '',
            cash: 0,
            tokens: 0,
            synced: false,
            wallet_height: 0,
            blockchain_height: 0,
            daemon_host: '',
            daemon_port: 0,
            usernames: [],
            connection_status: 'Connecting to the Safex Blockchain Network...',
            timer: '',
            first_refresh: false,
            show_keys: false,
            twm_offers: [],
            non_offers: [],
            selected_user: {}, //merchant element
            show_new_offer_form: false,
            show_new_account_form: false,
            blockchain_tokens_staked: 0,
            blockchain_interest_history: [],
            blockchain_current_interest: {}
        };
    }

    async componentDidMount() {
        try {
            console.log(this.props.wallet);
            wallet = this.props.wallet;


            this.setState({
                wallet_height: wallet.blockchainHeight(),
                blockchain_height: wallet.daemonBlockchainHeight(),
                daemon_host: this.props.daemon_host,
                daemon_port: this.props.daemon_port
            });

            try {
                let gst_obj = {};
                gst_obj.interval = 0;
                gst_obj.daemon_host = this.props.daemon_host;
                gst_obj.daemon_port = this.props.daemon_port;
                let gst = await get_staked_tokens(gst_obj);
                try {
                    let height = wallet.daemonBlockchainHeight();
                    console.log(height);
                    let previous_interval = (height - (height % 10)) / 10;
                    let gim_obj = {};
                    gim_obj.begin_interval = previous_interval - 3;
                    gim_obj.end_interval = previous_interval + 1;
                    gim_obj.daemon_host = this.props.daemon_host;
                    gim_obj.daemon_port = this.props.daemon_port;

                    console.log(`gim object`);
                    console.log(gim_obj);
                    let gim = await get_interest_map(gim_obj);

                    this.setState({
                        blockchain_tokens_staked: gst.pairs[0].amount / 10000000000,
                        blockchain_interest_history: gim.interest_per_interval.slice(0, 4),
                        blockchain_current_interest: gim.interest_per_interval[4]
                    });
                } catch (err) {
                    console.error(err);
                    console.error(`error at getting the period interest`);
                }
            } catch (err) {
                console.error(err);
                console.error(`error at getting the staked tokens from the blockchain`);
            }
            if (wallet.connected() !== 'disconnected') {
                this.setState({connection_status: 'Connected to the Safex Blockchain Network'});

            } else {
                this.setState({connection_status: 'Unable to connect to the Safex Blockchain Network'});
            }
            if (wallet.synchronized()) {
                this.setState({synced: true});
            } else {
                const timer = setInterval(() => {
                    if (wallet.synchronized()) {
                        clearInterval(this.state.timer);
                    } else {
                        this.check();
                    }
                }, 1000);
                this.setState({timer: timer});
                this.setState({synced: false});
            }
            wallet.on('newBlock', function (height) {
                console.log("blockchain updated, height: " + height);
                this.setState({
                    blockchain_height: height
                });
            });
            wallet.on('refreshed', () => {
                console.log();
                this.refresh_action();
            });
            console.log(wallet.synchronized());

            this.setState({loading: false, address: wallet.address(), wallet: wallet});

            var accs = wallet.getSafexAccounts();

            console.log(accs);
            console.log(`accounts`);
            this.setState({usernames: accs, selected_user: {index: 0, username: accs[0].username}});
        } catch (err) {
            console.error(err);
            console.log("errors on startup");
        }
    };

    refresh_action = async () => {
        let m_wallet = wallet;
        console.log("refreshing rn");
        try {
            let gst_obj = {};
            gst_obj.interval = 0;
            gst_obj.daemon_host = this.state.daemon_host;
            gst_obj.daemon_port = this.state.daemon_port;
            let gst = await get_staked_tokens(gst_obj);
            try {
                let height = wallet.daemonBlockchainHeight();
                console.log(height);
                let previous_interval = (height - (height % 10)) / 10;
                let gim_obj = {};
                gim_obj.begin_interval = previous_interval - 3;
                gim_obj.end_interval = previous_interval + 1;
                gim_obj.daemon_host = this.state.daemon_host;
                gim_obj.daemon_port = this.state.daemon_port;

                console.log(`gim object`);
                console.log(gim_obj);
                let gim = await get_interest_map(gim_obj);

                this.setState({
                    blockchain_tokens_staked: gst.pairs[0].amount / 10000000000,
                    blockchain_interest_history: gim.interest_per_interval.slice(0, 4),
                    blockchain_current_interest: gim.interest_per_interval[4]
                });
            } catch (err) {
                console.error(err);
                console.error(`error at getting the period interest`);
            }
        } catch (err) {
            console.error(err);
            console.error(`error at getting the staked tokens from the blockchain`);
        }
        try {
            m_wallet.store().then(() => {
                console.log("wallet stored refresh");

                var accs = wallet.getSafexAccounts();


                this.setState({
                    address: m_wallet.address(),
                    pending_cash: normalize_8decimals(
                        Math.abs(m_wallet.balance() - m_wallet.unlockedBalance())
                    ),
                    synced: m_wallet.synchronized() ? true : false,
                    wallet_height: wallet.blockchainHeight(),
                    blockchain_height: wallet.daemonBlockchainHeight(),
                    cash: normalize_8decimals(m_wallet.unlockedBalance()),
                    pending_tokens: normalize_8decimals(m_wallet.tokenBalance() - m_wallet.unlockedTokenBalance()),
                    tokens: normalize_8decimals(m_wallet.unlockedTokenBalance()),
                    first_refresh: true,
                    usernames: accs
                });
            }).catch((err) => {
                console.log("unable to store wallet refresh: " + err);
                console.error(err);
            });
        } catch (err) {
            console.error(err);
            console.error("error getting height");
        }
    };

    check = () => {
        console.log(`wallet cash balance ${wallet.balance()}`);
        console.log(`wallet daemon blockchain height ${wallet.daemonBlockchainHeight()}`);
        console.log(`wallet synchronized status: ${wallet.synchronized()}`);
        console.log(`wallet height: ${wallet.blockchainHeight()}`);
        console.log(wallet.address());
        console.log(wallet.secretSpendKey());
        console.log(wallet.secretViewKey());
        if (wallet.connected() !== 'disconnected') {
            console.log(wallet.connected());
            console.log("wallet connected");
            //m_wallet.on('refreshed', this.refresh_action());
            this.props.wallet.on('newBlock', (height) => {
                console.log(height)
            });
            this.setState({connection_status: 'Connected to the Safex Blockchain Network'});
        } else {
            this.setState({connection_status: 'Unable to connect to the Safex Blockchain Network'});
        }
        if (wallet.synchronized()) {
            console.log("wallet synchronized");
            this.setState({
                synced: true,
                cash: normalize_8decimals(wallet.unlockedBalance()),
                blockchain_height: wallet.daemonBlockchainHeight(),
                wallet_height: wallet.blockchainHeight()
            });
        } else {
            this.setState({
                synced: false,
                blockchain_height: wallet.daemonBlockchainHeight(),
                wallet_height: wallet.blockchainHeight()
            });
        }
    };

    rescan = (e) => {
        let confirmed = window.confirm("are you sure you want to continue, " +
            "this will halt the wallet operation while the rescan is in progress");
        console.log(confirmed);
        if (confirmed) {
            wallet.off();
            wallet.rescanBlockchain();
            wallet.store().then(() => {
                console.log("wallet stored")
            }).catch((err) => {
                console.log("unable to store wallet: " + err)
            });
            wallet.on('refreshed', () => {
                console.log();
                this.refresh_action();
            });
        }
    };

    remove_account = async (user) => {
        try {
            let removed = wallet.removeSafexAccount(user);
            if (removed) {
                console.log(`successfully removed ${user}`);
            } else {
                console.error(`error at trying to remove ${user}`);
            }
        } catch (err) {
            console.error(err);
            console.error(`error at trying to remove an account`);
        }
    };


    test_sign = async () => {
        try {
            let keys = nacl.sign.keyPair.fromSecretKey(Buffer.from(this.state.usernames[0].privateKey));
            console.log(keys);

            console.log(this.state.usernames[0].privateKey);
            console.log(this.state.usernames[0].publicKey)

            console.log(String.fromCharCode.apply(null, keys.secretKey));
        } catch (err) {
            console.error(err);
        }
    };

    register_account = async (e) => {
        e.preventDefault();
        if (this.state.tokens >= 5000 && this.state.first_refresh === true) {
            try {
                let vees = e.target;

                console.log(vees);

                let d_obj = {};
                if (vees.avatar.value.length > 0) {
                    d_obj.avatar = vees.avatar.value;
                }
                if (vees.twitter.value.length > 0) {
                    d_obj.twitter = vees.twitter.value;
                }
                if (vees.facebook.value.length > 0) {
                    d_obj.facebook = vees.facebook.value;
                }
                if (vees.biography.value.length > 0) {
                    d_obj.biography = vees.biography.value;
                }
                if (vees.website.value.length > 0) {
                    d_obj.website = vees.website.value;
                }
                if (vees.location.value.length > 0) {
                    d_obj.location = vees.location.value;
                }
                d_obj.twm_version = 1;
                console.log(JSON.stringify(d_obj));
                let account = wallet.createSafexAccount(e.target.username.value, JSON.stringify(d_obj));
                console.log(account);
                console.log(`account registered`);

                var accs = wallet.getSafexAccounts();

                console.log(accs);
                console.log(`accounts`);
                let mixins = e.target.mixins.value - 1;
                if (account) {
                    console.log(`let's register it`);

                    let confirm_registration = wallet.createAdvancedTransaction({
                        tx_type: '6',
                        safex_username: e.target.username.value,
                        mixin: mixins
                    }).then((tx) => {
                        console.log(tx);
                        let confirmed_fee = window.confirm(`the fee to send this transaction will be:  ${tx.fee() / 10000000000} SFX Safex Cash`);
                        let fee = tx.fee();
                        let txid = tx.transactionsIds();
                        if (confirmed_fee) {
                            tx.commit().then(async (commit) => {
                                console.log(commit);
                                console.log("committed transaction");
                                alert(`transaction successfully submitted 
                        transaction id: ${txid}
                        tokens locked for 500 blocks: 5000 SFT
                        fee: ${fee / 10000000000}`);

                            }).catch((err) => {
                                console.error(err);
                                console.error(`error at the committing of the account registration transaction`);
                                alert(`there was an error at committing the transaction to the blockchain`);
                            })
                        } else {
                            alert(`your transaction was cancelled, no account registration was completed`);
                        }
                    }).catch((err) => {
                        console.error(err);
                        alert(`error when committing the transaction: likely has not gone through`)
                    })
                } else {
                    alert(`not enough tokens`);
                }

            } catch (err) {
                console.error(err);
                console.error("error at the register account function");
            }
        } else {
            alert(`please wait until the wallet has fully loaded before performing registration actions`)
        }
    };

    //basic send transactions
    token_send = async (e) => {
        e.preventDefault();
        e.persist();
        try {
            let mixins = e.target.mixins.value - 1;
            if (mixins >= 0) {
                let confirmed = window.confirm(`are you sure you want to send ${e.target.amount.value} SFT Safex Tokens, ` +
                    `to ${e.target.destination.value}`);
                console.log(confirmed);
                if (confirmed) {
                    try {
                        let token_txn = await send_tokens(wallet, e.target.destination.value, e.target.amount.value, mixins);
                        let confirmed_fee = window.confirm(`the fee to send this transaction will be:  ${token_txn.fee() / 10000000000} SFX Safex Cash`);
                        let fee = token_txn.fee();
                        let txid = token_txn.transactionsIds();
                        let amount = e.target.amount.value;
                        if (confirmed_fee) {
                            try {
                                let committed_txn = await commit_txn(token_txn);
                                console.log(committed_txn);
                                console.log(token_txn);
                                alert(`token transaction successfully submitted 
                                        transaction id: ${txid}
                                        amount: ${amount} SFT
                                        fee: ${fee / 10000000000} SFX`);
                            } catch (err) {
                                console.error(err);
                                console.error(`error when trying to commit the token transaction to the blockchain`);
                                alert(`error when trying to commit the token transaction to the blockchain`);
                            }
                        } else {
                            console.log("token transaction cancelled");
                        }
                    } catch (err) {
                        console.error(err);
                        console.error(`error at the token transaction formation it was not commited`);
                        alert(`error at the token transaction formation it was not commited`);
                    }
                }
            }
        } catch (err) {
            console.error(err);
            if (err.toString().startsWith('not enough outputs')) {
                alert(`choose fewer mixins`);
            }
            console.error(`error at the token transaction`);
        }
    };

    cash_send = async (e) => {
        e.preventDefault();
        e.persist();
        try {
            let mixins = e.target.mixins.value - 1;
            if (mixins >= 0) {
                let confirmed = window.confirm(`are you sure you want to send ${e.target.amount.value} SFX Safex Cash, ` +
                    `to ${e.target.destination.value}`);
                console.log(confirmed);
                if (confirmed) {
                    try {
                        let cash_txn = await send_cash(wallet, e.target.destination.value, e.target.amount.value, mixins);
                        console.log(cash_txn);
                        let confirmed_fee = window.confirm(`the fee to send this transaction will be:  ${cash_txn.fee() / 10000000000} SFX Safex Cash`);
                        let fee = cash_txn.fee();
                        let txid = cash_txn.transactionsIds();
                        let amount = e.target.amount.value;
                        if (confirmed_fee) {
                            try {

                                let committed_txn = await commit_txn(cash_txn);
                                console.log(committed_txn);
                                console.log(cash_txn);
                                alert(`cash transaction successfully submitted 
                                        transaction id: ${txid}
                                        amount: ${amount}
                                        fee: ${fee / 10000000000}`);
                            } catch (err) {
                                console.error(err);
                                console.error(`error at commiting the cash transaction to the blockchain network`);
                                alert(`error at commiting the cash transaction to the blockchain network`);
                            }
                        } else {
                            alert(`the cash transaction was cancelled`)
                        }
                    } catch (err) {
                        console.error(err);
                        console.error(`error at the cash transaction formation it was not commited`);
                        alert(`error at the cash transaction formation it was not commited`);
                    }
                }
            }
        } catch (err) {
            console.error(err);
            if (err.toString().startsWith('not enough outputs')) {
                alert(`choose fewer mixins`);
            }
            console.error(`error at the cash transaction`);
        }
    };

    //view shifting
    go_home = () => {
        this.setState({interface_view: 'home'});
    };

    show_market = () => {
        var offrs = wallet.listSafexOffers(true);
        let non_offers = [];
        let twm_offers = [];

        for (var i in offrs) {/*
            console.log("Safex offer " + i + " title: " + offrs[i].title);
            console.log("Safex offer description: " + offrs[i].description);
            console.log("Safex offer quantity: " + offrs[i].quantity);
            console.log("Safex offer price: " + offrs[i].price);
            console.log("Safex offer minSfxPrice: " + offrs[i].minSfxPrice);
            console.log("Safex offer pricePegUsed: " + offrs[i].pricePegUsed);
            console.log("Safex offer pricePegID: " + offrs[i].pricePegID);
            console.log("Safex offer seller: " + offrs[i].seller);
            console.log("Safex offer active: " + offrs[i].active);
            console.log("Safex offer offerID: " + offrs[i].offerID);
            console.log("Safex offer currency: " + offrs[i].currency);
*/
            try {
                let offer_description = JSON.parse(offrs[i].description);
                if (offer_description.version > 0) {
                    offrs[i].descprition = offer_description;
                    twm_offers.push(offrs[i]);

                } else {
                    non_offers.push(offrs[i]);
                    console.log("not a twm structured offer");
                }

            } catch (err) {
                console.error(`error at parsing json from description`);
                console.error(err);
                non_offers.push(offrs[i]);
            }
        }

        this.setState({
            twm_offers: twm_offers,
            non_offers: non_offers,
            interface_view: 'market'
        });
    };

    show_merchant = () => {

        var offrs = wallet.listSafexOffers(true);
        let non_offers = [];
        let twm_offers = [];

        for (var i in offrs) {/*
            console.log("Safex offer " + i + " title: " + offrs[i].title);
            console.log("Safex offer description: " + offrs[i].description);
            console.log("Safex offer quantity: " + offrs[i].quantity);
            console.log("Safex offer price: " + offrs[i].price);
            console.log("Safex offer minSfxPrice: " + offrs[i].minSfxPrice);
            console.log("Safex offer pricePegUsed: " + offrs[i].pricePegUsed);
            console.log("Safex offer pricePegID: " + offrs[i].pricePegID);
            console.log("Safex offer seller: " + offrs[i].seller);
            console.log("Safex offer active: " + offrs[i].active);
            console.log("Safex offer offerID: " + offrs[i].offerID);
            console.log("Safex offer currency: " + offrs[i].currency);
*/
            try {
                let offer_description = JSON.parse(offrs[i].description);
                if (offer_description.version > 0) {
                    offrs[i].descprition = offer_description;
                    twm_offers.push(offrs[i]);

                } else {
                    non_offers.push(offrs[i]);
                    console.log("not a twm structured offer");
                }

            } catch (err) {
                console.error(`error at parsing json from description`);
                console.error(err);
                non_offers.push(offrs[i]);
            }
        }

        this.setState({
            twm_offers: twm_offers,
            non_offers: non_offers,
            interface_view: 'merchant'
        });
    };

    show_staking = () => {
        this.setState({interface_view: 'staking'})
    };

    show_settings = () => {
        this.setState({interface_view: 'settings'})
    };

    logout = () => {
        wallet.close(true)
            .then(() => {
                console.log("wallet closed")
                this.props.history.push({pathname: '/'});
            })
            .catch((e) => {
                console.log("unable to close wallet: " + e)
            });
    };

    //open new account


    //open new sell offer


    //close modal of private keys
    handleClose = () => {
        this.setState({show_keys: false});
    };

    //show modal of private keys
    handleShow = () => {
        this.setState({show_keys: true});
    };

    handleCloseNewOfferForm = () => {
        this.setState({show_new_offer_form: false});
    };

    handleShowNewOfferForm = () => {
        this.setState({show_new_offer_form: true});
    };

    handleCloseNewAccountForm = () => {
        this.setState({show_new_account_form: false});
    };

    handleShowNewAccountForm = () => {
        this.setState({show_new_account_form: true});
    };
    //merchant
    load_offers = (username, index) => {
        this.setState({selected_user: {username: username, index: index}});
        console.log(username);
        console.log(index);
    };

    list_new_offer = (e) => {
        e.preventDefault();
        e.persist();
        console.log(`let's register it`);


        try {
            let mixins = e.target.mixins.value - 1;
            let confirm_registration = wallet.createAdvancedTransaction({
                tx_type: '8',
                safex_username: e.target.username.value,
                safex_offer_title: e.target.title.value,
                safex_offer_price: e.target.price.value * 10000000000,
                safex_offer_quantity: e.target.quantity.value,
                safex_offer_description: 'hello',
                safex_offer_price_peg_used: 0,
                mixin: mixins
            }).then((tx) => {
                console.log(tx);
                let confirmed_fee = window.confirm(`the fee to send this transaction will be:  ${tx.fee() / 10000000000} SFX Safex Cash`);
                let fee = tx.fee();
                let txid = tx.transactionsIds();
                if (confirmed_fee) {
                    tx.commit().then(async (commit) => {
                        console.log(commit);
                        console.log("committed transaction");
                        alert(`transaction successfully submitted 
                        transaction id: ${txid}
                        fee: ${fee / 10000000000}`);

                    }).catch((err) => {
                        console.error(err);
                        console.error(`error at the committing of the account registration transaction`);
                        alert(`there was an error at committing the transaction to the blockchain`);
                    })
                } else {
                    alert(`your transaction was cancelled, no account registration was completed`);
                }

            }).catch((err) => {
                console.error(err);
                alert(`error when committing the transaction: likely has not gone through`)
            })
        } catch (err) {
            console.error(err);
            console.error("error at listing the offer");
        }
    };

    make_token_stake = async (e) => {
        e.preventDefault();
        e.persist();
        try {
            let mixins = e.target.mixins.value - 1;
            if (mixins >= 0) {
                let confirmed = window.confirm(`are you sure you want to stake ${e.target.amount.value} SFT Safex Tokens?`);
                console.log(confirmed);
                if (confirmed) {
                    try {
                        let stake_txn = await stake_tokens(wallet, e.target.amount.value, mixins);
                        let confirmed_fee = window.confirm(`the fee to send this transaction will be:  ${stake_txn.fee() / 10000000000} SFX Safex Cash`);
                        let fee = stake_txn.fee();
                        let txid = stake_txn.transactionsIds();
                        let amount = e.target.amount.value;
                        if (confirmed_fee) {
                            try {
                                let committed_txn = await commit_txn(stake_txn);
                                console.log(committed_txn);
                                console.log(stake_txn);
                                alert(`token staking transaction successfully submitted 
                                        transaction id: ${txid}
                                        amount: ${amount} SFT
                                        fee: ${fee / 10000000000} SFX`);
                            } catch (err) {
                                console.error(err);
                                console.error(`error when trying to commit the token staking transaction to the blockchain`);
                                alert(`error when trying to commit the token staking transaction to the blockchain`);
                            }
                        } else {
                            console.log("token staking transaction cancelled");
                        }
                    } catch (err) {
                        console.error(err);
                        console.error(`error at the token staking transaction formation it was not commited`);
                        alert(`error at the token staking transaction formation it was not commited`);
                    }
                }
            }
        } catch (err) {
            console.error(err);
            if (err.toString().startsWith('not enough outputs')) {
                alert(`choose fewer mixins`);
            }
            console.error(`error at the token transaction`);
        }
    };

    make_token_unstake = async (e) => {
        e.preventDefault();
        e.persist();
        try {
            let mixins = e.target.mixins.value - 1;
            if (mixins >= 0) {
                let confirmed = window.confirm(`are you sure you want to stake ${e.target.amount.value} SFT Safex Tokens?`);
                console.log(confirmed);
                if (confirmed) {
                    try {
                        let unstake_txn = await unstake_tokens(wallet, e.target.amount.value, mixins);
                        let confirmed_fee = window.confirm(`the fee to send this transaction will be:  ${unstake_txn.fee() / 10000000000} SFX Safex Cash`);
                        let fee = unstake_txn.fee();
                        let txid = unstake_txn.transactionsIds();
                        let amount = e.target.amount.value;
                        if (confirmed_fee) {
                            try {
                                let committed_txn = await commit_txn(unstake_txn);
                                console.log(committed_txn);
                                console.log(unstake_txn);
                                alert(`token unstake transaction committed  
                                        transaction id: ${txid}
                                        amount: ${amount} SFT
                                        fee: ${fee / 10000000000} SFX`);
                            } catch (err) {
                                console.error(err);
                                console.error(`error when trying to commit the token staking transaction to the blockchain`);
                                alert(`error when trying to commit the token staking transaction to the blockchain`);
                            }
                        } else {
                            console.log("token staking transaction cancelled");
                        }
                    } catch (err) {
                        console.error(err);
                        console.error(`error at the token staking transaction formation it was not commited`);
                        alert(`error at the token staking transaction formation it was not commited`);
                    }
                }
            }
        } catch (err) {
            console.error(err);
            if (err.toString().startsWith('not enough outputs')) {
                alert(`choose fewer mixins`);
            }
            console.error(`error at the token transaction`);
        }
    };

    to_ellipsis = (text) => {
        const text_to_ellipse = text
    
        const ellipse = `${text_to_ellipse.substring(0, 10)}.....${text_to_ellipse.substring(text_to_ellipse.length - 10, text_to_ellipse.length)}`

        return (
            ellipse
        )

    }

    copyAddressToClipboard = () => {
        alert("This button is not wokring :/")
      }
    

    render() {


        const twmwallet = () => {
            switch (this.state.interface_view) {

                case "home": {

                    // Creates the accounts table variable
                    var accounts_table = this.state.usernames.map((user, key) => {
                        console.log(user);
                        console.log(key);
                        try {
                            let usee_d = JSON.parse(user.data);

                            return <Row className="account_element" key={key}>
                                <Col sm={4}>
                                    <Image width={100} height={100} src={require("./../../img/sails-logo.png")/*usee_d.avatar*/} roundedCircle/>
                                </Col>
                                <Col sm={8}>
                                    <ul>
                                        <li>{user.username}</li>
                                        <li>{usee_d.location}</li>
                                        <li>{usee_d.biography}</li>
                                        <li>{usee_d.website}</li>
                                        <li>{usee_d.twitter}</li>
                                        {user.status == 0 ? (
                                            <li>
                                                <button onClick={() => this.remove_account(user.username)}>Remove
                                                </button>
                                            </li>
                                        ) : ''}
                                    </ul>
                                </Col>
                            </Row>

                        } catch (err) {
                            console.error(`failed to properly parse the user data formatting`);
                            console.error(err);
                    }
                    // End of creating the accounts table variable

                     // Creates the new items table variable
                     /*
                    var new_listings_table = this.state.twm_offers.map((listing, key) => {
                        console.log(key);
                        try {
                            return <tr key={key}>
                                <td>{listing.title}</td>
                                <td>{listing.quantity}</td>
                                <td>{listing.price / 10000000000}</td>
                                <td>{listing.seller}</td>
                                <td>{listing.offerID}</td>
                            </tr>

                        } catch (err) {
                            console.error(`failed to properly parse the user data formatting`);
                            console.error(err);
                        }

                    });
                    */
                    // End of creating new items table variable


                    });
                    return (
                        <Row lg>
                           
                                <Col sm={4}>
                                   
                                        <div className="wallet-box mb-2 mr-2 ml-2 p-2 font-size-small">
                                           
                                            <h3> Safex Cash </h3> 

                                            <ul>
                                                <li>{this.state.cash} SFX</li>

                                                {this.state.pending_cash > 0 ?
                                                    (<li>{this.state.pending_cash} Pending</li>) : ''}

                                                {this.state.pending_cash > 0 ?
                                                    (<li>{this.state.cash + this.state.pending_cash} NET</li>) : ''}
                                            </ul>

                                            <Form id="send_cash" onSubmit={this.cash_send}>
                                                Destination Address <Form.Control name="destination"
                                                                                    defaultValue="Safex5..."
                                                                                    placedholder="the destination address"/>
                                                Amount (SFX)<Form.Control name="amount" defaultValue="0"
                                                                            placedholder="the amount to send"/>
                                                Mixin Ring Size <Form.Control name="mixins" defaultValue="7"
                                                                                placedholder="choose the number of mixins"/>
                                                <Button className="mt-2" type="submit" variant="warning" size="lg" block>
                                                    Send Cash
                                                </Button>
                                            </Form>
                                                
                                        </div>
                                    

                                    
                                        <div className="wallet-box m-2 p-2 font-size-small">

                                            <h3> Safex Token </h3>
                                                
                                            <ul>
                                                <li>{this.state.tokens} SFT</li>
                                                {this.state.pending_tokens > 0 ?
                                                    (<li>{this.state.pending_tokens} Pending</li>) : ''}
                                                {this.state.pending_tokens > 0 ?
                                                    (
                                                        <li>{this.state.tokens + this.state.pending_tokens} NET</li>) : ''}
                                            </ul>  

                                            <Form id="send_token" onSubmit={this.token_send}>
                                                Destination Address <Form.Control name="destination"
                                                                                    defaultValue="Safex5..."
                                                                                    placedholder="the destination address"/>
                                                Amount (SFT)<Form.Control name="amount" defaultValue="0"
                                                                                placedholder="the amount to send"/>
                                                Mixin Ring Size <Form.Control name="mixins" defaultValue="7"
                                                                                placedholder="choose the number of mixins"/>
                                                <Button className="mt-2" type="submit" variant="warning" size="lg" block>
                                                    Send Tokens
                                                </Button>
                                            </Form>
                                        </div>
                                   
                                </Col>

                                
                                <Col className="accounts" sm={8}>
                                    <div className="account-list">
                                        <h2 className="text-center m-2"> Accounts </h2>
                                        {accounts_table}
                                        <div className="accounts-box">
                                            <Col sm={4}>
                                                <Image width={100} height={100} src={require("./../../img/sails-logo.png")} roundedCircle/>
                                            </Col>
                                            <Col sm={8}>
                                                <ul>
                                                    <li>User Name</li>
                                                    <li>Bio</li>
                                                    <li>Location</li>
                                                    <li>Website</li>
                                                    <li>Twitter</li>
                                                    {0 == 0 ? (
                                                        <li>
                                                            <Button className="m-1" variant="danger" onClick={() => alert("catfish")}>
                                                                Remove
                                                            </Button>
                                                        </li>
                                                    ) : ''}
                                                </ul>
                                            </Col>
                                        </div>
                                        <div className="accounts-box">
                                            <Col sm={4}>
                                                <Image width={100} height={100} src={require("./../../img/sails-logo.png")} roundedCircle/>
                                            </Col>
                                            <Col sm={8}>
                                                <ul>
                                                    <li>User Name</li>
                                                    <li>Bio</li>
                                                    <li>Location</li>
                                                    <li>Website</li>
                                                    <li>Twitter</li>
                                                    {0 == 0 ? (
                                                        <li>
                                                            <Button className="m-1" variant="danger" onClick={() => alert("catfish")}>
                                                                Remove
                                                            </Button>
                                                        </li>
                                                    ) : ''}
                                                </ul>
                                            </Col>
                                        </div>

                                    </div>
                                    <div className="account-list">
                                        <thead>
                                        <tr>
                                            <th>Title</th>
                                            <th>Quantity</th>
                                            <th>Price (SFX)</th>
                                            <th>Seller</th>
                                            <th>Offer id</th>
                                        </tr>
                                        </thead>
                                        <td>TITLE</td>
                                        <td>QUANTITY</td>
                                        <td>PRICE</td>
                                        <td>SELLER</td>
                                        <td>ID</td>
                                            
                                    </div>
                                </Col>
                        </Row>
                    );
                }
                case "market":
                    var twm_listings_table = this.state.twm_offers.map((listing, key) => {
                        console.log(key);
                        try {
                            return <tr className="white-text" key={key}>
                                <td>{listing.title}</td>
                                <td>{listing.quantity}</td>
                                <td>{listing.price / 10000000000}</td>
                                <td>{listing.seller}</td>
                                <td>{listing.offerID}</td>
                            </tr>

                        } catch (err) {
                            console.error(`failed to properly parse the user data formatting`);
                            console.error(err);
                        }

                    });

                    var non_listings_table = this.state.non_offers.map((listing, key) => {
                        console.log(key);
                        try {
                            return <tr key={key}>
                                <td>{listing.title}</td>
                                <td>{listing.quantity}</td>
                                <td>{listing.price / 10000000000}</td>
                                <td>{listing.seller}</td>
                                <td>{this.to_ellipsis(listing.offerID)}</td>
                                <td><select className="light-blue-back" id="quantity">
                                    <option value="1">1</option>
                                </select></td>
                                <td>
                                    <Button variant="success">BUY</Button>
                                </td>
                                <td>
                                    <Button variant="info">CONTACT</Button>
                                </td>
                            </tr>

                        } catch (err) {
                            console.error(`failed to properly parse the user data formatting`);
                            console.error(err);
                        }

                    });
                    return (
                    <div className="overflow-y">
                        <Row>
                            <Col className="max-h500px white-text overflow-y" md={12}>
                                <Col className="search-box d-flex flex-column align-items-center border border-white light-blue-back" > 
                                    
                                    <div class="row width100 border-bottom border-white" id="search">
                                        <form className="width100 no-gutters p-2" id="search-form" action="" method="POST" enctype="multipart/form-data">
                                            <div class="form-group col-sm-9">
                                                <input class="form-control" type="text" placeholder="eg. api.theworldmarketplace.com" />
                                            </div>
                                            <div class="form-group col-sm-3">
                                                <button type="submit" class="btn btn-block btn-primary">Set Market API</button>
                                            </div>
                                        </form>
                                    </div>
                                    <div class="row" id="search">
                                        <form className="no-gutters p-2" id="search-form" action="" method="POST" enctype="multipart/form-data">
                                            <div class="form-group col-sm-9">
                                                <input class="form-control" type="text" placeholder="Search" />
                                            </div>
                                            <div class="form-group col-sm-3">
                                                <button type="submit" class="btn btn-block btn-primary">Search</button>
                                            </div>
                                        </form>
                                    </div>
                                    <div class="row" id="filter">
                                        <form>
                                            <div class="form-group col-sm-3 col-xs-6">
                                                <select data-filter="make" class="filter-make filter form-control">
                                                    <option value="">Category</option>
                                                    <option value="">Any</option>
                                                    <option value="">Category</option>
                                                    <option value="">Books</option>
                                                    <option value="">Clothes</option>
                                                    <option value="">Digital</option>
                                                    <option value="">Toys</option>
                                                </select>
                                            </div>
                                            <div class="form-group col-sm-3 col-xs-6">
                                                <select data-filter="model" class="filter-model filter form-control">
                                                    <option value="">Location</option>
                                                    <option value="">Any</option>
                                                    <option value="">Africa</option>
                                                    <option value="">Asia</option>
                                                    <option value="">Africa</option>
                                                    <option value="">Europe</option>
                                                    <option value="">North America</option>
                                                    <option value="">South America</option>
                                                </select>
                                            </div>
                                            <div class="form-group col-sm-3 col-xs-6">
                                                <select data-filter="type" class="filter-type filter form-control">
                                                    <option value="">Price Range</option>
                                                    <option value="">$0 - $24.99</option>
                                                    <option value="">$25 - $49.99</option>
                                                    <option value="">$50 - $199.99</option>
                                                    <option value="">$200 - $499.99</option>
                                                    <option value="">$500 - $999.99</option>
                                                    <option value="">$1000+</option>
                                                </select>
                                            </div>
                                            <div class="form-group col-sm-3 col-xs-6">
                                                <select data-filter="price" class="filter-price filter form-control">
                                                    <option value="">Sort by...</option>
                                                    <option value="">$$$ Asc</option>
                                                    <option value="">$$$ Dec</option>
                                                    <option value="">Rating Asc</option>
                                                    <option value="">Rating Dec</option>
                                                </select>
                                            </div>
                                        </form>
                                    </div>

                                </Col>

                                {this.state.twm_offers.length > 1 ? (
                                    <Table color="white" className="white-text border border-white b-r10">
                                        <thead>
                                        <tr>
                                            <th>Title</th>
                                            <th>Quantity</th>
                                            <th>Price (SFX)</th>
                                            <th>Seller</th>
                                            <th>Offer ID</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {twm_listings_table}
                                        </tbody>
                                    </Table>) : (<div></div>)}

                                <Table>
                                    <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Quantity</th>
                                        <th>Price (SFX)</th>
                                        <th>Seller</th>
                                        <th>Offer ID</th>
                                        <th>Actions</th>
                                        <th></th>
                                        <th></th>
                                    </tr>
                                    </thead>

                                    <tbody>
                                    {non_listings_table}
                                    </tbody>
                                </Table>
                            </Col>
                        </Row>
                    </div>);
                case "merchant": {
                    var twm_listings_table = this.state.twm_offers.map((listing, key) => {
                        console.log(key);
                        try {
                            if (listing.seller === this.state.selected_user.username) {
                                return <tr key={key}>
                                    <td>{listing.title}</td>
                                    <td>{listing.quantity}</td>
                                    <td>{listing.price / 10000000000}</td>
                                    <td>{listing.seller}</td>
                                    <td>{listing.offerID}</td>
                                </tr>
                            }
                        } catch (err) {
                            console.error(`failed to properly parse the user data formatting`);
                            console.error(err);
                        }

                    });

                    var non_listings_table = this.state.non_offers.map((listing, key) => {
                        console.log(listing);
                        try {
                            if (listing.seller === this.state.selected_user.username) {
                                return <tr key={key}>
                                    <td>{listing.title}</td>
                                    <td>{listing.quantity}</td>
                                    <td>{listing.price / 10000000000}</td>
                                    <td>{listing.seller}</td>
                                    <td>{listing.offerID}</td>
                                    <td>
                                        <Button>edit</Button>
                                    </td>
                                </tr>
                            }
                        } catch (err) {
                            console.error(`failed to properly parse the user data formatting`);
                            console.error(err);
                        }
                    });
                    var accounts_table = this.state.usernames.map((user, key) => {
                        console.log(user);
                        console.log(key);
                        try {
                            let usee_d = JSON.parse(user.data);

                            return <Row
                                className={this.state.selected_user.username === user.username ? "selected_account_element" : "account_element"}
                                key={key} onClick={() => this.load_offers(user.username, key)}>
                                <Col>
                                    <Image width={80} height={80} src={require("./../../img/sails-logo.png")/*usee_d.avatar*/} roundedCircle/>
                                </Col>
                                <Col>
                                    <ul>
                                        <li>{user.username}</li>
                                        <li>{usee_d.location}</li>
                                        <li>{usee_d.biography}</li>
                                        <li>{usee_d.website}</li>
                                        <li>{usee_d.twitter}</li>
                                        {user.status == 0 ? (
                                            <li>
                                                <button onClick={() => this.remove_account(user.username, key)}>remove
                                                </button>
                                            </li>
                                        ) : ''}
                                    </ul>
                                </Col>
                            </Row>
                        } catch (err) {
                            console.error(`failed to properly parse the user data formatting`);
                            console.error(err);
                        }
                    });
                    try {
                        var selected = this.state.usernames[this.state.selected_user.index];
                        console.log(selected);
                        var data = JSON.parse(selected.data);
                    } catch (err) {
                        console.error(err);
                        console.error(`error at the point of parsing selected user data`);
                    }


                    try {
                        return (
                            <Row>
                                <Col sm={4}>
                                    <Row>
                                        <Button variant="primary" onClick={this.handleShowNewAccountForm}>
                                            New Account
                                        </Button>

                                        <Modal animation={false} show={this.state.show_new_account_form}
                                               onHide={this.handleCloseNewAccountForm}>
                                            <Modal.Header closeButton>
                                                <Modal.Title>List a new offer to sell</Modal.Title>
                                            </Modal.Header>
                                            <Modal.Body>
                                                <Form id="create_account" onSubmit={this.register_account}>
                                                    username <Form.Control name="username"
                                                                           placedholder="enter your desired username"/>
                                                    avatar url <Form.Control name="avatar"
                                                                             placedholder="enter the url of your avatar"/>
                                                    twitter link <Form.Control name="twitter" defaultValue="twitter.com"
                                                                               placedholder="enter the link to your twitter handle"/>
                                                    facebook link <Form.Control name="facebook"
                                                                                defaultValue="facebook.com"
                                                                                placedholder="enter the to of your facebook page"/>
                                                    biography <Form.Control as="textarea" name="biography"
                                                                            placedholder="type up your biography"/>
                                                    website <Form.Control name="website" defaultValue="safex.org"
                                                                          placedholder="if you have your own website: paste your link here"/>
                                                    location <Form.Control name="location" defaultValue="Earth"
                                                                           placedholder="your location"/>
                                                    mixins <Form.Control name="mixins" defaultValue="7"
                                                                         placedholder="your location"/>

                                                    <Button variant="primary" type="submit">create account</Button>
                                                </Form>
                                            </Modal.Body>
                                            <Modal.Footer>

                                                <Button variant="secondary" onClick={this.handleCloseNewAccountForm}>
                                                    Close
                                                </Button>
                                            </Modal.Footer>
                                        </Modal>
                                    </Row>

                                    <Row className="account-list">
                                        {accounts_table}
                                    </Row>
                                    {selected !== void (0) ? (<Row className="merchant_profile_view">
                                        <Col>
                                            <Row>
                                                <ul>
                                                    <li><Image width={100} height={100} src={require("./../../img/sails-logo.png")/*data.avatar*/}
                                                               roundedCircle/>
                                                    </li>
                                                    <li>username: {selected.username}</li>
                                                </ul>
                                            </Row>
                                            <Row>
                                                <Button>Edit</Button>
                                                <Button>Remove</Button>
                                            </Row>
                                        </Col>
                                    </Row>) : ''}

                                </Col>
                                <Col className="merchant_product_view" sm={8}>
                                    {selected !== void (0) ? (
                                        <Row>
                                            <Button variant="primary" onClick={this.handleShowNewOfferForm}>
                                                New Offer
                                            </Button>

                                            <Modal animation={false} show={this.state.show_new_offer_form}
                                                   onHide={this.handleCloseNewOfferForm}>
                                                <Modal.Header closeButton>
                                                    <Modal.Title>List a new offer to sell</Modal.Title>
                                                </Modal.Header>
                                                <Modal.Body>
                                                    <Form id="list_new_offer" onSubmit={this.list_new_offer}>
                                                        username <Form.Control name="username"
                                                                               value={selected.username}/>
                                                        thumbnail image url <Form.Control name="thumbnail"/>
                                                        title <Form.Control name="title"/>
                                                        description <Form.Control as="textarea" name="description"/>
                                                        price SFX <Form.Control name="price"/>
                                                        available quantity <Form.Control name="quantity"/>
                                                        shipping destinations <Form.Control name="location"
                                                                                            defaultValue="Earth"
                                                                                            placedholder="your location"/>
                                                        mixins <Form.Control name="mixins" defaultValue="7"
                                                                             placedholder="your location"/>
                                                        <Button type="submit">List Offer</Button>
                                                    </Form>
                                                </Modal.Body>
                                                <Modal.Footer>
                                                    <Button variant="secondary" onClick={this.handleCloseNewOfferForm}>
                                                        Close
                                                    </Button>
                                                </Modal.Footer>
                                            </Modal>
                                        </Row>) : ''}
                                    <Row className="offer__container">
                                        {this.state.twm_offers.length > 1 ? (<Table className="offer__container">
                                            <thead>
                                            <tr>
                                                <th>Title</th>
                                                <th>Quantity</th>
                                                <th>Price (SFX)</th>
                                                <th>Seller</th>
                                                <th>Offer ID</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {twm_listings_table}
                                            </tbody>
                                        </Table>) : (<div></div>)}
                                    </Row>

                                    <Row className="overflow-y">
                                        <Table>
                                            <thead>
                                            <tr>
                                                <th>Title</th>
                                                <th>Quantity</th>
                                                <th>Price (SFX)</th>
                                                <th>Seller</th>
                                                <th>Offer ID</th>
                                                <th>Actions</th>
                                                <th></th>
                                                <th></th>

                                            </tr>
                                            </thead>

                                            <tbody>
                                            {non_listings_table}
                                            </tbody>
                                        </Table>
                                    </Row>
                                </Col>
                            </Row>);
                    } catch (err) {
                        console.log(err);
                        alert(err);
                        return (<div><p>error loading</p></div>);
                    }
                }
                case "staking": {
                    let staked_tokens = wallet.stakedTokenBalance() / 10000000000;
                    let unlocked_tokens = wallet.unlockedStakedTokenBalance() / 10000000000;
                    let pending_stake = (staked_tokens - unlocked_tokens);


                    return (
                        <div>
                            <Row className="wallet">
                                <Col>
                                    <div>
                                        <ul>
                                            <li>{this.state.cash} SFX</li>
                                            {this.state.pending_cash > 0 ?
                                                (<li>{this.state.pending_cash} Pending</li>) : ''}
                                            {this.state.pending_cash > 0 ?
                                                (
                                                    <li>{this.state.cash + this.state.pending_cash} NET</li>) : ''}
                                            <br/>
                                            <li>{this.state.tokens} SFT</li>
                                            {this.state.pending_tokens > 0 ?
                                                (<li>{this.state.pending_tokens} Pending</li>) : ''}
                                            {this.state.pending_tokens > 0 ?
                                                (
                                                    <li>{this.state.tokens + this.state.pending_tokens} NET</li>) : ''}
                                        </ul>
                                        <ul>
                                            <li>number of tokens staked in the
                                                blockchain {this.state.blockchain_tokens_staked}</li>
                                            <li>your staked tokens in the
                                                blockchain {unlocked_tokens} {pending_stake > 0 ? (
                                                    <span>| {pending_stake} pending</span>) : ''}</li>
                                            <li>current blockheight {this.state.blockchain_height}</li>
                                            <li>next payout interval
                                                in {10 - (this.state.blockchain_height % 10)} blocks
                                            </li>
                                            <li>
                                                current accruing
                                                interest {this.state.blockchain_current_interest.cash_per_token / 10000000000} SFX
                                                per token
                                            </li>
                                            <li>
                                                <ul>
                                                    <li>block
                                                        interval {this.state.blockchain_interest_history[3].interval * 10}
                                                        : {this.state.blockchain_interest_history[3].cash_per_token / 10000000000} SFX
                                                        per token
                                                    </li>
                                                    <li>block
                                                        interval {this.state.blockchain_interest_history[2].interval * 10}
                                                        : {this.state.blockchain_interest_history[2].cash_per_token / 10000000000} SFX
                                                        per token
                                                    </li>
                                                    <li>block
                                                        interval {this.state.blockchain_interest_history[1].interval * 10}
                                                        : {this.state.blockchain_interest_history[1].cash_per_token / 10000000000} SFX
                                                        per token
                                                    </li>
                                                    <li>block
                                                        interval {this.state.blockchain_interest_history[0].interval * 10}
                                                        : {this.state.blockchain_interest_history[0].cash_per_token / 10000000000} SFX
                                                        per token
                                                    </li>
                                                </ul>
                                            </li>
                                        </ul>
                                    </div>
                                </Col>
                                <Col>
                                    <ul>
                                        <li>
                                            <Form id="stake_tokens" onSubmit={this.make_token_stake}>
                                                amount (tokens)<Form.Control name="amount" defaultValue="0"
                                                                             placedholder="the amount to send"/>
                                                mixin ring size <Form.Control name="mixins" defaultValue="7"
                                                                              placedholder="choose the number of mixins"/>
                                                <Button type="submit" variant="primary" size="lg" block>stake the
                                                    tokens</Button>
                                            </Form>
                                        </li>
                                        <li>
                                            <Form id="unstake_tokens" onSubmit={this.make_token_unstake}>
                                                amount (tokens) (MAX: {unlocked_tokens})<Form.Control name="amount"
                                                                                                      defaultValue="0"
                                                                                                      placedholder="the amount to send"/>
                                                mixin ring size <Form.Control name="mixins" defaultValue="7"
                                                                              placedholder="choose the number of mixins"/>
                                                <Button type="submit" variant="primary" size="lg" block>unstake and
                                                    collect</Button>
                                            </Form>
                                        </li>
                                    </ul>
                                </Col>
                            </Row>
                        </div>
                    );
                }
                case "settings":
                    return (<div></div>);

                default:
                    return <h1>Major Error</h1>
            }
        };


        return (
            <Container className="height100 justify-content-between" fluid>
                <Container fluid className="no-gutters mt-5 mb-2 p-2 border border-light b-r10 white-text">
                           
                                <Row className="justify-content-between align-items-center">
                                    
                                    <Col sm={2} className="p-1 align-self-center b-r10 light-blue-back">
                                        
                                        <div className="d-flex flex-row justify-content-center align-items-end">
                                            <IconContext.Provider value={{ color: 'white', size: '20px' }}>
                                                    <div className="white-text">
                                                    <GrCubes className="m-1 white-text"/>
                                                    </div>
                                            </IconContext.Provider>
                                            <p className="mb-2"> <b>{this.state.blockchain_height}</b></p>
                                        </div>
                                        
                                            {this.state.wallet_height < this.state.blockchain_height ?
                                                (<p className="mb-2">
                                                    {this.state.wallet_height} / {this.state.blockchain_height}
                                                </p>) : ''}
                                            <p className="mb-2">{this.state.connection_status}</p>
                                        
                                    </Col>
                                    
                                    <div className="menu-logo">
                                        <Image className=" align-content-center" src={require("./../../img/sails-logo.png")}/>  
                                    </div>
                                    
                                    <Col sm={7} className="menu">
                                        <ul className="menu__list">
                                            <li className="menu__list-item">
                                                <a className="menu__link" href="javascript:void(0)"
                                                onClick={this.go_home}>Home</a>
                                            </li>
                                            <li className="menu__list-item">
                                                <a className="menu__link" href="javascript:void(0)"
                                                onClick={this.show_market}>Market</a>
                                            </li>
                                            <li className="menu__list-item">
                                                <a className="menu__link" href="javascript:void(0)"
                                                onClick={this.show_merchant}>Merchant</a>
                                            </li>
                                            <li className="menu__list-item">
                                                <a className="menu__link" href="javascript:void(0)"
                                                onClick={this.show_staking}>Staking</a>
                                            </li>
                                            

                                        </ul>
                                        
                                    </Col>
                                    <div className="d-flex flex-column">
                                        <a className="menu__link" href="javascript:void(0)"
                                        onClick={this.show_settings}><FaCogs className="m-3"/></a>
                                    
                                    
                                        <a className="menu__link" href="javascript:void(0)"
                                        onClick={this.logout}><GiExitDoor className="m-3"/></a>
                                    </div>
                                </Row>
                            
                            
                         
                        
                        <Row className="no-gutters p-2 justify-content-between align-items-center b-r10 grey-back white-text">
                            <Col sm={3}>    
                                <li className="mr-2">
                                    SFX: {this.state.cash}
                                </li>
                                <li className="">
                                    SFT: {this.state.tokens}
                                </li>
                            </Col> 
                            <Col className="just" sm={6}>
                                <p >SFX + SFT Public Address: <b>{this.to_ellipsis(this.state.address)}</b></p>  
                                <Button onClick={this.copyAddressToClipboard}>
                                    Copy Address
                                </Button>
                            </Col>
                            <Col className="d-flex justify-content-center" sm={3}>
                                 
                                        {this.state.synced === false ? (
                                        <Button className="m-1" onClick={this.check}>
                                            Check
                                        </Button>) : ''}
                                            
                                        <Button className="m-1" variant="danger" onClick={this.rescan}>
                                            Hard Rescan
                                        </Button>

                                        <Button className="m-1" variant="primary" onClick={this.handleShow}>
                                            Show Keys
                                        </Button>
                                   
                                        <Modal className="width100 black-text" animation={false} show={this.state.show_keys} onHide={this.handleClose}>
                                            <Modal.Header closeButton>
                                                <Modal.Title>Your Private Keys</Modal.Title>
                                            </Modal.Header>
                                            <Modal.Body>
                                                <ul>
                                                    <li>
                                                        <b>Address:</b> <br/> {this.props.wallet.address()}
                                                    </li>
                                                    <li>
                                                        <b>Secret Spend Key:</b> <br/> {this.props.wallet.secretSpendKey()}
                                                    </li>
                                                    <li>
                                                        <b>Secret View Key:</b> <br/> {this.props.wallet.secretViewKey()}
                                                    </li>
                                                    <li>
                                                        <b>Mnemonic Seed:</b> <br/> {this.props.wallet.seed().toUpperCase()}
                                                    </li>
                                                </ul>
                                            </Modal.Body>
                                            <Modal.Footer>
                                                <Button variant="secondary" onClick={this.handleClose}>
                                                    Close
                                                </Button>
                                            </Modal.Footer>
                                        </Modal>
                                    
                            </Col>      
                        </Row>
                </Container>       
                
                {twmwallet()}

                
            </Container>
        );
    }
}

export default withRouter(WalletHome);