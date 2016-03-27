import ldap from 'ldapjs';
import directory from './directory';

/**
 * @class mockLdapServer
 * @description A low quality ldap server mock for testing.
 */
class mockLdapServer {

    /**
     * Constructor.<br>
     * Sets up an ldap server's configs for localhost.
     *
     * @return {void}
     */
    constructor() {
        this.hostname = 'localhost';
        this.suffix = [
            '',
            'ou=passport-ldap-strat',
            'dc=dev,ou=passport-ldap-strat',
            'ou=group,dc=dev,ou=passport-ldap-strat',
            'ou=people,dc=dev,ou=passport-ldap-strat'
        ];
        this.server = null;
    }

    /**
     * Starts ldap server on the specified port.
     *
     * @param {integer} port The port to listen on
     * @return {Promise} A promise that the server has been started or failed
     */
    start(port) {
        return new Promise((resolve) => {
            // console.log(`the port to listen on ${port}`);
            if (this.server) {
                return resolve();
            }

            this.server = ldap.createServer();

            // listen for requests on multiple bases so we don't need to search scopes
            for (let i = 0; i < this.suffix.length; i++) {
                let suffix = this.suffix[i];
                this.server.bind(suffix, this._authorize, this._bind);
                this.server.search(suffix, this._authorize, (req, res, next) => {
                    this._search(suffix, req, res, next);
                });
            }

            // console.log('calling server listen');
            this.server.listen(port, this.hostname, () => {
                return resolve();
            });
            return true;
        });
    }

    /**
     * Shuts the server down.
     *
     * @return {void}
     */
    close() {
        if (this.server) {
            this.server.close(() => {
                this.server = null;
            });
        }
        return;
    }

    /**
     * Authorize it!
     *
     * @param {object} req The request object containing the dn and credentials
     * @param {object} res The result object
     * @param {object} next The next method to call in the chain
     * @return {object} The result of the called next method
     */
    _authorize(req, res, next) {
        return next();
    }

    /**
     * Perfroms a bind for a specified dn.
     *
     * @param {object} req The request object containing the dn and credentials
     * @param {object} res The result object
     * @param {object} next The next method to call in the chain
     * @return {object} The result of the called next method
     */
    _bind(req, res, next) {
        let user = mockLdapServer._getFromDirectory(
            mockLdapServer._extractKeys(req.dn.toString())
        );
        // console.log('binding from server', user);
        if (!user || user.password !== req.credentials) {
            return next(new ldap.InvalidCredentialsError());
        }

        res.end();
        return next();
    }

    /**
     * Performs a directory search for a specified filter, with a specified base.
     *
     * @param {string} base The base of the search (e.g. ou=passport-ldap-strat)
     * @param {object} req The request object containing the filter
     * @param {object} res The result object to send search entries to
     * @param {object} next The next method to call in the chain
     * @return {object} The result of the called next method
     */
    _search(base, req, res, next) {
        // console.log('searching from server', base);
        let filterKey = req.filter.attribute;
        let filterValue = req.filter.value;
        let searchRes = mockLdapServer._getFromDirectory(
            mockLdapServer._extractKeys(base)
        );
        if (searchRes && searchRes.constructor === Array) {
            // if our search results in an array
            for (let i = 0; i < searchRes.length; i++) {
                if (mockLdapServer._satisfiesFilter(filterKey, filterValue, searchRes[i])) {
                    res.send(searchRes[i]);
                }
            }
        } else if (mockLdapServer._satisfiesFilter(filterKey, filterValue, searchRes)) {
            // if our search results in an object
            res.send(searchRes);
        }
        res.end();
        return next();
    }

    /**
     * Determines if a search entry satisfies the specified filter.
     *
     * @param {string} filterKey The property key to filter by
     * @param {string} filterValue The property value to filter
     * @param {object} piece A search entry
     * @return {boolean} True if the filter is satisfied
     */
    static _satisfiesFilter(filterKey, filterValue, piece) {
        return filterKey && filterValue && piece && piece[filterKey]
            // the filter matches directly
            && (piece[filterKey] === filterValue
            // the filter matches one of the values
            || piece[filterKey].constructor === Array && piece[filterKey].indexOf(filterValue) > -1);
    }

    /**
     * Parses a path string into a array path to traverse the directory.
     *
     * @param {string} dn The path string
     * @param {object} init Object to set keys on {optional}
     * @return {array} The path keys
     */
    static _extractKeys(dn, init) {
        let keys = init || [];
        if (!dn || !dn.trim()) {
            return keys;
        }
        let keyAndValueStrings = dn.split(',');
        for (let i = 0; i < keyAndValueStrings.length; i++) {
            let split = keyAndValueStrings[i].split('=');
            keys.push(split[1].trim());
            keys.push(split[0].trim())
        }

        return keys.reverse();
    }

    /**
     * Searches the directory for a specified path.
     *
     * @param {array} searchPieces The search path in the form of an object
     * @return {object} The result of the search
     */
    static _getFromDirectory(searchPieces) {
        let result = directory;
        for (let i = 0; i < searchPieces.length; i++) {
            if (!result) {
                return [];
            }
            if (result.constructor === Array) {
                // on bind we will need to search an array of users
                for (let k = 0; k < result.length; k++) {
                    if (result[k][searchPieces[i]] === searchPieces[i + 1]) {
                        // console.log('found a match', k, result[k]);
                        return result[k];
                    }
                }
                // user not found
                return [];
            }
            result = result[searchPieces[i]];
        }
        return result;
    }
}

export default mockLdapServer;
