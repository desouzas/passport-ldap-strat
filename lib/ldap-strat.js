import ParentStrategy from 'passport-strategy';
import ldap from 'ldapjs';

/**
 * @class Strategy
 * @description LDAP implementation of passport-strategy.
 */
class Strategy extends ParentStrategy {

    /**
     * Constructor for Strategy.<br>
     * Various options can be specified to modify the authentication
     * and post-auth search behavior.
     *
     * @param {object} options The configuration options
     * @param {function} verify The search verify method {optional}
     * @api public
     */
    constructor(options, verify) {
        super();
        if (typeof options !== 'object' || !options
            || verify && typeof verify !== 'function') {
            throw new Error('Invalid parameters for Strategy constructor.');
        }
        // assign a name for passport
        this.name = 'ldap';
        // set some defaults
        this._options = this._defaultOptions(options);
        this._verify = verify || this._defaultVerify;
        // ensure these methods are set for standalone use
        this.success = this.success || (() => {});
        this.fail = this.fail || (() => {});
    }

    /**
     * Performs authentication against the configured LDAP server.
     *
     * @param {object} req The http request containing a `body` with request credentials
     * @return {Promise} A promise resolving to the configured search results or the user dn
     * @api public
     */
    authenticate(req) {
        return new Promise((resolve, reject) => {
            if (!req) {
                let err = new Error('Missing req parameter.');
                this.fail(err);
                return reject(err);
            }
            return resolve(this._bind(
                ldap.createClient(this._options.server),
                this._getValidatedCredentials(req.body)
            ));
        });
    }

    /**
     * Performs an ldap bind using the specified credentials.
     *
     * @param {object} client The ldap client to bind with
     * @param {object} credentials The credentials to use when binding
     * @return {Promise} A promise containing the dn or search results
     * @api private
     */
    _bind(client, credentials) {
        return new Promise((resolve, reject) => {
            client.bind(credentials.username, credentials.password, (err) => {
                if (err) {
                    // console.log('bind error', err);
                    this.fail(err);
                    return reject(err);
                }
                if (!this._options.search || !this._options.search.filter) {
                    // success, end early if no search is needed
                    this.success(credentials.username);
                    return resolve(credentials.username);
                }
                // copy so we can replace template pieces
                let search = Object.assign({}, this._options.search);
                // replace any placeholders with the original username
                search.filter = search.filter.replace(/\$\{.*\}/, credentials.originalUsername);
                // console.log('finished bind - now search', search);

                return resolve(this._search(client, search));

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
    _search(client, search) {
        return new Promise((resolve, reject) => {
            client.search(search.base, search, (err, res) => {
                if (err) {
                    this.fail(err);
                    return reject(err);
                }
                let results = [];
                res.on('searchEntry', (entry) => {
                    // TODO: emit event
                    results.push(entry.object);
                });
                res.on('searchReference', (reference) => {
                    // TODO: emit event
                    results.push(reference.uris);
                });
                res.on('error', (err) => {
                    // TODO: emit event
                    this.fail(err);
                    return reject(err);
                });
                res.on('end', (result) => {
                    // TODO: emit event
                    if (result.status !== 0) {
                        this.fail(result);
                        return reject(new Error(result));
                    }
                    this._verify(results, (err, searchResults) => {
                        if (err) {
                            this.fail(err);
                            return reject(err);
                        }
                        this.success(searchResults);
                        return resolve(searchResults);
                    });
                });
            });
        });
    }

    /**
     * Default verify, forwards the search data.
     *
     * @param {object} data Search results
     * @param {function} done Callback
     * @return {object} Result of done function
     * @api private
     */
    _defaultVerify(data, done) {
        return done(null, data);
    }

    /**
     * Defaults some basic option fields.
     *
     * @param {object} options The passed in options
     * @return {object} The options with defaults set (if necessary)
     * @api private
     */
    _defaultOptions(options) {
        options.usernameField = options.usernameField || 'username';
        options.passwordField = options.passwordField || 'password';
        options.uidTag = options.uidTag || 'uid';
        if (options.search) {
            options.search.base = options.search.base || '';
        }
        return options;
    }

    /**
     * Builds the dn based on configured uidTag and base.
     *
     * @param {string} username The user
     * @return {string} The user's dn
     * @api private
     */
    _toSearchDn(username) {
        let base = this._options.base || '';
        if (base.constructor === Array) {
            base = base.join(',');
        }
        return `${this._options.uidTag}=${username}` + (base ? `,${base}` : '');
    }

    /**
     * Builds a credentials object from an http request body.
     *
     * @param {object} body The request body, containing user's credentials
     * @return {object} A formatted object containing the user's credentials
     * @api private
     */
    _getValidatedCredentials(body) {
        body = body || {};
        let user = {
            'username': body[this._options.usernameField],
            'password': body[this._options.passwordField],
            'originalUsername': body[this._options.usernameField]
        };
        if (!user.username || !user.password) {
            let err = new ldap.InvalidCredentialsError(
                'Missing username or password parameters.'
            );
            this.fail(err);
            throw err;
        }
        user.username = this._toSearchDn(body.username);

        return user;
    }

}

export default Strategy;