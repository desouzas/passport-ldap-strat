const testUser = {
    'dn': 'uid=testuser,ou=people,dc=dev,ou=passport-ldap-strat',
    'password': 'test123',
    'uid': 'testuser',
    'attributes': {
        'uid': 'testuser',
        'name': 'testuser'
    }
};

const randomUser = {
    'dn': 'uid=randomuser,ou=people,dc=dev,ou=passport-ldap-strat',
    'password': 'test123',
    'uid': 'randomuser',
    'attributes': {
        'uid': 'randomuser',
        'name': 'some guy'
    }
};

const directory = {
    'ou': {
        'passport-ldap-strat': {
            'dc': {
                'dev': {
                    'ou': {
                        'people': [
                            testUser,
                            randomUser
                        ],
                        'group': [
                            {
                                'dn': 'cn=sysadmin,ou=group,dc=dev,ou=passport-ldap-strat',
                                'cn': 'sysadmin',
                                'memberuid': ['testuser', 'randomUser'],
                                'attributes': {
                                    'cn': 'sysadmin'
                                }
                            },
                            {
                                'dn': 'cn=developers,ou=group,dc=dev,ou=passport-ldap-strat',
                                'cn': 'developers',
                                'memberuid': ['testuser'],
                                'attributes': {
                                    'cn': 'developers'
                                }
                            }
                        ]
                    }
                }
            }
        }
    },
    // top level uid subtree for undefined `base` tests
    'uid': {
        'testuser': testUser
    }
};

export default directory;
