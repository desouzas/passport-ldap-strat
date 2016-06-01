import ldapStrat from '../';
import * as constants from './fixtures/constants';
import mockLdapServer from './fixtures/ldap-server';
import sessionUtil from './fixtures/session-util';
import should from 'should';

let verify = (data, done) => {
    return done(null, data);
};

describe('when imported', () => {

    it('should be a class', (done) => {
        should(ldapStrat).be.type('function');
        return done();
    });

    it('should be constructable', (done) => {
        should(() => {
            let strat = new ldapStrat(sessionUtil.getOptions(), verify);
            should(strat).be.type('object');
            should(strat).ok();
        }).not.throw();
        return done();
    });

});

describe('when constructed', () => {

    it('with no parameters, should throw an error', (done) => {
        should(() => {
            let strat = new ldapStrat();
            should.not.exist(strat);
        }).throw(Error);
        return done();
    });

    it('with null options, should throw an error', (done) => {
        should(() => {
            let strat = new ldapStrat(null);
            should.not.exist(strat);
        }).throw(Error);
        return done();
    });

    it('with no verify, should not throw an error', (done) => {
        should(() => {
            let strat = new ldapStrat(sessionUtil.getOptions());
            should(strat).be.type('object');
            should(strat).ok();
        }).not.throw();
        return done();
    });

    it('should not throw an error', (done) => {
        should(() => {
            let strat = new ldapStrat(sessionUtil.getOptions(), verify);
            should(strat).be.type('object');
            should(strat).ok();
        }).not.throw();
        return done();
    });

    it('should set some properties', (done) => {
        let options = sessionUtil.getOptions();
        should(() => {
            let strat = new ldapStrat(options, verify);
            should(strat).be.type('object');
            should(strat).ok();
            should(strat).have.property('name', 'ldap');
            should(strat).have.property('_options', options);
            should(strat).have.property('_verify', verify);
        }).not.throw();
        return done();
    });

});

describe('when authenticate is called', () => {
    it('with bad server name, throw an error', (done) => {
        let strat = new ldapStrat(
            sessionUtil.getOptions({
                'uidTag': 'uid',
                'server': {
                    'url': 'ldap://nosuchserver:389'
                }
            }),
            verify
        );
        strat.authenticate({'body': {'username': 'testuser', 'password': 'test123'}})
        .then(() => {
            return done(new Error('expected an error'));
        })
        .catch((err) => {
            should(err).have.property('code', 'ENOTFOUND');
            return done();
        });
    });
    it('with unresponsive host, throw an error', (done) => {
        let strat = new ldapStrat(
            sessionUtil.getOptions({
                'uidTag': 'uid',
                // This automatically tries to connect to localhost
                'url': 'ldap://'
            }),
            verify
        );
        strat.authenticate({'body': {'username': 'testuser', 'password': 'test123'}})
        .then(() => {
            return done(new Error('expected an error'));
        })
        .catch((err) => {
            should(err).have.property('code', 'ECONNREFUSED');
            return done();
        });
    });
});

describe('when authenticate is called', () => {

    let mockServer = null;

    // setup mock ldap server to test against
    before((done) => {
        mockServer = new mockLdapServer();
        mockServer.start(constants.MOCK_SERVER_PORT)
            .then(() => {
                return done();
            });
    });

    after(() => {
        if (!mockServer) {
            return;
        }
        mockServer.close();
        mockServer = null;
    });

    let strat = null;

    // setup a new strat to test with
    beforeEach(() => {
        strat = new ldapStrat(
            sessionUtil.getOptions({
                'uidTag': 'uid',
                'url': `${constants.MOCK_SERVER_URL}:${constants.MOCK_SERVER_PORT}`
            }),
            verify
        );
    });

    afterEach(() => {
        strat = null;
    });

    it('with no params, should throw an error', (done) => {
        strat.authenticate()
        .then(() => {
            return done(new Error('expected an error'));
        })
        .catch(() => {
            return done();
        });
    });

    it('with null req, should throw an error', (done) => {
        strat.authenticate(null)
        .then(() => {
            return done(new Error('expected an error'));
        })
        .catch(() => {
            return done();
        });
    });

    it('with req, but no body, should throw an error', (done) => {
        strat.authenticate({})
        .then(() => {
            return done(new Error('expected an error'));
        })
        .catch(() => {
            return done();
        });
    });

    it('should not throw an error', (done) => {
        strat.authenticate({'body': {'username': 'testuser', 'password': 'test123'}})
        .then(() => {
            return done();
        })
        .catch((err) => {
            return done(err);
        });
    });


});
