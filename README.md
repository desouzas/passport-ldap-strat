# `passport-ldap-strat`

This is a passport-strategy for LDAP authentication.

> Note: This project is still in development.

## Examples

> Using with passport

```javascript
import passport from 'passport';
import Strategy from 'passport-ldap-strat';
import express from 'express';
import bodyParser from 'body-parser';

let app = express();
// use body-parser to inflate json and x-www-form requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Build the strategy for localhost, with some basic search options to find
// groups that the user belongs to - after authenticating.
let strat = new Strategy({
	'server': {
		'url': 'ldap://localhost:8000'
	},
	'base': 'ou=people,dc=dev,ou=passport-ldap-strat',
	'uidTag': 'uid',
	'search': {
		'scope': 'sub',
		'base': 'ou=group,dc=dev,ou=passport-ldap-strat',
		'filter': '(memberuid=${uid})'
	},
	'usernameField': 'username',
	'passwordField': 'password'
}, (data, next) => {
	return next(null, data);
});

// use our strategy
passport.use(strat);

// init passport
app.use(passport.initialize());

// create an endpoint for POST /login
app.post('/login', (req, res) => {
	// try authenticate
	passport.authenticate('ldap', (err, searchRes, info) => {
		if (err) {
			// handle error
		}
		if (info) {
			// handle thrown error
		}
		// success
		// searchRes contains an array with the user's groups
	})(req, res);
});

```

## Options

key | type | description
--- | ---- | ----------
base | string | The suffix to use when binding.
socketPath | integer | The ldap server port.
server | object | Contains the property `url` - the ldap server url.
search | object | Contains the property `filter` - the search filter. The filter can contain a `${varName}` variable and it will be replaced by the login username. `scope` and `base` may also be specified. See `ldapjs` docs for details.
passwordField | string | The request field to retrieve the password value from.
uidTag | string | The tag to use when binding the user (e.g. `uid` or `cn`).
usernameField | string | The request field to retrieve the username value from.

## Running Tests
```sh
npm install
npm test
```
