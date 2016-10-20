var dbPool = require('./common').dbPool;

function findEmployeeByEmail(email, callback) {
    var sql_select_employee_by_email = 'SELECT e.id, e.name, CAST(AES_DECRYPT(UNHEX(e.email), \'wiz\') AS CHAR) email, CAST(AES_DECRYPT(UNHEX(e.phone_number), \'wiz\') AS CHAR) phoneNumber, CAST(AES_DECRYPT(UNHEX(e.password), \'wiz\') AS CHAR) password, d.name departmentName, e.department_position departmentPosition, group_concat(p.name) partName, t.name teamName, t.team_no teamNo, e.team_position teamPosition, e.equipment_name equipmentName ' +
                              'FROM employee e JOIN department d ON(e.department_id = d.id) ' +
                              'LEFT JOIN team t ON(e.team_id = t.id) ' +
                              'LEFT JOIN teams_parts tp ON(t.id = tp.team_id) ' +
                              'LEFT JOIN part p ON(p.id = tp.part_id) ' +
                              'WHERE CAST(AES_DECRYPT(UNHEX(e.email), \'wiz\') AS CHAR) = ?';
    dbPool.getConnection(function(err, dbConn) {
       if (err) {
           return callback(err);
       }
       dbConn.query(sql_select_employee_by_email, [email], function(err, results) {
           dbConn.release();
           if (err) {
               return callback(err);
           }
           if (results.length === 0) {
               return callback(null, null)
           }
           callback(null, results[0]);
       });
    });
}

function verifyPassword(password, hashPassword, callback) {
    var sql_select_hash_password = 'SELECT SHA2(?, 512) password';
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_select_hash_password, [password], function(err, results) {
           if (err) {
               return callback(err);
           }
           if (results[0].password !== hashPassword) {
               return callback(null, false);
           }
           callback(null, true);
        });
    })
}

function findEmployeeById(id, callback) {
    var sql_select_employee_by_id = 'SELECT e.id, e.name, CAST(AES_DECRYPT(UNHEX(e.email), \'wiz\') AS CHAR) email, CAST(AES_DECRYPT(UNHEX(e.phone_number), \'wiz\') AS CHAR) phoneNumber, CAST(AES_DECRYPT(UNHEX(e.password), \'wiz\') AS CHAR) password, d.name departmentName, e.department_position departmentPosition, group_concat(p.name) partName, t.name teamName, t.team_no teamNo, e.team_position teamPosition, e.equipment_name equipmentName ' +
                                    'FROM employee e JOIN department d ON(e.department_id = d.id) ' +
                                    'LEFT JOIN team t ON(e.team_id = t.id) ' +
                                    'LEFT JOIN teams_parts tp ON(t.id = tp.team_id) ' +
                                    'LEFT JOIN part p ON(p.id = tp.part_id) ' +
                                    'WHERE e.id = ?';
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_select_employee_by_id, [id], function(err, results) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            if (results.length === 0) {
                return callback(null, null)
            }
            callback(null, results[0]);
        });
    });
}

module.exports.findEmployeeByEmail = findEmployeeByEmail;
module.exports.verifyPassword = verifyPassword;
module.exports.findEmployeeById = findEmployeeById;