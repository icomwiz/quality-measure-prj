var dbPool = require('./common').dbPool;

//INPUT: employeeEmail                                  OUTPUT:
function findEmployeeByEmail(employeeEmail, callback) {
    var sql_select_employee_by_email = 'SELECT e.id, ' + //id
                                              'e.name, ' + //name(이름)
                                              'CAST(AES_DECRYPT(UNHEX(e.email), \'wiz\') AS CHAR) email, ' + //email(이메일)
                                              'CAST(AES_DECRYPT(UNHEX(e.phone_number), \'wiz\') AS CHAR) phoneNumber, ' + //phoneNumber(휴대폰번호)
                                              'CAST(AES_DECRYPT(UNHEX(e.password), \'wiz\') AS CHAR) password, ' + //password(비밀번호)
                                              'd.id departmentId, ' + //departmentId(부서아이디)
                                              'd.name departmentName, ' + //departmentName(부서이름)
                                              'e.department_position departmentPosition, ' + //departmentPosition(부서직책)
                                              'group_concat(p.id) partId, ' + //partId(파트 아이디)
                                              'group_concat(p.name) partName, ' + //partName(파트 이름)
                                              't.id teamId, ' + //teamId(팀아이디)
                                              't.name teamName, ' + //teamName(팀이름)
                                              't.team_no teamNo, ' + //teamNo(팀 조)
                                              'e.team_position teamPosition, ' + //teamPosition(팀 직위(0:사장님, 전무님, 과장님 1: 파트의 조장(PM), 2: 파트의 조원, 3: 팀의 조장, 4: 팀의 조원))
                                              'e.equipment_name equipmentName ' + //equipmentName(개인장비)
                                       'FROM employee e JOIN department d ON(e.department_id = d.id) ' +
                                                       'LEFT JOIN team t ON(e.team_id = t.id) ' +
                                                       'LEFT JOIN teams_parts tp ON(t.id = tp.team_id) ' +
                                                       'LEFT JOIN part p ON(p.id = tp.part_id) ' +
                                       'WHERE CAST(AES_DECRYPT(UNHEX(e.email), \'wiz\') AS CHAR) = ?';
    dbPool.getConnection(function(err, dbConn) {
       if (err) {
           return callback(err);
       }
       dbConn.query(sql_select_employee_by_email, [employeeEmail], function(err, results) {
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

//INPUT: employeeId                              OUTPUT:
function findEmployeeById(employeeId, callback) {
    var sql_select_employee_by_id = 'SELECT e.id, ' + //id
                                           'e.name, ' + //name(이름)
                                           'CAST(AES_DECRYPT(UNHEX(e.email), \'wiz\') AS CHAR) email, ' + //email(이메일)
                                           'CAST(AES_DECRYPT(UNHEX(e.phone_number), \'wiz\') AS CHAR) phoneNumber, ' + //phoneNumber(휴대폰번호)
                                           'd.id departmentId, ' + //departmentId(부서아이디)
                                           'd.name departmentName, ' + //departmentName(부서이름)
                                           'e.department_position departmentPosition, ' + //departmentPosition(부서직책)
                                           'group_concat(p.id) partId, ' + //partId(파트 아이디)
                                           'group_concat(p.name) partName, ' + //partName(파트 이름)
                                           't.id teamId, ' + //teamId(팀아이디)
                                           't.name teamName, ' + //teamName(팀이름)
                                           't.team_no teamNo, ' + //teamNo(팀 조)
                                           'e.team_position teamPosition, ' + //teamPosition(팀 직위(0:사장님, 전무님, 과장님 1: 파트의 조장(PM), 2: 파트의 조원, 3: 팀의 조장, 4: 팀의 조원))
                                           'e.equipment_name equipmentName ' + //equipmentName(개인장비)
                                    'FROM employee e JOIN department d ON(e.department_id = d.id) ' +
                                                    'LEFT JOIN team t ON(e.team_id = t.id) ' +
                                                    'LEFT JOIN teams_parts tp ON(t.id = tp.team_id) ' +
                                                    'LEFT JOIN part p ON(p.id = tp.part_id) ' +
                                    'WHERE e.id = ?';
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_select_employee_by_id, [employeeId], function(err, results) {
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