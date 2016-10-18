var dbPool = require('./common').dbPool;

function login(user, callback) {
    var sql_login = "SELECT id "+
    "FROM employee "+
    "WHERE email = HEX(AES_ENCRYPT(?, 'wiz')) "+
    "AND password = HEX(AES_ENCRYPT(SHA2(?, 512), 'wiz'))";
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_login, [user.email, user.pw], function(err, result) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            if(result[0]) {
                return callback(null, true)
            }
            callback(null, false);
        });
    });
}

module.exports.login = login;