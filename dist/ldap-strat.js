'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _passportStrategy = require('passport-strategy');

var _passportStrategy2 = _interopRequireDefault(_passportStrategy);

var _ldapjs = require('ldapjs');

var _ldapjs2 = _interopRequireDefault(_ldapjs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * @class Strategy
 * @description LDAP implementation of passport-strategy.
 */

var Strategy = function (_ParentStrategy) {
    _inherits(Strategy, _ParentStrategy);

    /**
     * Constructor for Strategy.<br>
     * Various options can be specified to modify the authentication
     * and post-auth search behavior.
     *
     * @param {object} options The configuration options
     * @param {function} verify The search verify method {optional}
     * @api public
     */

    function Strategy(options, verify) {
        _classCallCheck(this, Strategy);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Strategy).call(this));

        if ((typeof options === 'undefined' ? 'undefined' : _typeof(options)) !== 'object' || !options || verify && typeof verify !== 'function') {
            throw new Error('Invalid parameters for Strategy constructor.');
        }
        // assign a name for passport
        _this.name = 'ldap';
        // set some defaults
        _this._options = _this._defaultOptions(options);
        _this._verify = verify || _this._defaultVerify;
        // ensure these methods are set for standalone use
        _this.success = _this.success || function () {};
        _this.fail = _this.fail || function () {};
        return _this;
    }

    /**
     * Performs authentication against the configured LDAP server.
     *
     * @param {object} req The http request containing a `body` with request credentials
     * @return {Promise} A promise resolving to the configured search results or the user dn
     * @api public
     */


    _createClass(Strategy, [{
        key: 'authenticate',
        value: function authenticate(req) {
            var _this2 = this;

            return new Promise(function (resolve, reject) {
                if (!req) {
                    return _this2._fail(new Error('Missing req parameter.'), reject);
                }
                var client = Strategy._createLdapClient(_this2._options.server);
                client.on('error', function (err) {
                    return _this2._fail(err, reject);
                });

                // bind to ldap with the req data
                _this2._bind(client, req.body).then(function (res) {
                    return _this2._success(res, resolve);
                }).catch(function (err) {
                    // console.log('failed auth', err);
                    return _this2._fail(err, reject);
                });
            });
        }

        /**
         * Performs an ldap bind using the specified credentials.
         *
         * @param {object} client The ldap client to bind with
         * @param {object} body The HTTP request body containing credentials to use when binding
         * @return {Promise} A promise containing the dn or search results
         * @api private
         */

    }, {
        key: '_bind',
        value: function _bind(client, body) {
            var _this3 = this;

            return new Promise(function (resolve, reject) {
                var credentials = _this3._getValidatedCredentials(body);
                client.bind(credentials.username, credentials.password, function (err) {
                    if (err) {
                        // console.log('bind error', err);
                        return reject(err);
                    }
                    if (!_this3._options.search || !_this3._options.search.filter) {
                        // success, end early if no search is needed
                        return resolve(credentials.username);
                    }
                    // copy so we can replace template pieces
                    var search = Object.assign({}, _this3._options.search);
                    // replace any placeholders with the original username
                    search.filter = search.filter.replace(/\$\{.*\}/, credentials.originalUsername);
                    // console.log('finished bind - now search', search);

                    return resolve(_this3._search(client, search));
                });
            });
        }

        /**
         * Performs an ldap search using the specified search details.<br>
         * All search entries and references are pooled into an array and returned on end.
         *
         * @param {object} client The ldap client to search with
         * @param {object} search The search object containing the filter, etc
         * @return {Promise} A promise containing the search results
         * @api private
         */

    }, {
        key: '_search',
        value: function _search(client, search) {
            var _this4 = this;

            return new Promise(function (resolve, reject) {
                client.search(search.base, search, function (err, res) {
                    if (err) {
                        return reject(err);
                    }
                    var results = [];
                    res.on('searchEntry', function (entry) {
                        // TODO: emit event
                        results.push(entry.object);
                    });
                    res.on('searchReference', function (reference) {
                        // TODO: emit event
                        results.push(reference.uris);
                    });
                    res.on('error', function (err) {
                        // TODO: emit event
                        return reject(err);
                    });
                    res.on('end', function (result) {
                        // TODO: emit event
                        if (result.status !== 0) {
                            return reject(new Error(result));
                        }
                        _this4._verify(results, function (err, searchResults) {
                            if (err) {
                                return reject(err);
                            }
                            return resolve(searchResults);
                        });
                    });
                });
            });
        }

        /**
         * Returns an ldap client.
         *
         * @param {object} serverOptions The server details
         * @return {object} An ldap client
         * @api private
         */

    }, {
        key: '_success',


        /**
         * Handles authenticate success.
         *
         * @param {object} res Authenticate response
         * @param {function} resolve Used to resolve authenticate's promise
         * @return {void} Result of resolve function
         * @api private
         */
        value: function _success(res, resolve) {
            this.success(res);
            return resolve(res);
        }

        /**
         * Handles authenticate failure.
         *
         * @param {Error} err Error object thrown during authenticate
         * @param {function} reject Used to reject authenticate's promise
         * @return {void} Result of reject function
         * @api private
         */

    }, {
        key: '_fail',
        value: function _fail(err, reject) {
            this.fail(err);
            return reject(err);
        }

        /**
         * Default verify, forwards the search data.
         *
         * @param {object} data Search results
         * @param {function} done Callback
         * @return {object} Result of done function
         * @api private
         */

    }, {
        key: '_defaultVerify',
        value: function _defaultVerify(data, done) {
            return done(null, data);
        }

        /**
         * Defaults some basic option fields.
         *
         * @param {object} options The passed in options
         * @return {object} The options with defaults set (if necessary)
         * @api private
         */

    }, {
        key: '_defaultOptions',
        value: function _defaultOptions(options) {
            options.usernameField = options.usernameField || 'username';
            options.passwordField = options.passwordField || 'password';
            options.uidTag = options.uidTag || 'uid';
            if (options.search) {
                options.search.base = options.search.base || '';
            }
            return options;
        }

        /**
         * Builds a credentials object from an http request body.
         *
         * @param {object} body The request body, containing user's credentials
         * @return {object} A formatted object containing the user's credentials
         * @api private
         */

    }, {
        key: '_getValidatedCredentials',
        value: function _getValidatedCredentials(body) {
            body = body || {};
            var user = {
                'username': body[this._options.usernameField],
                'password': body[this._options.passwordField],
                'originalUsername': body[this._options.usernameField]
            };
            if (!user.username || !user.password) {
                // console.log('Missing username or password parameters.', user);
                throw new _ldapjs2.default.InvalidCredentialsError('Missing username or password parameters.');
            }
            user.username = this._toSearchDn(body.username);

            return user;
        }

        /**
         * Builds the dn based on configured uidTag and base.
         *
         * @param {string} username The user
         * @return {string} The user's dn
         * @api private
         */

    }, {
        key: '_toSearchDn',
        value: function _toSearchDn(username) {
            var base = this._options.base || '';
            if (base.constructor === Array) {
                base = base.join(',');
            }
            return this._options.uidTag + '=' + username + (base ? ',' + base : '');
        }
    }], [{
        key: '_createLdapClient',
        value: function _createLdapClient(serverOptions) {
            return _ldapjs2.default.createClient(serverOptions);
        }
    }]);

    return Strategy;
}(_passportStrategy2.default);

exports.default = Strategy;

