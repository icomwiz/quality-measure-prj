var dbPool = require('./common').dbPool;
var async = require('async');

function reportList(user_id, callback) {
    /*var sql_select_report = "SELECT DISTINCT r.id, DATE_FORMAT(CONVERT_TZ(r.date, '+00:00', '+09:00'), '%Y-%m-%d') date, "+
        "r.location location, rd.location location_detail, t.name teamName "+
        "FROM report r LEFT JOIN report_details rd ON (r.id = rd.report_id) "+
        "JOIN employee e ON (r.employee_id = e.id) "+
        "LEFT JOIN team t ON (t.id = e.team_id) " +
        "WHERE r.type = 1 AND r.employee_id = ? ORDER BY r.id DESC";
        */
    var sql_select_report = "SELECT r.id, DATE_FORMAT(CONVERT_TZ(r.date, '+00:00', '+09:00'), '%Y-%m-%d') date, "+
    "r.location location, t.name teamName, t.team_no "+
    "FROM report r " +
    "JOIN team t ON (t.id = r.team_id)" +
    "WHERE type = 1 AND employee_id = ?";
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_select_report, [user_id], function(err, result) {
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

function updateReport(info, callback) {
    dbPool.getConnection(function(err, dbConn) {
        if(err) {
            return callback(err);
        }
        async.series([Report, Details_move, Details_setup], function(err, results) {
            if (err) {
                return dbConn.rollback(function() {
                    dbConn.release();
                    callback(err);
                });
            }
            return dbConn.commit(function() {
                dbConn.release();
                callback(null, "Success");
            });
        });

        function Report(callback) {
            var report = 'UPDATE report '+
                          'SET car_number = ?, car_type=?, car_mileage_before=?, car_refuel_state=? '+
                          'WHERE id = ?';
            dbConn.query(report, [info.report.car_number, info.report.car_kind, info.report.KM, info.report.car_refuel_state, info.report.report_id], function(err, result) {
                if (err) {
                    return callback(err);
                }
                callback(null, "Success Report");
            });
        }
        function Details_move(callback) {
            var update_move = "UPDATE report_details "+
                "SET start_time=?, end_time=? "+
                "WHERE report_id=? AND work_details=?";
            dbConn.query(update_move, [info.report.moveTime.startTime, info.report.moveTime.endTime, info.report.report_id, 100], function(err, result) {
                if (err) {
                    return callback(err);
                }
                callback(null, "Success Move");
            });
        }
        function Details_setup(callback) {
            if(info.report.errCheck == 1) {   //장애미발생
                var update_setup1 = "UPDATE report_details "+
                                  "SET start_time = ?, end_time = ?, obstacle_classification=NULL, "+
                                  "obstacle_details=NULL, obstacle_phenomenon=NULL, obstacle_result=NULL, "+
                                  "obstacle_start_time=NULL, obstacle_end_time=NULL, type=? "+
                                  "WHERE report_id = ? AND work_details = 101";
                dbConn.query(update_setup1, [info.report.arrivalSETPUP.startTime, info.report.arrivalSETPUP.endTime, 1,info.report.report_id], function(err, result) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, "Success SETUP");
                });
            } else {    //장애발생
                if(info.report.errorList.obstacle_details) {
                    var update_setup2 = 'UPDATE report_details '+
                        'SET start_time=?, end_time=?, obstacle_classification =?, '+
                        'obstacle_details=?, obstacle_phenomenon=?, obstacle_result=?, '+
                        'obstacle_start_time =?, obstacle_end_time=?, type=? '+
                        'WHERE report_id=? AND work_details=101';
                    dbConn.query(update_setup2, [info.report.arrivalSETPUP.startTime, info.report.arrivalSETPUP.endTime, info.report.errorList.obstacle_classification,
                        info.report.errorList.obstacle_details, info.report.errorList.errInfo, info.report.errorList.errSolution, info.report.errorList.startTime, info.report.errorList.endTime,
                        0, info.report.report_id], function(err, result) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null, "Success SETUP");
                    });
                } else { //기타
                    var update_setup2 = 'UPDATE report_details '+
                        'SET start_time=?, end_time=?, '+
                        'obstacle_phenomenon=?, obstacle_result=?, '+
                        'obstacle_start_time =?, obstacle_end_time=?, type=? '+
                        'WHERE report_id=? AND work_details=101';
                    dbConn.query(update_setup2, [info.report.arrivalSETPUP.startTime, info.report.arrivalSETPUP.endTime,
                        info.report.errorList.errInfo, info.report.errorList.errSolution, info.report.errorList.startTime, info.report.errorList.endTime,
                        0, info.report.report_id], function(err, result) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null, "Success SETUP");
                    });
                }
            }
        }

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
        "WHERE t.id = ? AND r.type = 1 " +
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
    });
}

//엑셀 파일을 통해 리포트 업데이트 하기
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
        'HEX(AES_ENCRYPT(?, \'wiz\')), ' + //이메일
        'HEX(AES_ENCRYPT(?, \'wiz\')), ' + //휴대폰번호
        'HEX(AES_ENCRYPT(SHA2(\'1111\', 512), \'wiz\')), ' + //패스워드
        '?, ' + //팀아이디
        '?, ' + //팀 포지션
        '?, ' + //부서아이디
        '?, ' + //직책
        '?)'; //장비

    //employee가 있다면 update하기
    var sql_update_employee = 'UPDATE employee ' +
                              'SET name = ?, ' + //이름
                                  'email = HEX(AES_ENCRYPT(?, \'wiz\')), ' + //이메일
                                  'phone_number = HEX(AES_ENCRYPT(?, \'wiz\')), ' + //휴대폰번호
                                  'team_id = ?, ' + //팀아이디
                                  'team_position = ?, ' + //팀 포지션
                                  'department_id = ?, ' + //부서아이디
                                  'department_position = ?, ' + //직책
                                  'equipment_name = ? ' + //장비이름
                              'WHERE id = ?';

    //report가 있는지 확인하기
    var sql_select_report = 'SELECT id reportId ' +
                            'FROM report ' +
                            'WHERE employee_id = ? AND team_id = ? AND date = STR_TO_DATE(?, \'%Y-%m-%d\') AND type = 0';

    //report가 있다면 update하기
    var sql_update_report =
        'UPDATE report ' +
        'SET team_name = ?, team_position = ?, team_member = ?, equipment_name = ?, location = ?, calls = ?, car_number = ?, car_type = ?, car_manager = ? ' +
        'WHERE id = ?';

    //report 가 없다면 insert하기
    var sql_insert_report =
        'INSERT INTO report(employee_id, team_id, team_name, team_position, team_member, equipment_name, date, location, calls, car_number, car_type, car_manager, type) ' +
        'VALUES(?, ?, ?, ?, ?, ?, STR_TO_DATE(?, \'%Y-%m-%d\'), ?, ?, ?, ?, ?, 0)';

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.beginTransaction(function(err) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            async.parallel([setTeamAndDepartmentAndEmployeeAndReport, setPartAndTeam], function(err) {
                if (err) {
                    dbConn.rollback(function() {
                        dbConn.release();
                        return callback(err);
                    });
                }
                dbConn.commit(function() {
                    dbConn.release();
                    callback(null);
                });
            });
        });

        function setTeamAndDepartmentAndEmployeeAndReport(callback) {
            async.waterfall([setTeamAndDepartment, setEmployee, setReport], function(err, result) {
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        }

        function setTeamAndDepartment(callback) {
            async.parallel([setTeam, setDepartment], function(err, results) {
                if (err) {
                    return callback(err);
                }
                callback(null, results[0], results[1]); //teamId와 departmentId를 리턴
            });
        }

        //part가 있는지 없는지 검사하고 없으면 insert한 다음 setTeam과 setTeamsPart함수 사용하여 team과 part결합 하는 함수
        function setPartAndTeam(callback) {
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
                            setTeam(function(err, teamId) {
                                if (err) {
                                    return callback(err);
                                }
                                setTeamsPart(teamId, partId, function(err) {
                                    if (err) {
                                        return callback(err);
                                    }
                                    callback();
                                });
                            });
                        });
                    } else {
                        setTeam(function(err, teamId) {
                            if (err) {
                                return callback(err);
                            }
                            setTeamsPart(teamId, partId, function(err) {
                                if (err) {
                                    return callback(err);
                                }
                                callback();
                            });
                        });
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

        //department가 있는지 없는지 검사하고 있으면 냅두고 없므면 insert하는 함수
        function setDepartment(callback) {
            findDepartmentByName(function (err, departmentId) {
                if (err) {
                    return callback(err);
                }
                if (!departmentId) { //department가 없다면
                    insertDepartment(function (err, results) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null, results); //departmentId 리턴
                    });
                } else { //department가 있다면
                    callback(null, departmentId);
                }
            });
        }

        //team이 있는지 없는지 검사하고 있으면 냅두고 없으면 insert하는 함수
        function setTeam(callback) {
            findteamByNameAndNo(function (err, teamId) {
                if (err) {
                    return callback(err);
                }
                if (!teamId) {
                    insertTeam(function(err, results) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null, results); //teamId를 리턴
                    });
                } else {
                    callback(null, teamId); //teamId를 리턴
                }
            });
        }

        //team과 part가 엮여있다면 냅두고 엮여있지 않다면 insert하는 함수
        function setTeamsPart(teamId, partId, callback) {
            findTeamsPart(teamId, partId, function(err, results) {
                if (err) {
                    return callback(err);
                }
                if (!results) {
                    insertTeamsPart(teamId, partId, function(err) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null);
                    });
                } else {
                    callback(null);
                }
            });
        }

        //employee가 있는지 확인하고 있다면 업데이트 시키고 없다면 insert하는 함수.
        function setEmployee(teamId, departmentId, callback) {
            findEmployeeByEmail(function(err, id) {
                if (err) {
                    return callback(err);
                }
                if (!id) { //employee가 존재하지 않느다면
                    insertEmployee(teamId, departmentId, function(err, insertedId) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null, insertedId, teamId); //id(employeeId)와 teamId 리턴
                    });
                } else { //employee가 존재한다면
                    updateEmployee(id, teamId, departmentId, function(err) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null, id, teamId); //id(employeeId)와 teamId 리턴
                    });
                }
            });
        }

        function setReport(id, teamId, callback) { //id(employeeId), teamId, callback함수를 매개변수로 받는다.
            if (plan.calls === 'X' || plan.equipmentName === 'X') {
                callback(null);
            } else {
                findReport(id, teamId, function(err, reportId) {
                    if (err) {
                        return callback(err);
                    }
                    if (!reportId) { //report가 존재하지 않는다면 insert하기
                        insertReport(id, teamId, function(err, results) {
                            if (err) {
                                return callback(err);
                            }
                            callback(null);
                        });
                    } else { // report가 존재한다면 업데이트 하기
                        updateReport(reportId, function(err, results) {
                            if (err) {
                                return callback(err);
                            }
                            callback(null);
                        });
                    }
                });
            }
        }

        //부서가 존재하는지 찾기
        function findDepartmentByName(callback) {
            dbConn.query(sql_find_department_by_name, [plan.department], function(err, results) {
                if (err) {
                    console.log('findDepartmentByName');
                    return callback(err);
                }
                callback(null, results[0].departmentId); //리턴 departmentId
            });
        }

        //부서가 존재하지 않다면 부서 insert하기
        function insertDepartment(callback) {
            dbConn.query(sql_insert_department, [plan.department], function(err, results) {
                if (err) {
                    console.log('insertDepartment');
                    return callback(err);
                }
                var departmentId = results.insertId;
                callback(null, departmentId); //departmentId 리턴
            })
        }

        //employee가 존재하는지 찾기.
        function findEmployeeByEmail(callback) {
            dbConn.query(sql_find_employee_by_email, [plan.email], function(err, results) {
                if (err) {
                    console.log('findEmployeeByEmail');
                    return callback(err);
                }
                if (!results[0]) {
                    callback(null, false);
                } else {
                    callback(null, results[0].id); //리턴 id(employeeId)
                }
            });
        }

        //employee가 존재하지 않다면 insert하기
        function insertEmployee(teamId, departmentId, callback) {
            var equipmentName = (plan.equipmentName === 'X') ? null : plan.equipmentName;
            var teamPosition = (plan.teamPosition === '조장') ? 3 : 4;
            dbConn.query(sql_insert_employee, [plan.name, plan.email, plan.phoneNumber, teamId, teamPosition, departmentId, plan.departmentPosition, equipmentName], function(err, results) {
                if (err) {
                    console.log('insertEmployee');
                    return callback(err);
                }
                var id = results.insertId;
                callback(null, id);
            });
        }

        //employee가 존재 한다면 update하기
        function updateEmployee(id, teamId, departmentId, callback) { //id(employeeId), teamId, departmentId
            var equipmentName = (plan.equipmentName === 'X') ? null : plan.equipmentName;
            var teamPosition = (plan.teamPosition === '조장') ? 3 : 4;
            dbConn.query(sql_update_employee, [plan.name, plan.email, plan.phoneNumber, teamId, teamPosition, departmentId, plan.departmentPosition, equipmentName, id], function(err) {
               if (err) {
                   console.log('updateEmployee');
                   return callback(err);
               }
               callback(null, id);
            });
        }

        //part가 존재하는지 찾기.
        function findPartByName(partName, callback) {
            dbConn.query(sql_find_part_by_name, [partName], function(err, results) {
                if (err) {
                    console.log('findPartByName');
                    return callback(err);
                }
                if (!results[0]) {
                    callback(null, false);
                } else {
                    callback(null, results[0].partId); //partId를 리턴
                }
            });
        }

        //part insert하기
        function insertPart(partName, callback) {
            dbConn.query(sql_insert_part, [partName], function(err, results) {
                if (err) {
                    console.log('insertPart');
                    return callback(err);
                }
                var partId = results.insertId;
                callback(null, partId); //partId를 리턴
            });
        }

        //team이 존재하는지 찾기.
        function findteamByNameAndNo(callback) {
            dbConn.query(sql_find_team_by_team_name_and_team_no, [plan.teamName, plan.teamNo], function(err, results) {
                if (err) {
                    console.log('findteamByNameAndNo');
                    return callback(err);
                }
                if (!results[0].teamId) {
                    callback(null, false);
                } else {
                    callback(null, results[0].teamId); //teamId를 리턴
                }
            });
        }

        //team이 존재하지 않으면 insert하기
        function insertTeam(callback) {
            dbConn.query(sql_insert_team, [plan.teamName], function(err, results) {
                if (err) {
                    console.log('insertTeam');
                    return callback(err);
                }
                var teamId = results.insertId;
                callback(null, teamId); //teamId를 리턴
            });
        }

        //team과 part가 엮여있는지 확인
        function findTeamsPart(teamId, partId, callback) {
            dbConn.query(sql_select_teams_part, [teamId, partId], function(err, results) {
                if (err) {
                    console.log('findTeamsPart');
                    return callback(err);
                }
                if (!results) {
                    return callback(null, false);
                }
                callback(null, true);
            });
        }

        //team과 part가 엮여있지 않다면 엮기
        function insertTeamsPart(teamId, partId, callback) {
            dbConn.query(sql_insert_teams_part, [teamId, partId], function(err) {
                if (err) {
                    console.log('insertTeamsPart');
                    return callback(err);
                }
                callback(null);
            });
        }

        //리포트가 존재하는지 확인하기
        function findReport(id, teamId, callback) { //id(employeeId)와 teamId, callback함수를 매개변수로
            dbConn.query(sql_select_report, [id, teamId, plan.date], function(err, results) {
                if (err) {
                    console.log('findReport');
                    return callback(err);
                }
                if (!results[0]) {
                    callback(null, false);
                } else {
                    callback(null, results[0].reportId); //reportId를 리턴
                }
            });
        }

        //리포트가 존재한다면 업데이트하기
        function updateReport(reportId, callback) { //id(employeeId)와 teamId, callback함수를 매개변수로
            var calls = plan.calls === 'X' ? null : plan.calls;
            dbConn.query(sql_update_report, [plan.teamName + ' ' + plan.teamNo + '조', plan.teamPosition, plan.teamMember, plan.equipmentName, plan.location, calls, plan.carNumber, plan.carType, plan.carManager, reportId], function(err) {
               if (err) {
                   console.log('updateReport');
                   return callback(err);
               }
               callback(null, reportId); //reportId를 리턴
            });
        }

        //리포트가 존재하지 않다면 insert하기
        function insertReport(id, teamId, callback) { //id(employeeId), teamId, callback함수를 매개변수로 받는다
            var calls = plan.calls === 'X' ? null : plan.calls;
            dbConn.query(sql_insert_report, [id, teamId, plan.teamName + ' ' + plan.teamNo + '조', plan.teamPosition, plan.teamMember, plan.equipmentName, plan.date, plan.location, calls, plan.carNumber, plan.carType, plan.carManager], function(err, results) {
                if (err) {
                    console.log('insertReport');
                    return callback(err);
                }
                var reportId = results.insertId;
                callback(null, reportId); // reportId를 리턴
            });
        }
    });

}

//일자별 리포트 디테일 가져오기
function getReportDetailperDate(reqData, callback) {
    var sql_select_report_basic_information =
        'SELECT r.id reportId, r.team_name teamName, r.location location, r.team_member teamMember, r.team_position teamPosition, e.name, e.equipment_name equipmentName, r.car_type carType, r.car_number carNumber, r.car_manager carManager, r.car_mileage_before carMileageBefore, r.car_mileage_after carMileageAfter, r.car_refuel_state carRefuelState ' +
        'FROM report r JOIN employee e ON (e.id = r.employee_id) ' +
        'WHERE r.team_id = ? AND r.date = STR_TO_DATE(?, \'%Y-%m-%d\') AND r.type = 1 ' +
        'GROUP BY r.equipment_name';

    var sql_select_report_details =
        'SELECT work_details workDetails, ' + //몇차 측정인지
                            'start_time startTime, ' + //측정 시작시간
                            'end_time endTime, ' + //측정 종료시간
                            'calls, ' + //호량
                            'location, ' + //장소 ~동
                            'target1, ' + //측정대상1
                            'target2, ' + //측정대상2
                            'obstacle_classification obstacleClassification, ' + //장애구분
                            'obstacle_details obstacleDetails, ' + //장애 세부 내역
                            'obstacle_phenomenon obstaclePhenomenon, ' + //장애 현상
                            'obstacle_result obstacleResult, ' + //장애 처리 결과
                            'obstacle_start_time obstacleStartTime, ' + //장애 발생 시작시간
                            'obstacle_end_time obstacleEndTime, ' + //장애 발생 종료시간
                            'SUBTIME(obstacle_end_time, obstacle_start_time) delayTime, ' + //지연 시간
                            'type ' + //장애인지 장애가 아닌지
        'FROM report_details ' +
        'WHERE report_id = ?';

    //금일 측정 대상 가져오기
    var sql_select_report_detail_target2 =
        'SELECT GROUP_CONCAT(DISTINCT(rd.target2)) measureObj ' +
        'FROM report r JOIN report_details rd ON (r.id = rd.report_id) ' +
        'WHERE r.team_id = ? AND r.date = STR_TO_DATE(?, \'%Y-%m-%d\') AND r.type = 1';

    //전체 에러 건수와 시간
    var sql_error_num_time =
        'SELECT SEC_TO_TIME(SUM(TIME_TO_SEC(subtime(obstacle_end_time, obstacle_start_time)))) totalDelayTime, COUNT(*) totalErrorCount ' +
        'FROM report r JOIN report_details rd ON (r.id = rd.report_id) ' +
        'WHERE r.team_id = ? AND r.date = STR_TO_DATE(?, \'%Y-%m-%d\') AND r.type = 1 AND rd.type = 1';

    //계획 대비 실적 가져오기
    var sql_select_maesure_per_plan =
        'SELECT a.equipmentName, a.planCalls, b.measureCalls ' +
        'FROM(SELECT equipment_name equipmentName, calls planCalls ' +
        'FROM report ' +
        'WHERE team_id = ? AND date=STR_TO_DATE(?, \'%Y-%m-%d\') AND type=0) a JOIN (SELECT r.equipment_name equipmentName, sum(rd.calls) measureCalls ' +
        'FROM report r JOIN report_details rd ON (r.id = rd.report_id) ' +
        'WHERE r.team_id = ? AND r.date=STR_TO_DATE(?, \'%Y-%m-%d\') AND r.type=1 ' +
        'GROUP BY r.equipment_name) b ON (a.equipmentName = b.equipmentName)';

    var sql_select_avg_details =
        'SELECT rd.work_details workDetails, SEC_TO_TIME(avg(TIME_TO_SEC(rd.start_time))) startTime, SEC_TO_TIME(avg(TIME_TO_SEC(rd.end_time))) endTime, rd.location, rd.target1, sum(rd.calls) calls, sum(rd.type) error ' +
        'FROM report r JOIN report_details rd ON (r.id = rd.report_id) ' +
        'WHERE r.team_id = ? AND r.date = STR_TO_DATE(?, \'%Y-%m-%d\') AND r.type = 1 ' +
        'GROUP BY rd.work_details ' +
        'ORDER BY startTime';

    var resData = {};
    resData.employees = [];
    resData.performances = [];
    resData.avgWorkDetails = [];

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            dbConn.release();
            return callback(err);
        }
        async.parallel([getBasicInfoAndMeasureInfo, getMeasureObj, briefErrorInfo, measurePerPlan, getAvgWorkDetails], function(err, result) {
           if (err) {
               dbConn.release();
               return callback(err);
           }
           dbConn.release();
           callback(null, resData);
        });

        function getAvgWorkDetails(callback) {
            dbConn.query(sql_select_avg_details, [reqData.teamId, reqData.date], function(err, results) {
                if (err) {
                    return callback(err);
                }
                for(var i = 0; i < results.length; i++) {
                    resData.avgWorkDetails.push({
                        workDetails: results[i].workDetails,
                        startTime: results[i].startTime.substring(0,8),
                        endTime: results[i].endTime.substring(0,8),
                        location: results[i].location || '',
                        target1: results[i].target1 || '',
                        calls: results[i].calls,
                        error: results[i].error
                    });
                }
                callback(null);
            });
        }

        function getBasicInfoAndMeasureInfo(callback) {
            async.series([getBasicInfo, getDetailInfoSet], function (err, results) {
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        }
        function getMeasureObj(callback) {
            dbConn.query(sql_select_report_detail_target2, [reqData.teamId, reqData.date], function(err, results) {
                if (err) {
                    return callback(err);
                }
                resData.measureObj = results[0].measureObj;
                callback(null);
            });
        }
        function briefErrorInfo(callback) {
            dbConn.query(sql_error_num_time, [reqData.teamId, reqData.date], function(err, results) {
                if (err) {
                    return callback(err);
                }
                resData.totalDelayTime = results[0].totalDelayTime;
                resData.totalErrorCount = results[0].totalErrorCount;
                callback(null);
            });
        }
        function measurePerPlan(callback) {
            dbConn.query(sql_select_maesure_per_plan, [reqData.teamId, reqData.date, reqData.teamId, reqData.date], function(err, results) {
                if (err) {
                    return callback(err);
                }
                for(var i = 0; i < results.length; i++) {
                    resData.performances.push({
                        equipmentName: results[i].equipmentName,
                        planCalls: results[i].planCalls,
                        measureCalls: results[i].measureCalls
                    });
                }
                callback(null);
            });
        }
        function getDetailInfoSet(callback) {
            async.each(resData.employees, getDetailInfo, function(err) {
                if (err) {
                    return callback(err);
                }
                callback(null);
            })
        }

        function getBasicInfo(callback) {
            dbConn.query(sql_select_report_basic_information, [reqData.teamId, reqData.date], function (err, results) {
                if (err) {
                    return callback(err);
                }
                for (var i = 0; i < results.length; i++) {
                    resData.teamName = results[i].teamName || '';
                    resData.location = results[i].location || '';
                    resData.teamMember = results[i].teamMember || '';
                    if (results[i].teamPosition === '조장') {
                        resData.teamLeader = results[i].name || '';
                    }
                    resData.employees.push(
                        {
                            reportId: results[i].reportId,
                            name: results[i].name || '',
                            equipment: results[i].equipmentName || ''
                        });
                    resData.carType = results[i].carType || '';
                    resData.carNumber = results[i].carNumber || '';
                    resData.carManager = results[i].carManager || '';
                    resData.carMileageBefore = results[i].carMileageBefore || '';
                    resData.carMileageAfter = results[i].carMileageAfter || '';
                    resData.carRefuelState = results[i].carRefuelState || '';
                }
                callback(null);
            });
        }

        function getDetailInfo(employees, callback) {
            dbConn.query(sql_select_report_details, [employees.reportId], function(err, results) {
                if (err) {
                    return callback(err);
                }
                employees.work = [];
                for (var i = 0; i < results.length; i ++) {
                    var work = {
                        workDetails: results[i].workDetails || '',
                        startTime: results[i].startTime || '',
                        endTime: results[i].endTime || '',
                        calls: results[i].calls || '',
                        location: results[i].location || '',
                        target1: results[i].target1 || '',
                        target2: results[i].target2 || '',
                        obstacleClassification: results[i].obstacleClassification || '',
                        obstacleDetails: results[i].obstacleDetails || '',
                        obstaclePhenomenon: results[i].obstaclePhenomenon || '',
                        obstacleResult: results[i].obstacleResult || '',
                        obstacleStartTime: results[i].obstacleStartTime || '',
                        obstacleEndTime: results[i].obstacleEndTime || '',
                        delayTime: results[i].delayTime || '',
                        type: results[i].type || ''
                    };
                    employees.work.push(work);
                }
                callback();
            });
        }
    });
}

//일별 에러 통계
function getErrorStatisticsPerDay(callback) {

    //실제 측정 리포트가 있는 날짜들을 가져옴
    var sql_select_day = 'SELECT DISTINCT(DATE_FORMAT(date, \'%Y-%m-%d\')) date ' +
                         'FROM report ' +
                         'WHERE type = 1 ' +
                         'ORDER BY date DESC';

    //날짜에 따라 에러사항 가져옴
    var sql_select_error_statistics_per_day =
        'SELECT b.date, a.teamName, a.teamNo, a.name teamLeader, b.gpsError, b.notebookError, b.terminalError, b.equipmentError, b.measurererError, b.cableError, b.programError, b.etcError, b.sum ' +
        'FROM (SELECT a.teamId, a.teamName, a.teamNo, b.name ' +
        'FROM(SELECT id teamId, name teamName, team_no teamNo ' +
        'FROM team t ' +
        'WHERE t.team_no > 0 ' +
        'GROUP BY t.id) a LEFT JOIN (SELECT name, team_position teamPosition, team_id teamId ' +
        'FROM employee ' +
        'WHERE team_position = 3) b ON(a.teamId = b.teamId)) a LEFT JOIN (SELECT r.date, t.id teamId, t.name, t.team_no, count(*) sum, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'GPS\' THEN 1 ELSE 0 END) gpsError, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'기타\' THEN 1 ELSE 0 END) etcError, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'노트북\' THEN 1 ELSE 0 END) notebookError, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'단말기\' THEN 1 ELSE 0 END) terminalError, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'장비\' THEN 1 ELSE 0 END) equipmentError, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'측정자\' THEN 1 ELSE 0 END) measurererError, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'케이블\' THEN 1 ELSE 0 END) cableError, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'프로그램\' THEN 1 ELSE 0 END) programError ' +
        'FROM report r JOIN report_details rd ON(r.id = rd.report_id) ' +
        'JOIN team t ON(t.id = r.team_id) ' +
        'WHERE r.type = 1 AND r.date = STR_TO_DATE(?, \'%Y-%m-%d\') AND rd.type = 1) b ON (a.teamId = b.teamId) ' +
        'ORDER BY a.teamId';


    dbPool.getConnection(function(err, dbConn) {
       if (err) {
           return callback(err);
       }

       var resData = [];

       async.waterfall([function(callback) {
            dbConn.query(sql_select_day, [], function(err, results) {
                if (err) {
                    return callback(err);
                }
                var dates = [];
                for(var i = 0; i < results.length; i++) {
                    dates.push(results[i].date);
                }
                callback(null, dates);
            });
           }, getErrorPerDay
       ], function(err, result) {
           if (err) {
               return callback(err);
           }
           callback(null, resData);
       });

       function getErrorPerDay(dates, callback) {
           async.each(dates, function(date, callback) {
              dbConn.query(sql_select_error_statistics_per_day, [date], function(err, results) {
                 if (err) {
                     return callback(err);
                 }
                 var data = [];
                 for (var i = 0; i < results.length; i++) {
                     data.push({
                         date: date,
                         teamName: results[i].teamName + ' ' + results[i].teamNo + '조',
                         teamLeader: results[i].teamLeder || '',
                         gpsError: results[i].gpsError || 0,
                         notebookError: results[i].notebookError || 0,
                         terminalError: results[i].terminalError || 0,
                         equipmentError: results[i].equipmentError || 0,
                         measurererError: results[i].measurererError || 0,
                         cableError: results[i].cableError || 0,
                         programError: results[i].programError || 0,
                         etcError: results[i].etcError || 0,
                         sum: results[i].sum || 0
                     });
                 }
                 resData.push(data);
                 callback();
              });
           }, function(err, result) {
                if (err) {
                    return callback(err);
                }
                callback(null);
           });
       }
    });
}

//주별 에러 통계
function getErrorStatisticsPerWeek() {

}

//월별 에러 통계
function getErrorStatisticsPerMonth() {

}

//분기별 에러 통계
function getErrorStatisticsPerQuarter() {

}

module.exports.reportList = reportList;
module.exports.addReport = addReport;
module.exports.newReport = newReport;
module.exports.deleteReport = deleteReport;
module.exports.updateReport = updateReport;
module.exports.getReportsByteamId = getReportsByteamId;
module.exports.updatePlan = updatePlan;
module.exports.updateReportSelect = updateReportSelect;
module.exports.getReportDetailperDate = getReportDetailperDate;
module.exports.getErrorStatisticsPerDay = getErrorStatisticsPerDay;
module.exports.getErrorStatisticsPerWeek = getErrorStatisticsPerWeek;
module.exports.getErrorStatisticsPerMonth = getErrorStatisticsPerMonth;
module.exports.getErrorStatisticsPerQuarter = getErrorStatisticsPerQuarter;