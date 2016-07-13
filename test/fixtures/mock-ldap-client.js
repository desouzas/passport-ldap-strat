import sinon from 'sinon';

const eventErrorCallbacks = {};
const eventSearchCallbacks = {};
const mockLdapClient = {
    'eventError': null,
    'searchError': null,
    'on': sinon.spy((event, callback) => {
        eventErrorCallbacks[event] = callback;
    }),
    'bind': sinon.spy((user, pass, callback) => {
        if (mockLdapClient.eventError) {
            return eventErrorCallbacks.error(mockLdapClient.eventError);
        }
        return callback();
    }),
    'mockSearchRes': {
        'on': sinon.spy((event, callback) => {
            eventSearchCallbacks[event] = callback;
            // trigger the events once we've received
            // a listener for 'end'
            if (event === 'end') {
                return mockLdapClient.searchStart();
            }
        })
    },
    'searchStart': sinon.spy(() => {
        if (mockLdapClient.searchError) {
            return eventSearchCallbacks.error(mockLdapClient.searchError);
        }
        return eventSearchCallbacks.end({
            'status': 0
        });
    }),
    'search': sinon.spy((base, filter, callback) => {
        callback(null, mockLdapClient.mockSearchRes);
    })
};
const notFoundError = new Error();
notFoundError.code = 'ENOTFOUND';

const connRefusedError = new Error();
connRefusedError.code = 'ECONNREFUSED';

const ldapSearchError = new Error();
ldapSearchError.code = 'LDAPSEARCHERR';

export {connRefusedError, mockLdapClient, notFoundError, ldapSearchError};
