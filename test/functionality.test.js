import ldapStrat from '../';
import * as constants from './fixtures/constants';
import mockLdapServer from './fixtures/ldap-server';
import sessionUtil from './fixtures/session-util';
import should from 'should';

describe('when constructed with', () => {

    let mockServer = null;
    const verify = (data, done) => {
        return done(null, data);
    };

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


    it('no search, authenticate should sucessfully auth and return the dn', () => {
        const strat = new ldapStrat(
            sessionUtil.getOptions({
                'uidTag': 'uid',
                'base': 'ou=people,dc=dev,ou=passport-ldap-strat',
                'url': `${constants.MOCK_SERVER_URL}:${constants.MOCK_SERVER_PORT}`
            }),
            verify
        );
        const res = strat.authenticate({'body': {'username': 'testuser', 'password': 'test123'}});
        return should(res).be.fulfilledWith('uid=testuser,ou=people,dc=dev,ou=passport-ldap-strat');
    });

    it('search, authenticate should sucessfully auth and return the user info', (done) => {
        const strat = new ldapStrat(
            sessionUtil.getOptions({
                'uidTag': 'uid',
                'base': 'ou=people,dc=dev,ou=passport-ldap-strat',
                'url': `${constants.MOCK_SERVER_URL}:${constants.MOCK_SERVER_PORT}`,
                'search': {
                    'filter': '(uid=${username})',
                    'base': 'ou=people,dc=dev,ou=passport-ldap-strat'
                }
            }),
            verify
        );
        strat.authenticate({'body': {'username': 'testuser', 'password': 'test123'}})
        .then((res) => {
            should.exist(res);
            should(res).have.ownProperty('length');
            should(res.length).be.greaterThan(0, 'Expected search result to be the user.');
            should(res[0]).have.property('dn', 'uid=testuser, ou=people, dc=dev, ou=passport-ldap-strat');
            should(res[0]).have.property('name', 'testuser');
            return done();
        })
        .catch((err) => {
            return done(err);
        });
    });

    it('search, authenticate should sucessfully auth and return the user groups', (done) => {
        const strat = new ldapStrat(
            sessionUtil.getOptions({
                'uidTag': 'uid',
                'base': 'ou=people,dc=dev,ou=passport-ldap-strat',
                'url': `${constants.MOCK_SERVER_URL}:${constants.MOCK_SERVER_PORT}`,
                'search': {
                    'scope': 'sub',
                    'filter': '(memberuid=${username})',
                    'base': 'ou=group,dc=dev,ou=passport-ldap-strat'
                }
            }),
            verify
        );
        strat.authenticate({'body': {'username': 'testuser', 'password': 'test123'}})
        .then((res) => {
            should.exist(res);
            should(res).have.ownProperty('length');
            should(res.length).be.greaterThan(0, 'Expected groups to be in search results.');
            should(res[0]).have.property('dn', 'cn=sysadmin, ou=group, dc=dev, ou=passport-ldap-strat');
            should(res[0]).have.property('cn', 'sysadmin');
            should(res[1]).have.property('dn', 'cn=developers, ou=group, dc=dev, ou=passport-ldap-strat');
            should(res[1]).have.property('cn', 'developers');
            return done();
        })
        .catch((err) => {
            return done(err);
        });
    });

});
