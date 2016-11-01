var dbPool = require('./common').dbPool;
var async = require('async');

function reportList(callback) {
    var sql_select_report = "SELECT DISTINCT r.id, DATE_FORMAT(CONVERT_TZ(r.date, '+00:00', '+09:00'), '%Y-%m-%d') date, "+
        "r.location location, rd.location location_detail, t.name teamName "+
        "FROM report r LEFT JOIN report_details rd ON (r.id = rd.report_id) "+
        "JOIN employee e ON (r.employee_id = e.id) "+
        "LEFT JOIN team t ON (t.id = e.team_id) WHERE r.type = 1 ORDER BY r.id DESC";
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_select_report, function(err, result) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            if(!result[0]) {
                result.push({id : null});
            }
            callback(null, result);
        });
    });
}
function updateReportSelect(info, callback) {
    var squ_select_Report = "SELECT r.id, r.team_name, r.car_manager, r.team_member, r.equipment_name, " +
                            "date_format(convert_tz(r.date, '+00:00', '+09:00'), '%Y-%m-%d') `date`, r.location, "+
                            "r.car_number, r.car_type, r.car_mileage_before, r.car_refuel_state, "+
                            "rd.id AS details_id, rd.work_details, rd.start_time, rd.end_time, "+
                            "rd.obstacle_classification, rd.obstacle_details, rd.obstacle_phenomenon, rd.obstacle_result, "+
                            "rd.obstacle_start_time, rd.obstacle_end_time, rd.type AS err_type "+
                            "FROM report r "+
                            "JOIN report_details rd ON (r.id = rd.report_id) "+
                            "WHERE r.id = ? AND r.employee_id = ? AND r.type = 1 AND "+
                            "(rd.work_details = 101 OR rd.work_details = 100)";
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
       dbConn.query(squ_select_Report, [info.Reportid, info.user_id], function(err, result) {
           var report = {};
           dbConn.release();
           if (err) {
               return callback(err);
           }
           report.id = result[0].id;
           report.team_name = result[0].team_name;
           report.car_manager = result[0].car_manager;
           report.team_member = result[0].team_member;
           report.equipment_name = result[0].equipment_name;
           report.date = result[0].date;
           report.location = result[0].location;
           report.car_number = result[0].car_number;
           report.car_type = result[0].car_type;
           report.car_mileage_before = result[0].car_mileage_before;
           report.car_refuel_state = result[0].car_refuel_state;
           report.move = {};
           report.setup = {};
           async.each(result, function(item, callback) {
               if (item.work_details === 100) {
                   report.move.start_time = item.start_time;
                   report.move.end_time = item.end_time;
               } else if (item.work_details === 101) {
                   report.setup.start_time = item.start_time;
                   report.setup.end_time = item.end_time;
                   report.setup.obstacle_classification = item.obstacle_classification;
                   report.setup.obstacle_details = item.obstacle_details;
                   report.setup.obstacle_phenomenon = item.obstacle_phenomenon;
                   report.setup.obstacle_result = item.obstacle_result;
                   report.setup.obstacle_start_time = item.obstacle_start_time;
                   report.setup.obstacle_end_time = item.obstacle_end_time;
                   report.setup.err_type = item.err_type;
               }

           });
           callback(null, report);
       })
    });
}

function addReport(user_id, callback) {
    var group = {};
    group.member = "";
    /*
    조장->조원->조원 의순서
    (조원, 조장, 측정장비)
     */
    var sql_employee ="SELECT name FROM employee "+
                      "WHERE team_id = (SELECT team_id FROM employee WHERE id = ?) AND team_position = 3 ";
    var sql_employee_member = "SELECT name FROM employee "+
                               "WHERE team_id = (SELECT team_id FROM employee WHERE id = ?) AND team_position = 4";
    var sql_my_equipment =  "SELECT name, equipment_name FROM employee WHERE id = ?";

    /*
    측정장소, 차량번호, 차량종류
    */
    var sql_report = "SELECT id, location, car_number, car_type, type  "+
                     "FROM report WHERE team_id = (SELECT team_id FROM employee WHERE id = ?) AND type = 0 "+
                     "ORDER BY date DESC";
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        async.series([employee, member, report, equipment], function(err, results) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            callback(err, group.leader, group.member, group.equipment, results);
        });
        function employee(callback) {
            dbConn.query(sql_employee, [user_id], function(err, result) {
                if (err) {
                   return callback(err);
                }
                group.leader = result[0].name;
                callback(null, null);
            });
        }
        function member(callback) {
            dbConn.query(sql_employee_member, [user_id], function(err, result) {
                if (err) {
                    return callback(err);
                }
                async.each(result, function(item, cb) {
                    group.member += item.name + ", ";
                }, function(err) {
                    if (err) {
                        return callback(err);
                    }
                });
                group.member = group.member.slice(0,-2);
                callback(null, null);
            });
        }
        function report(callback) {
            dbConn.query(sql_report, [user_id], function(err, result) {
                if (err) {
                    return callback(err);
                }
                callback(null, result);
            });
        }
        function equipment(callback) {
            dbConn.query(sql_my_equipment, [user_id], function(err, result) {
                if (err) {
                    return callback(err);
                }
                group.equipment = result[0];
                callback(null, result);
            });
        }
    });
}

function deleteReport(reportId, callback) {
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.beginTransaction(function(err) {
            if (err) {
                return callback(err);
            }
            async.series([details, report], function(err, results) {
                if (err) {
                    return dbConn.rollback(function() {
                        dbConn.release();
                        callback(err);
                    });
                }
                return dbConn.commit(function() {
                    dbConn.release();
                    callback(err);
                });
            });
            function details(callback) {
                var sql_delete_details = "DELETE FROM report_details WHERE report_id = ?";
                dbConn.query(sql_delete_details, reportId, function(err, result) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, result);
                });
            }
            function report(callback) {
                var sql_delete_report = "DELETE FROM report WHERE id = ?";
                dbConn.query(sql_delete_report, reportId, function(err, result) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, result);
                });
            }
        });
    });
}

function newReport(info, callback) {
    var me = {};
    var sql_select_me = "SELECT e.team_id, e.team_position, t.name, t.team_no FROM employee e "+
    "JOIN team t ON (e.team_id = t.id) "+
    "WHERE e.id = ?";
    var sql_insert_report="INSERT INTO report(employee_id, team_id, team_name, team_position, " +
        "team_member, equipment_name, date, location, car_number, " +
        "car_type, car_mileage_before, car_refuel_state, car_manager, `type`) "+
        "VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    var sql_insert_details = "INSERT "+
    "INTO report_details(report_id, work_details, start_time, end_time) " +
    "VALUES (?, ?, ?, ?)";

    var sql_insert_details_err = "INSERT "+
        "INTO report_details(report_id, work_details, start_time, end_time, type, obstacle_start_time, obstacle_end_time, " +
        "obstacle_classification, obstacle_details, obstacle_phenomenon, obstacle_result) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ? ,?)";

    dbPool.getConnection(function(err, dbConn) {
        if(err) {
            return callback(err);
        }

        async.series([selectMe, insertReport, insertDetails], function(err, results) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            callback(null, "Success");
        });

        function selectMe(callback) {
            dbConn.query(sql_select_me, [info.user_id], function(err, result) {
                if (err) {
                    return callback(err);
                }
//                console.log(typeof(result[0].team_position));
//                console.log(result[0].team_position);
                if (result[0].team_position == 3 ) {
                    me.team_position = '조장';
                } else if (result[0].team_position == 4) {
                    me.team_position = '조원';
                }

                me.team_id = result[0].team_id;
                me.team_name = result[0].name + ' ' + result[0].team_no + '조';
                callback(null, null);
            });
        }

        function insertReport(callback) {
            dbConn.query(sql_insert_report ,[info.user_id, me.team_id, me.team_name, me.team_position, info.group_member, info.measure_machine, info.date, info.measure_place,
                info.car_number, info.car_kind, info.KM, info.car_refuel_state, info.group_leader, 1],function(err, result) {
                if(err) {
                    return callback(err);
                }
                me.insertId = result.insertId;
                callback(null, null);
            });
        }


        function insertDetails(callback) {
            dbConn.query(sql_insert_details, [me.insertId, 100, info.moveTime.startTime, info.moveTime.endTime], function(err, result) {
                if (err) {
                    return callback(err);
                }
                if (info.errCheck == 0) {
                    dbConn.query(sql_insert_details_err ,[me.insertId, 101, info.arrivalSETPUP.startTime, info.arrivalSETPUP.endTime,
                        info.errCheck, info.errorList.startTime, info.errorList.endTime, info.errorList.obstacle_classification,
                        info.errorList.obstacle_details, info.errorList.errInfo, info.errorList.errSolution],function(err, result) {
                        if(err) {
                            return callback(err);
                        }
                        callback(null, null);
                    });
                } else {
                    dbConn.query(sql_insert_details, [me.insertId, 101, info.arrivalSETPUP.startTime, info.arrivalSETPUP.endTime], function(err, result) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null, null);
                    });
                }
            });
        }
    });
}

// INPUT: teamName, OUTPUT: teamName, date, location
function getReportsByteamId(teamId, callback) {
    var sql_select_reports_order_by_date =
        "SELECT t.name teamName, t.team_no teamNo, DATE_FORMAT(CONVERT_TZ(r.date, '+00:00', '+09:00'), '%Y-%m-%d') date, r.location " +
        "FROM team t JOIN report r ON(t.id = r.team_id) " +
        "WHERE t.id = ? " +
        "GROUP BY r.date " +
        "ORDER BY r.date DESC";

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_select_reports_order_by_date, [teamId], function(err, results) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            callback(null, results);
        });
    })
}

//리포트 업데이트 하기
function updatePlan(plan, callback) {
    var aesPassword = process.env.AES_PASSWORD; //AES패스워드

    //부서 이름을 통해 부서가 존재하는지 찾음.
    var sql_find_department_by_name = 'SELECT id departmentId ' +
                                      'FROM department ' +
                                      'WHERE name = ?';

    //부서가 없다면 insert 하기
    var sql_insert_department = 'INSERT INTO department(name) ' +
                                'VALUES(?)';

    //파트이름을 통해 파트가 존재하는지 찾기
    var sql_find_part_by_name = 'SELECT id partId ' +
        'FROM part ' +
        'WHERE name = ?';

    //파트가 없다면 insert하기
    var sql_insert_part = 'INSERT INTO part(name) ' +
                          'VALUES(?)';

    //팀이름과 조이름을 통해 팀이 존재하는지 찾기. OUTPUT: teamId
    var sql_find_team_by_team_name_and_team_no = 'SELECT id teamId ' +
        'FROM team ' +
        'WHERE name = ? AND team_no = ?';

    //팀이 없다면 insert하기
    var sql_insert_team = 'INSERT INTO team(name, team_no) ' +
                          'VALUES(?, ?)';

    //팀과 파트가 엮여 있는지 확인
    var sql_select_teams_part = 'SELECT * FROM teams_parts ' +
                                'WHERE team_id = ? AND part_id = ?';

    //팀과 파트 엮기
    var sql_insert_teams_part = 'INSERT INTO teams_parts(team_id, part_id) ' +
                                'VALUES(?, ?)';

    //email을 통해 employee가 존재하는지 찾음. OUTPUT: ID
    var sql_find_employee_by_email = 'SELECT id ' +
                                     'FROM employee ' +
                                     'WHERE CAST(AES_DECRYPT(UNHEX(email), \'wiz\') AS CHAR) = ?';

    //employee 가 없다면 insert하기
    var sql_insert_employee =
        'INSERT INTO employee(name, email, phone_number, password, team_id, team_position, department_id, department_position, equipment_name) ' +
        'VALUES(?, ' +  //이름
        'HEX(AES_ENCRYPT(?, ' + aesPassword + ')), ' + //이메일
        'HEX(AES_ENCRYPT(?, ' + aesPassword+ ')), ' + //휴대폰번호
        'HEX(AES_ENCRYPT(SHA2(\'1111\', 512), ' + aesPassword + ')), ' + //패스워드
        '?, ' + //팀아이디
        '?, ' + //팀 포지션
        '?, ' + //부서아이디
        '?, ' + //직책
        '?)'; //장비

    //employee가 있다면 update하기
    var sql_update_employee = 'UPDATE employee ' +
                              'SET name = ?, ' + //이름
                                  'email = HEX(AES_ENCRYPT(?, ' + aesPassword + ')), ' + //이메일
                                  'phone_number = HEX(AES_ENCRYPT(?, ' + aesPassword + ')), ' + //휴대폰번호
                                  'team_id = ?, ' + //팀아이디
                                  'team_position = ?, ' + //팀 포지션
                                  'department_id = ?, ' + //부서아이디
                                  'department_position = ?, ' + //직책
                                  'equipment_name = ? ' + //장비이름
                              'WHERE id = ?';

    //report가 있는지 확인하기
    var sql_select_report = 'SELECT id ' +
                            'FROM report ' +
                            'WHERE employee_id = ? AND team_id = ? AND date = STR_TO_DATE(?, \'%Y-%m-%d\')';

    //report가 있다면 update하기
    var sql_update_report =
        'UPDATE report ' +
        'SET team_name = ?, team_position = ?, team_member = (SELECT GROUP_CONCAT(name) teamMember ' +
                                                             'FROM employee ' +
                                                             'WHERE team_id = ?), equipment_name = ?, location = ?, calls = ?, car_number = ?, car_type = ?, car_manager = (SELECT name ' +
                                                                                                                                                                           'FROM employee ' +
                                                                                                                                                                           'WHERE team_id = ? AND team_position = ?), type = 0 ' +
        'WHERE employee_id = ? AND team_id = ? AND date = STR_TO_DATE(?, \'%Y-%m-%d\')';

    //report 가 없다면 insert하기
    var sql_insert_report =
        'INSERT INTO report(employee_id, team_id, team_name, team_position, team_member, equipment_name, date, location, calls, car_number, car_type, car_manager, type) ' +
        'VALUES(?, ?, ?, ?, (SELECT GROUP_CONCAT(name) teamMember ' +
                            'FROM employee ' +
                            'WHERE team_id = ?), ?, STR_TO_DATE(?, \'%Y-%m-%d\'), ?, ?, ?, ?, (SELECT name ' +
                                                                                              'FROM employee ' +
                                                                                              'WHERE team_id = ? AND team_position = 3), 0)';

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }

        //part가 있는지 없는지 검사하고 있으면 냅두고 없으면 insert하는 함수
        function setPart(callback) {
            async.each(plan.partName, function(item, callback) {
                findPartByName(item, function(err, partId) {
                    if (err) {
                        callback(err);
                    }
                    if (!partId) {
                        insertPart(item, function(err, partId) {
                           if (err) {
                               return callback(err);
                           }
                           callback(partId);
                        });
                    } else {
                        callback(partId);
                    }
                });
            }, function(err) {
               if (err) {
                    callback(err);
               } else {
                    callback(null);
               }
            });
        }

        //team이 있는지 없는지 검사하고 있으면 냅두고 없으면 insert하는 함수
        function setTeam(callback) {
            findteamByNameAndNo(function (err, results) {
                if (err) {
                    return callback(err);
                }
                if (!results) {
                    insertTeam(function(err, results) {
                        if (err) {
                            return callback(err);
                        }
                        callback(results);
                    });
                } else {
                    callback(results);
                }
            })
        }

        //부서가 존재하는지 찾기
        function findDepartmentByName(departmentName,callback) {
            dbConn.query(sql_find_department_by_name, [departmentName], function(err, results) {
                if (err) {
                    return callback(err);
                }
                if (!results) {
                    return callback(null, false);
                }
                callback(null, results[0]); //리턴 departmentId
            });
        }

        //employee가 존재하는지 찾기.
        function findEmployeeByEmail(callback) {
            dbConn.query(sql_find_employee_by_email, [plan.email], function(err, results) {
                if (err) {
                    return callback(err);
                }
                callback(null, results[0]);
            });
        }

        //part가 존재하는지 찾기.
        function findPartByName(partName, callback) {
            dbConn.query(sql_find_part_by_name, [partName], function(err, results) {
                if (err) {
                    return callback(err);
                }
                callback(null, results[0]);
            });
        }

        //part insert하기
        function insertPart(partName, callback) {
            dbConn.query(sql_insert_part, [partName], function(err, results) {
                if (err) {
                    return callback(err);
                }
                var partId = results.insertId;
                callback(null, partId);
            })
        }

        //team이 존재하는지 찾기.
        function findteamByNameAndNo(callback) {
            dbConn.query(sql_find_team_by_team_name_and_team_no, [plan.teamName, plan.teamNo], function(err, results) {
                if (err) {
                    return callback(err);
                }
                callback(null, results[0]);
            });
        }

        //team이 존재하지 않으면 insert하기
        function insertTeam(callback) {
            dbConn.query(sql_insert_team, [plan.teamName], function(err, results) {
                if (err) {
                    return callback(err);
                }
                var teamId = results.insertId;
                callback(null, teamId);
            });
        }
    });

}

module.exports.reportList = reportList;
module.exports.addReport = addReport;
module.exports.newReport = newReport;
module.exports.deleteReport = deleteReport;
module.exports.getReportsByteamId = getReportsByteamId;
module.exports.updatePlan = updatePlan;
module.exports.updateReportSelect = updateReportSelect;