var dbPool = require('./common').dbPool;
var async = require('async');

function reportList(callback) {
    var sql_select_report = "SELECT DISTINCT r.id, DATE_FORMAT(CONVERT_TZ(r.date, '+00:00', '+09:00'), '%Y-%m-%d') date, "+
        "r.location location, rd.location location_detail, t.name teamName "+
        "FROM report r LEFT JOIN report_details rd ON (r.id = rd.report_id) "+
        "JOIN employee e ON (r.employee_id = e.id) "+
        "LEFT JOIN team t ON (t.id = e.team_id) WHERE r.type = 1";
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_select_report, function(err, result) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            callback(null, result);
        });
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

module.exports.reportList = reportList;
module.exports.addReport = addReport;
module.exports.newReport = newReport;
module.exports.getReportsByteamId = getReportsByteamId;
