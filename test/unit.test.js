import should from 'should';
import sinon from 'sinon';

import ldapStrat from '../';
import * as constants from './fixtures/constants';
import * as client from './fixtures/mock-ldap-client';
import sessionUtil from './fixtures/session-util';

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

describe('for client methods', () => {
    const strat = new ldapStrat(
        sessionUtil.getOptions({
            'uidTag': 'uid',
            'url': `${constants.MOCK_SERVER_URL}:${constants.MOCK_SERVER_PORT}`
        }),
        verify
    );

    before(() => {
        sinon.stub(ldapStrat, '_createLdapClient').returns(client.mockLdapClient);
    });

    after(() => {
        ldapStrat._createLdapClient.restore();
    });

    beforeEach(() => {
        client.mockLdapClient.bind.reset();
        client.mockLdapClient.search.reset();
        client.mockLdapClient.mockSearchRes.on.reset();
    });

    describe('when authenticate is called', () => {
        it('should reject for bad server name error event', () => {
            client.mockLdapClient.eventError = client.notFoundError;
            let res = strat.authenticate({'body': {'username': 'testuser', 'password': 'test123'}});
            client.mockLdapClient.eventError = null;
            should(res).be.a.Promise();
            should(client.mockLdapClient.bind.calledOnce).be.ok();
            return should(res).be.rejectedWith({ 'code': 'ENOTFOUND' })
        });

        it('should reject for unresponsive host error event', () => {
            client.mockLdapClient.eventError = client.connRefusedError;
            let res = strat.authenticate({'body': {'username': 'testuser', 'password': 'test123'}});
            client.mockLdapClient.eventError = null;
            should(res).be.a.Promise();
            should(client.mockLdapClient.bind.calledOnce).be.ok();
            return should(res).be.rejectedWith({ 'code': 'ECONNREFUSED' });
        });

        it('with no params, should throw an error', () => {
            let res = strat.authenticate();
            should(res).be.a.Promise();
            return should(res).be.rejectedWith({ 'message': 'Missing req parameter.' });
        });

        it('with null req, should throw an error', () => {
            let res = strat.authenticate(null);
            should(res).be.a.Promise();
            return should(res).be.rejectedWith({ 'message': 'Missing req parameter.' });
        });

        it('with req, but no body, should throw an error', () => {
            let res = strat.authenticate({});
            should(res).be.a.Promise();
            return should(res).be.rejectedWith({ 'message': 'Missing username or password parameters.' });
        });

        it('should not throw an error', () => {
            let res = strat.authenticate({'body': {'username': 'testuser', 'password': 'test123'}});
            should(res).be.a.Promise();
            return should(res).be.fulfilled();
        });

        describe('when _bind is called', () => {
            it('should bind and resolve a promise', () => {
                let res = strat._bind(client.mockLdapClient, {'username': 'testuser', 'password': 'test123'});
                should(res).be.a.Promise();
                should(client.mockLdapClient.bind.calledOnce).be.ok();
                return should(res).be.fulfilled();
            });
        });

        describe('when _search is called', () => {
            it('should search and resolve a promise', () => {
                let res = strat._search(client.mockLdapClient, {});
                should(res).be.a.Promise();
                should(client.mockLdapClient.mockSearchRes.on.callCount).be.eql(4);
                return should(res).be.fulfilled();
            });

            it('should reject a promise on search error', () => {
                client.mockLdapClient.searchError = client.ldapSearchError;
                let res = strat._search(client.mockLdapClient, {});
                should(client.mockLdapClient.search.calledOnce).be.ok();
                should(res).be.a.Promise();
                should(client.mockLdapClient.mockSearchRes.on.callCount).be.eql(4);
                client.mockLdapClient.searchError = null;
                return should(res).be.rejectedWith({ code: 'LDAPSEARCHERR' });
            });
        });
    });
});
