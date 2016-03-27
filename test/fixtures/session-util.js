import * as constants from './constants';

class sessionUtil {

	static getOptions(additional) {
		let options = additional || {};
		options.usernameField = typeof options.usernameField !== 'undefined'
			? options.usernameField
			: 'username';
		options.passwordField = typeof options.passwordField !== 'undefined'
			? options.passwordField
			: 'password';
		options.server = typeof options.server !== 'undefined'
			? options.server
			: {'url': `${constants.MOCK_SERVER_URL}:${constants.MOCK_SERVER_PORT}`};
		options.socketPath = typeof options.socketPath !== 'undefined'
			? options.socketPath
			: constants.MOCK_SERVER_PORT;
		return options;
	}

}

export default sessionUtil;
