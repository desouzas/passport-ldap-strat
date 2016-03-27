import should from 'should';
import express from 'express';
import ldapStrat from '../';
import mockLdapServer from './fixtures/ldap-server';
import * as constants from './fixtures/constants';
import sessionUtil from './fixtures/session-util';
import passport from 'passport';

describe('when using passport', () => {

    let verify = (data, done) => {
        return done(null, data);
    };
    let mockServer = null;
    let app = express();
    let options = sessionUtil.getOptions({
        'uidTag': 'uid',
        'base': 'ou=people,dc=dev,ou=passport-ldap-strat',
        'url': `${constants.MOCK_SERVER_URL}:${constants.MOCK_SERVER_PORT}`
    });

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

    describe('with invalid credentials', () => {

        it('`badpass` password, should return InvalidCredentialsError', (done) => {
            passport.use(new ldapStrat(options, verify));
            app.use(passport.initialize());
            passport.authenticate('ldap', (err, searchRes, info) => {
                if (err) {
                    return done(err);
                }
                if (searchRes) {
                    return done(new Error('Expected authentication to fail.'));
                }
                should.exist(info);
                should(info).have.property('name', 'InvalidCredentialsError');
                should(info).be.an.instanceof(Error);
                return done();
            })({'body': {'username': 'testuser', 'password': 'badpass'}}, {});
        });

        it('null password, should return InvalidCredentialsError', (done) => {
            passport.use(new ldapStrat(options, verify));
            app.use(passport.initialize());
            passport.authenticate('ldap', (err, searchRes, info) => {
                if (err) {
                    return done(err);
                }
                if (searchRes) {
                    return done(new Error('Expected authentication to fail.'));
                }
                should.exist(info);
                should(info).have.property('name', 'InvalidCredentialsError');
                should(info).be.an.instanceof(Error);
                return done();
            })({'body': {'username': 'testuser', 'password': null}}, {});
        });

        it('bad user, should return InvalidCredentialsError', (done) => {
            passport.use(new ldapStrat(options, verify));
            app.use(passport.initialize());
            passport.authenticate('ldap', (err, searchRes, info) => {
                if (err) {
                    return done(err);
                }
                if (searchRes) {
                    return done(new Error('Expected authentication to fail.'));
                }
                should.exist(info);
                should(info).have.property('name', 'InvalidCredentialsError');
                should(info).be.an.instanceof(Error);
                return done();
            })({'body': {'username': 'notauser', 'password': 'test123'}}, {});
        });

    });

    describe('with valid credentials for', () => {

        it('`testuser`, should return user bind dn', (done) => {
            passport.use(new ldapStrat(options, verify));
            app.use(passport.initialize());
            passport.authenticate('ldap', (err, searchRes, info) => {
                if (err) {
                    return done(err);
                }
                if (info) {
                    return done(info);
                }
                should.exist(searchRes);
                should(searchRes).equal('uid=testuser,ou=people,dc=dev,ou=passport-ldap-strat');
                return done();
            })({'body': {'username': 'testuser', 'password': 'test123'}}, {});
        });

        it('`randomuser` should return user bind dn', (done) => {
            passport.use(new ldapStrat(options, verify));
            app.use(passport.initialize());
            passport.authenticate('ldap', (err, searchRes, info) => {
                if (err) {
                    return done(err);
                }
                if (info) {
                    return done(info);
                }
                should.exist(searchRes);
                should(searchRes).equal('uid=randomuser,ou=people,dc=dev,ou=passport-ldap-strat');
                return done();
            })({'body': {'username': 'randomuser', 'password': 'test123'}}, {});
        });

    });

    describe('with valid credentials and search options', () => {

        let options = sessionUtil.getOptions({
            'uidTag': 'uid',
            'base': 'ou=people,dc=dev,ou=passport-ldap-strat',
            'url': `${constants.MOCK_SERVER_URL}:${constants.MOCK_SERVER_PORT}`,
            'search': {
                'scope': 'sub',
                'base': 'ou=group,dc=dev,ou=passport-ldap-strat',
                'filter': '(memberuid=${username})'
            }
        });

        it('should return user groups', (done) => {
            passport.use(new ldapStrat(options, verify));
            app.use(passport.initialize());
            passport.authenticate('ldap', (err, searchRes, info) => {
                if (err) {
                    return done(err);
                }
                if (info) {
                    return done(info);
                }
                should.exist(searchRes);
                should(searchRes).have.ownProperty('length');
                should(searchRes.length).be.greaterThan(0);
                should(searchRes[0]).have.property('dn', 'cn=sysadmin, ou=group, dc=dev, ou=passport-ldap-strat');
                should(searchRes[0]).have.property('cn', 'sysadmin');
                should(searchRes[1]).have.property('dn', 'cn=developers, ou=group, dc=dev, ou=passport-ldap-strat');
                should(searchRes[1]).have.property('cn', 'developers');
                return done();
            })({'body': {'username': 'testuser', 'password': 'test123'}}, {});
        });

    });

});
