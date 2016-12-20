var dbPool = require('./common').dbPool;
var async = require('async');

function reportList(user_id, callback) {
    var sql_select_name = 'SELECT name FROM employee WHERE id = ?';
    var sql_select_report = "SELECT r.id, DATE_FORMAT(CONVERT_TZ(r.date, '+00:00', '+09:00'), '%Y-%m-%d') date, "+
    "r.location location, t.name teamName, t.team_no "+
    "FROM report r " +
    "JOIN team t ON (t.id = r.team_id) " +
    "WHERE type = 1 AND employee_id = ? " +
    "ORDER BY date DESC";
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_select_report, [user_id], function(err, result) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            if(!result[0]) {
                result.push({id : null});
            }
            dbConn.query(sql_select_name, [user_id], function(err, name) {
                if (err) {
                    dbConn.release();
                    return callback(err);
                }
                dbConn.release();
                callback(null, result, name[0].name);
            });
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
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err)
        }
        async.series([function(callback) {
            //조장
            var team = "SELECT a.teamId, a.teamName, a.teamNo, b.name "+
                "FROM(SELECT id teamId, name teamName, team_no teamNo "+
                "FROM team t "+
                "WHERE t.team_no > 0 "+
                "GROUP BY t.id) a LEFT JOIN (SELECT name, team_position teamPosition, team_id teamId "+
                "FROM employee "+
                "WHERE team_position = 3) b ON(a.teamId = b.teamId) "+
                "WHERE a.teamId = (SELECT team_id "+
                "FROM employee WHERE id = ?)";
            dbConn.query(team, [user_id], function(err, result) {
                if (err) {
                    return callback(err);
                }
                if(!result[0]) {
                    var makeResult ={};
                    makeResult.teamId = null;
                    makeResult.teamName = null;
                    makeResult.teamNo = null;
                    makeResult.name = null;
                    callback(null, makeResult);
                } else {
                    callback(null, result[0]);
                }
            });
        }, function(callback) {
            //주소, 조원, 자동차타입, 장비
            var select_plan = "SELECT id, location, team_member, car_number, car_type, equipment_name, type "+
                "FROM report "+
                "WHERE employee_id = ? "+
                "AND type = 0 "+
                "AND date = ?";
            function date(){
                var date = new Date();

                var year  = date.getFullYear();
                var month = date.getMonth() + 1; // 0부터 시작하므로 1더함 더함
                var day   = date.getDate();

                if(month < 10) {
                    month = "0"+month;
                }
                if(day < 10) {
                    day = "0"+day
                }
                return year +'-'+month+'-'+day;
            }
            dbConn.query(select_plan, [user_id, date()], function(err, result) {
                if (err) {
                    return callback(err);
                }
                if(!result[0]) {
                    var makeResult = {};

                    makeResult.location = null;
                    makeResult.team_member = null;
                    makeResult.car_number = null;
                    makeResult.car_type = null;
                    makeResult.equipment_name = null;
                    callback(null, makeResult);
                } else {
                    callback(null, result[0]);
                }
            });

        }], function(err, results) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            dbConn.release();
            callback(null, results)
        });
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
        async.series([baseUpdate, Report, Details_move, Details_setup], function(err, results) {
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

        function baseUpdate(callback) {
            var base_update = "UPDATE report " +
                    "SET team_member=?, equipment_name=?, location=? " +
                    "WHERE id = ?";
            dbConn.query(base_update, [info.report.group_member, info.report.measure_machine, info.report.measure_place, info.report.report_id], function(err, result) {
                if (err) {
                    return callback(err);
                }
                callback(null, "Success Base");
            })
        }

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
            if(info.report.errCheck == 0) {   //장애미발생
                var update_setup1 = "UPDATE report_details "+
                                  "SET start_time = ?, end_time = ?, obstacle_classification=NULL, "+
                                  "obstacle_details=NULL, obstacle_phenomenon=NULL, obstacle_result=NULL, "+
                                  "obstacle_start_time=NULL, obstacle_end_time=NULL, type=? "+
                                  "WHERE report_id = ? AND work_details = 101";
                dbConn.query(update_setup1, [info.report.arrivalSETPUP.startTime, info.report.arrivalSETPUP.endTime, 0,info.report.report_id], function(err, result) {
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
                        1, info.report.report_id], function(err, result) {
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
                        1, info.report.report_id], function(err, result) {
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
            if (err) {
                dbConn.release();
                return callback(err);
            }
            dbConn.release();
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
                if (info.errCheck == 1) {
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
function confirmEdit(info, callback) {
    var dbInfo = {};
    var sql_select_report = "SELECT id, cause_of_incompletion, plan_of_incompletion, refueling_price, "+
                            "car_significant, car_mileage_after "+
                            "FROM report r WHERE id = ?";
    var sql_select_reportDetails = "SELECT id, report_id, work_details, start_time, end_time FROM report_details WHERE report_id = ? AND work_details > 101";
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        async.series([reportCar, reportDetails], function(err, results) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            dbConn.release();
            callback(null, dbInfo);
        });

        function reportCar(callback) {
            dbConn.query(sql_select_report, [info.report_id], function(err, result) {
                if (err) {
                    return callback(err);
                }
                dbInfo.report = result[0];
                callback(null, null);
            });
        }

        function reportDetails(callback) {
            dbConn.query(sql_select_reportDetails, [info.report_id], function(err, result) {
                if (err) {
                    return callback(err);
                }
                if(result[0].work_details == 102) {
                    dbInfo.FTP = result[1];
                    dbInfo.Returntime = result[0];
                } else {
                    dbInfo.FTP = result[0];
                    dbInfo.Returntime = result[1];
                }
                callback(null, null);
            });
        }

    });
}

function confirm(info, callback) {
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }

        var confirmInfo = {};

        async.series([function(callback) {
            var select_err_measure_calls = "SELECT report_id, SUM(type) ErrCount, count(work_details) measure_inning, SUM(calls) calls "+
                "FROM report_details "+
                "WHERE report_id = ? "+
                "AND work_details < 100 "+
                "GROUP BY report_id";
            dbConn.query(select_err_measure_calls, [info.report_id] , function(err, result) {
                if (err) {
                    return callback(err);
                }
                if(result[0]) {
                    confirmInfo.ErrCount = result[0].ErrCount;
                    confirmInfo.measure_inning = result[0].measure_inning + "회차 측정완료";
                    confirmInfo.calls = result[0].calls;
                } else {
                    confirmInfo.ErrCount = 0;
                    confirmInfo.measure_inning = 0 + "회차 측정완료";
                    confirmInfo.calls = 0;
                }
                callback(null, null);
            });
        }, function(callback) {
            var select_plan = "SELECT id, employee_id, date, calls, type "+
                                  "FROM report "+
                                  "WHERE employee_id = ? AND date = (SELECT date FROM report WHERE id = ?) AND type = 0";
            dbConn.query(select_plan, [info.user_id, info.report_id] , function(err, result) {
                if (err) {
                    return callback(err);
                }
                if(!result[0]) {
                    confirmInfo.callsPercentage = 0;
                    confirmInfo.planCalls = 0;
                } else {
                    confirmInfo.planCalls = result[0].calls;
                    confirmInfo.callsPercentage = (confirmInfo.calls/confirmInfo.planCalls)*100;
                }
                callback(null, null);
            });
        }, function(callback) {
            var team_leader = "SELECT b.name "+
                              "FROM(SELECT id teamId, name teamName, team_no teamNo "+
                              "FROM team t "+
                              "WHERE t.team_no > 0 "+
                              "GROUP BY t.id) a LEFT JOIN (SELECT name, team_position teamPosition, team_id teamId "+
                              "FROM employee "+
                              "WHERE team_position = 3) b ON(a.teamId = b.teamId) "+
                              "WHERE a.teamId = (SELECT team_id FROM employee WHERE id = ?) ";
            dbConn.query(team_leader, [info.user_id], function(err, result) {
                if (err) {
                    return callback(err);
                }
                if(result[0]) {
                    confirmInfo.team_leader = result[0].name;
                } else {
                    confirmInfo.team_leader = null;
                }

                callback(null, null);
            });
        }, function(callback) {
            var sql_base_info = "SELECT team_member, location, car_number, car_type, equipment_name, car_mileage_before, car_refuel_state "+
                                "FROM report WHERE id = ?";
            dbConn.query(sql_base_info, [info.report_id], function(err, result) {
                if (err) {
                    return callback(err);
                }
                confirmInfo.team_member = result[0].team_member;
                confirmInfo.location = result[0].location;
                confirmInfo.car_number = result[0].car_number;
                confirmInfo.car_type = result[0].car_type;
                confirmInfo.equipment_name = result[0].equipment_name;
                confirmInfo.car_mileage_before = result[0].car_mileage_before;

                if(result[0].car_refuel_state == 1) {
                    confirmInfo.car_refuel_state = '하'
                } else if(result[0].car_refuel_state == 2) {
                    confirmInfo.car_refuel_state = '중하'
                } else if(result[0].car_refuel_state == 3) {
                    confirmInfo.car_refuel_state = '중'
                } else if(result[0].car_refuel_state == 4) {
                    confirmInfo.car_refuel_state = '중상'
                } else if(result[0].car_refuel_state == 5) {
                    confirmInfo.car_refuel_state = '상'
                }
                callback(null, null);
            });

        }], function(err, results) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            dbConn.release();
            callback(null, confirmInfo);
        });
    });
}
function confirmInsert(info, callback) {
    var insert_detail = "INSERT INTO report_details(report_id, work_details, start_time, end_time) VALUE(?, ?, ?, ?)";
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.beginTransaction(function(err) {
            if (err) {
                return callback(err);
            }
            async.series([function (callback) {
                dbConn.query(insert_detail, [info.report_id, 102, info.move_start_time, info.move_end_time], function(err, result) {
                    if (err) {
                        callback(err);
                    }
                    callback(null, null);
                });

            }, function(callback) {
                dbConn.query(insert_detail, [info.report_id, 103, info.stime, info.etime], function(err, result) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, null);
                });
            }, function(callback) {
                var update_report = "UPDATE report " +
                    "SET refueling_price=?, car_significant=?, cause_of_incompletion=?, plan_of_incompletion=?, car_mileage_after=?"+
                    "WHERE id = ? ";
                dbConn.query(update_report,[info.refueling_price, info.car_significant, info.cause_of_incompletion, info.plan_of_incompletion, info.car_mileage_after, info.report_id],function(err, result) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, null);
                });
            }], function(err, results) {
                if (err) {
                    return dbConn.rollback(function() {
                        dbConn.release();
                        callback(err);
                    });
                }
                dbConn.commit(function() {
                    dbConn.release();
                    callback(null, null);
                });
            });
        });
    });
}
function confirmUpdate(info, callback) {
    var insert_detail = "UPDATE report_details SET start_time=? , end_time=? WHERE report_id = ? AND work_details = ?";
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.beginTransaction(function(err) {
            if (err) {
                return callback(err);
            }
            async.series([function (callback) {
                dbConn.query(insert_detail, [info.move_start_time, info.move_end_time, info.report_id, 102], function(err, result) {
                    if (err) {
                        callback(err);
                    }
                    callback(null, null);
                });

            }, function(callback) {
                dbConn.query(insert_detail, [info.stime, info.etime, info.report_id, 103], function(err, result) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, null);
                });
            }, function(callback) {
                var update_report = "UPDATE report " +
                    "SET refueling_price=?, car_significant=?, cause_of_incompletion=?, plan_of_incompletion=?, car_mileage_after=?"+
                    "WHERE id = ? ";
                dbConn.query(update_report,[info.refueling_price, info.car_significant, info.cause_of_incompletion, info.plan_of_incompletion, info.car_mileage_after, info.report_id],function(err, result) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, null);
                });
            }], function(err, results) {
                if (err) {
                    return dbConn.rollback(function() {
                        dbConn.release();
                        callback(err);
                    });
                }
                dbConn.commit(function() {
                    dbConn.release();
                    callback(null, null);
                });
            });
        });
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
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        var info = {};

        dbConn.beginTransaction(function(err) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            async.series([setDepartmentAndPartAndTeam, setTeamsPart, findAndRemoveTeamMember, setEmployee, setReport], function(err) {
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

        //------------------
        // 부서, 파트, 팀 설정
        //------------------
        function setDepartmentAndPartAndTeam(callback) {
            async.parallel([setDepartment, setPart, setTeam], function(err, results) {
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        }

        //---------
        // 부서 설정
        //---------
        function setDepartment(callback) { //부서 설정하기
            findDepartmentByName(function(err, departmentId) { //부서를 찾음
                if (err) {
                    return callback(err);
                }
                if (departmentId === 0) { //부서가 존재하지 않는다면
                    insertDepartment(function(err, departmentId) {
                        if (err) {
                            return callback(err);
                        }
                        info.departmentId = departmentId;
                        callback(null);
                    });
                } else { //부서가 존재 한다면
                    info.departmentId = departmentId;
                    callback(null);
                }
            });

            //부서가 존재하는지 찾기
            function findDepartmentByName(callback) {
                //부서 이름을 통해 부서가 존재하는지 찾음.
                var sql_find_department_by_name = 'SELECT id departmentId ' +
                    'FROM department ' +
                    'WHERE name = ?';

                dbConn.query(sql_find_department_by_name, [plan.department], function(err, results) {
                    if (err) {
                        console.log('findDepartmentByName');
                        return callback(err);
                    }
                    if (results.length === 0) {

                    } else {
                        callback(null, results[0].departmentId); //리턴 departmentId
                    }
                });
            }

            //부서가 존재하지 않다면 부서 insert하기
            function insertDepartment(callback) {
                //부서가 없다면 insert 하기
                var sql_insert_department = 'INSERT INTO department(name) ' +
                    'VALUES(?)';

                dbConn.query(sql_insert_department, [plan.department], function(err, results) {
                    if (err) {
                        console.log('insertDepartment');
                        return callback(err);
                    }
                    var departmentId = results.insertId;
                    callback(null, departmentId); //departmentId 리턴
                })
            }
        }

        //---------
        // 파트 설정
        //---------
        function setPart(callback) {
            findPartByName(function(err, partId) {
                if (err) {
                    return callback(err);
                }
                if (partId === 0) { //파트가 존재하지 않는다면
                    insertPart(function(err, partId) {
                        if (err) {
                            return callback(err);
                        }
                        info.partId = partId;
                        callback(null);
                    });
                } else { //파트가 존재 한다면
                    info.partId = partId;
                    callback(null);
                }
            });

            //part가 존재하는지 찾기.
            function findPartByName(callback) {
                //파트이름을 통해 파트가 존재하는지 찾기
                var sql_find_part_by_name = 'SELECT id partId ' +
                                            'FROM part ' +
                                            'WHERE name = ?';

                dbConn.query(sql_find_part_by_name, [plan.partName], function(err, results) {
                    if (err) {
                        console.log('findPartByName');
                        return callback(err);
                    }
                    if (results.length === 0) { //part가 존재 하지 않다면
                        callback(null, 0);
                    } else {
                        callback(null, results[0].partId); //partId를 리턴
                    }
                });
            }

            //part insert하기
            function insertPart(callback) {
                //파트가 없다면 insert하기
                var sql_insert_part = 'INSERT INTO part(name) ' +
                                      'VALUES(?)';

                dbConn.query(sql_insert_part, [plan.partName], function(err, results) {
                    if (err) {
                        console.log('insertPart');
                        return callback(err);
                    }
                    var partId = results.insertId;
                    callback(null, partId); //partId를 리턴
                });
            }
        }

        //--------
        // 팀 설정
        //--------
        function setTeam(callback) {
            findteamByNameAndNo(function(err, teamId) {
                if (err) {
                    return callback(err);
                }
                if (teamId === 0) { //팀이 존재하지 않는다면
                    insertTeam(function(err, teamId) {
                        if (err) {
                            return callback(err);
                        }
                        info.teamId = teamId;
                        callback(null);
                    });
                } else { //팀이 존재한다면
                    info.teamId = teamId;
                    callback(null);
                }
            });

            //team이 존재하는지 찾기.
            function findteamByNameAndNo(callback) {
                //팀이름과 조이름을 통해 팀이 존재하는지 찾기. OUTPUT: teamId
                var sql_find_team_by_team_name_and_team_no = 'SELECT id teamId ' +
                                                             'FROM team ' +
                                                             'WHERE name = ? AND team_no = ?';

                dbConn.query(sql_find_team_by_team_name_and_team_no, [plan.teamName, plan.teamNo], function(err, results) {
                    if (err) {
                        console.log('findteamByNameAndNo');
                        return callback(err);
                    }
                    if (results.length === 0) { //팀이 존재하지 않다면
                        return callback(null, 0);
                    } else {
                        callback(null, results[0].teamId); //teamId를 리턴
                    }
                });
            }

            //team이 존재하지 않으면 insert하기
            function insertTeam(callback) {
                //팀이 없다면 insert하기
                var sql_insert_team = 'INSERT INTO team(name, team_no) ' +
                                      'VALUES(?, ?)';

                dbConn.query(sql_insert_team, [plan.teamName, plan.teamNo], function(err, results) {
                    if (err) {
                        console.log('insertTeam');
                        return callback(err);
                    }
                    var teamId = results.insertId;
                    callback(null, teamId); //teamId를 리턴
                });
            }
        }

        //-------------
        // 팀, 파트 설정
        //-------------
        function setTeamsPart(callback) {
            findTeamsPart(function(err, result) {
                if (err) {
                    return callback(err);
                }
                if (result === 0) { //팀과 파트가 엮여있지 않다면
                    insertTeamsPart(function(err) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null);
                    });
                } else { //팀과 파트가 엮여 있다면
                    callback(null);
                }
            });

            //team과 part가 엮여있는지 확인
            function findTeamsPart(callback) {
                //팀과 파트가 엮여 있는지 확인
                var sql_select_teams_part = 'SELECT * FROM teams_parts ' +
                                            'WHERE team_id = ? AND part_id = ?';

                dbConn.query(sql_select_teams_part, [info.teamId, info.partId], function(err, results) {
                    if (err) {
                        console.log('findTeamsPart');
                        return callback(err);
                    }
                    if (results.length === 0) {
                        return callback(null, 0);
                    }
                    callback(null, 1);
                });
            }

            //team과 part가 엮여있지 않다면 엮기
            function insertTeamsPart(callback) {
                //팀과 파트 엮기
                var sql_insert_teams_part = 'INSERT INTO teams_parts(team_id, part_id) ' +
                                            'VALUES(?, ?)';

                dbConn.query(sql_insert_teams_part, [info.teamId, info.partId], function(err) {
                    if (err) {
                        console.log('insertTeamsPart');
                        return callback(err);
                    }
                    callback(null);
                });
            }
        }

        //----------------
        // 기존 팀 멤버 제거
        //----------------
        function findAndRemoveTeamMember(callback) {
            if (plan.teamPosition === '조장') {
                async.waterfall([findTeamMember, removeExistingteamMembers], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null);
                });
            } else {
                callback(null);
            }

            //팀 멤버 찾는 함수
            function findTeamMember(callback) {
                //원래의 팀 멤버 찾기
                var sql_select_team_member = 'SELECT e.id, e.name ' +
                                             'FROM employee e JOIN team t ON (e.team_id = t.id) ' +
                                             'WHERE t.id = ?';

                dbConn.query(sql_select_team_member, [info.teamId], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    var employeeIds = [];
                    if (results.length === 0) { // 기존 팀에 아무도 존재하지 않다면
                        callback(null, 0);
                    } else { //기존 팀에 누가 있을 때
                        for (var i = 0; i < results.length; i++) {
                            employeeIds.push(results[i].id);
                        }
                        callback(null, employeeIds);
                    }
                });
            }

            //팀 멤버들을 제거하는 함수
            function removeExistingteamMembers(employeeIds, callback) {
                if (employeeIds === 0) {
                    return callback(null);
                }
                async.each(employeeIds, removeExistingteamMember, function (err) {
                    if (err) {
                        callback(err);
                    }
                    callback(null);
                });

                function removeExistingteamMember(employeeId, callback) {
                    //원래의 팀멤버의 팀에서 없애기
                    var sql_update_existing_team_member = 'UPDATE employee ' +
                                                          'SET team_id = NULL AND team_position = NULL ' +
                                                          'WHERE id = ?';

                    dbConn.query(sql_update_existing_team_member, [employeeId], function (err, results) {
                        if (err) {
                            return callback(err);
                        }
                        callback();
                    });
                }
            }
        }

        //---------
        // 사원 설정
        //---------
        function setEmployee(callback) {
            findEmployeeByEmail(function(err, employeeId) {
                if (err) {
                    return callback(err);
                }
                if (employeeId === 0) { //employee가 존재하지 않다면
                    insertEmployee(function(err, employeeId) { //employee 넣기
                        if (err) {
                            return callback(err);
                        }
                        info.employeeId = employeeId;
                        callback(null);
                    });
                } else { //employee가 존재 한다면
                    updateEmployee(employeeId, function(err) {
                        if (err) {
                            return callback(err);
                        }
                        info.employeeId = employeeId;
                        callback(null);
                    });
                }
            });

            //employee가 존재하는지 찾기.
            function findEmployeeByEmail(callback) {
                var sql_find_employee_by_email = 'SELECT id ' +
                                                 'FROM employee ' +
                                                 'WHERE CAST(AES_DECRYPT(UNHEX(email), \'wiz\') AS CHAR) = ?';

                dbConn.query(sql_find_employee_by_email, [plan.email], function(err, results) {
                    if (err) {
                        console.log('findEmployeeByEmail');
                        return callback(err);
                    }
                    if (results.length === 0) {
                        callback(null, 0);
                    } else {
                        var employeeId = results[0].id;
                        callback(null, employeeId);
                    }
                });
            }

            //employee가 존재하지 않다면 insert하기
            function insertEmployee(callback) {
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
                var teamPosition = (plan.teamPosition === '조장') ? 3 : 4;
                dbConn.query(sql_insert_employee, [plan.name, plan.email, plan.phoneNumber, info.teamId, teamPosition, info.departmentId, plan.departmentPosition, plan.equipmentName], function(err, results) {
                    if (err) {
                        console.log('insertEmployee');
                        return callback(err);
                    }
                    var employeeId = results.insertId;
                    callback(null, employeeId);
                });
            }

            //employee가 존재 한다면 update하기
            function updateEmployee(employeeId, callback) {
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
                var teamPosition = (plan.teamPosition === '조장') ? 3 : 4;
                dbConn.query(sql_update_employee, [plan.name, plan.email, plan.phoneNumber, info.teamId, teamPosition, info.departmentId, plan.departmentPosition, plan.equipmentName, employeeId], function(err) {
                    if (err) {
                        console.log('updateEmployee');
                        return callback(err);
                    }
                    callback(null);
                });
            }
        }

        //-----------
        // 계획서 설정
        //-----------
        function setReport(callback) {
            findReport(function(err, reportId) {
                if (err) {
                    return callback(err);
                }
                if (reportId === 0) { //report가 존재하지 않다면
                    insertReport(function(err) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null);
                    });
                } else { //report가 존재한다면
                    updateReport(reportId, function(err) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null);
                    });
                }
            });

            //리포트가 존재하는지 확인하기
            function findReport(callback) {
                //report가 있는지 확인하기
                var sql_select_report =
                    'SELECT id reportId ' +
                    'FROM report ' +
                    'WHERE employee_id = ? AND team_id = ? AND date = STR_TO_DATE(?, \'%Y-%m-%d\') AND type = 0';

                dbConn.query(sql_select_report, [info.employeeId, info.teamId, plan.date], function(err, results) {
                    if (err) {
                        console.log('findReport');
                        return callback(err);
                    }
                    if (results.length === 0) {
                        callback(null, 0);
                    } else {
                        var reportId = results[0].reportId;
                        callback(null, reportId);
                    }
                });
            }

            //리포트가 존재하지 않다면 insert하기
            function insertReport(callback) { //id(employeeId), teamId, callback함수를 매개변수로 받는다
                //report 가 없다면 insert하기
                var sql_insert_report =
                    'INSERT INTO report(employee_id, team_id, team_name, team_position, team_member, equipment_name, date, location, calls, car_number, car_type, car_manager, type) ' +
                    'VALUES(?, ?, ?, ?, ?, ?, STR_TO_DATE(?, \'%Y-%m-%d\'), ?, ?, ?, ?, ?, 0)';

                dbConn.query(sql_insert_report, [info.employeeId, info.teamId, plan.teamName + ' ' + plan.teamNo + '조', plan.teamPosition, plan.teamMember, plan.equipmentName, plan.date, plan.location, plan.calls, plan.carNumber, plan.carType, plan.carManager], function(err, results) {
                    if (err) {
                        console.log('insertReport');
                        return callback(err);
                    }
                    callback(null);
                });
            }

            //리포트가 존재한다면 업데이트하기
            function updateReport(reportId, callback) { //id(employeeId)와 teamId, callback함수를 매개변수로
                //report가 있다면 update하기
                var sql_update_report =
                    'UPDATE report ' +
                    'SET team_name = ?, team_position = ?, team_member = ?, equipment_name = ?, location = ?, calls = ?, car_number = ?, car_type = ?, car_manager = ? ' +
                    'WHERE id = ?';

                dbConn.query(sql_update_report, [plan.teamName + ' ' + plan.teamNo + '조', plan.teamPosition, plan.teamMember, plan.equipmentName, plan.location, plan.calls, plan.carNumber, plan.carType, plan.carManager, reportId], function(err) {
                    if (err) {
                        console.log('updateReport');
                        return callback(err);
                    }
                    callback(null);
                });
            }
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

    var sql_select_finish_info =
        'SELECT e.name, r.car_significant carSignificant, r.cause_of_incompletion causeOfIncompletion, r.plan_of_incompletion planOfIncompletion ' +
        'FROM team t JOIN report r ON (t.id = r.team_id) ' +
                    'JOIN employee e ON (e.id = r.employee_id) ' +
        'WHERE r.date = STR_TO_DATE(?, \'%Y-%m-%d\') AND r.type = 1 AND t.id = ?';

    var resData = {};
    resData.employees = [];
    resData.performances = [];
    resData.avgWorkDetails = [];
    resData.finishInfos = [];

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            dbConn.release();
            return callback(err);
        }
        async.parallel([getFinishInfo, getBasicInfoAndMeasureInfo, getMeasureObj, briefErrorInfo, measurePerPlan, getAvgWorkDetails], function(err, result) {
            if (err) {
               dbConn.release();
               return callback(err);
            }
            dbConn.release();
            callback(null, resData);
        });

        function getFinishInfo(callback) {
            dbConn.query(sql_select_finish_info, [reqData.date, reqData.teamId], function(err, results) {
                if (err) {
                    return callback(err);
                }
                for (var i = 0; i < results.length; i++) {
                    resData.finishInfos.push({
                        employeeName: results[i].name,
                        carSignificant: results[i].carSignificant || '미작성',
                        causeOfIncompletion: results[i].causeOfIncompletion || '미작성',
                        planOfIncompletion: results[i].planOfIncompletion || '미작성'
                    });
                }
                callback(null);
            });
        }

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
                    switch (results[i].carRefuelState) {
                        case 0:
                            resData.carRefuelState = '';
                            break;
                        case 1:
                            resData.carRefuelState = '하';
                            break;
                        case 2:
                            resData.carRefuelState = '중하';
                            break;
                        case 3:
                            resData.carRefuelState = '중';
                            break;
                        case 4:
                            resData.carRefuelState = '중상';
                            break;
                        case 5:
                            resData.carRefuelState = '상';
                            break;
                    }
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
        'SELECT a.teamId, a.teamName, a.teamNo, a.name teamLeader, b.equipmentError, b.programError, b.terminalError, b.carError, b.toolsError, b.sum, c.uploadError, c.compressionNameError, c.settingError, c.etcError, c.humanErrorSum, c.conversionError, c.serverError, c.segmentOmissionError, c.iqaErrorSum, c.compressionLiftError, c.etc, c.etcSum ' +
        'FROM(SELECT a.teamId, a.teamName, a.teamNo, b.name ' +
        'FROM(SELECT id teamId, name teamName, team_no teamNo ' +
        'FROM team t ' +
        'WHERE t.team_no > 0 ' +
        'GROUP BY t.id) a LEFT JOIN (SELECT name, team_position teamPosition, team_id teamId ' +
        'FROM employee ' +
        'WHERE team_position = 3) b ON(a.teamId = b.teamId)) a LEFT JOIN (SELECT r.date, t.id teamId, t.name, t.team_no, count(*) sum, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'장비오류\' THEN 1 ELSE 0 END) equipmentError, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'프로그램오류\' THEN 1 ELSE 0 END) programError, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'단말기오류\' THEN 1 ELSE 0 END) terminalError, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'측정차량\' THEN 1 ELSE 0 END) carError, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'부수기자재\' THEN 1 ELSE 0 END) toolsError ' +
        'FROM report r JOIN report_details rd ON(r.id = rd.report_id) ' +
        'JOIN team t ON(t.id = r.team_id) ' +
        'WHERE r.type = 1 AND r.date = STR_TO_DATE(?, \'%Y-%m-%d\') AND rd.type = 1 ' +
        'GROUP BY teamId) b ON (a.teamId = b.teamId) LEFT JOIN ((SELECT t.id teamId, SUM(CASE WHEN aee.name = \'업로드오류\' THEN 1 ELSE 0 END) uploadError, ' +
        'SUM(CASE WHEN aee.name = \'압축파일명오류\' THEN 1 ELSE 0 END) compressionNameError, ' +
        'SUM(CASE WHEN aee.name = \'Setting오류\' THEN 1 ELSE 0 END) settingError, ' +
        'SUM(CASE WHEN aee.name = \'기타오류\' THEN 1 ELSE 0 END) etcError, ' +
        'SUM(CASE WHEN aee.name = \'Conversion Error\' THEN 1 ELSE 0 END) conversionError, ' +
        'SUM(CASE WHEN aee.name = \'Server오류\' THEN 1 ELSE 0 END) serverError, ' +
        'SUM(CASE WHEN aee.name = \'Segment누락\' THEN 1 ELSE 0 END) segmentOmissionError, ' +
        'SUM(CASE WHEN aee.name = \'압축해제에러\' THEN 1 ELSE 0 END) compressionLiftError, ' +
        'SUM(CASE WHEN aee.name = \'기타\' THEN 1 ELSE 0 END) etc, ' +
        'SUM(CASE WHEN aee.type = 1 THEN 1 ELSE 0 END) humanErrorSum, ' +
        'SUM(CASE WHEN aee.type = 2 THEN 1 ELSE 0 END) iqaErrorSum, ' +
        'SUM(CASE WHEN aee.type = 3 THEN 1 ELSE 0 END) etcSum ' +
        'FROM team_analyst_error tae JOIN analyst_evaluation_error aee ON (tae.analyst_evaluation_error_id = aee.id) ' +
        'JOIN team t ON (t.id = tae.team_id) ' +
        'WHERE date = STR_TO_DATE(?, \'%Y-%m-%d\') ' +
        'GROUP BY t.id)) c ON (b.teamId = c.teamId) ' +
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
           dbConn.release();
           if (err) {
               return callback(err);
           }
           callback(null, resData);
       });

       function getErrorPerDay(dates, callback) {
           async.each(dates, function(date, callback) {
              dbConn.query(sql_select_error_statistics_per_day, [date, date], function(err, results) {
                 if (err) {
                     return callback(err);
                 }
                 var data = [];
                 for (var i = 0; i < results.length; i++) {
                     data.push({
                         teamId: results[i].teamId,
                         date: date,
                         teamName: results[i].teamName + ' ' + results[i].teamNo + '조',
                         teamLeader: results[i].teamLeader || '',
                         equipmentError: results[i].equipmentError || 0,
                         programError: results[i].programError || 0,
                         terminalError: results[i].terminalError || 0,
                         carError: results[i].carError || 0,
                         toolsError: results[i].toolsError || 0,
                         sum: results[i].sum || 0,
                         uploadError: results[i].uploadError || 0,
                         compressionNameError: results[i].compressionNameError || 0,
                         settingError: results[i].settingError || 0,
                         etcError: results[i].etcError || 0,
                         humanErrorSum: results[i].humanErrorSum || 0,
                         conversionError: results[i].conversionError || 0,
                         serverError: results[i].serverError || 0,
                         segmentOmissionError: results[i].segmentOmissionError || 0,
                         iqaErrorSum: results[i].iqaErrorSum || 0,
                         compressionLiftError: results[i].compressionLiftError || 0,
                         etc: results[i].etc || 0,
                         etcSum: results[i].etcSum || 0
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
function getErrorStatisticsPerWeek(callback) {
    //실제 측정 리포트가 있는 week들을 가져옴
    var sql_select_day = 'SELECT ' +
                         'DATE_FORMAT(DATE_SUB(date, INTERVAL (DAYOFWEEK(date) - 2) DAY), \'%Y-%m-%d\') startDay, ' +
                         'DATE_FORMAT(DATE_SUB(date, INTERVAL (DAYOFWEEK(date) - 8) DAY), \'%Y-%m-%d\') endDay ' +
                         'FROM report ' +
                         'WHERE type = 1 ' +
                         'GROUP BY startDay DESC';

    //week에 따라 에러사항 가져옴
    var sql_select_error_statistics_per_day =
        'SELECT a.teamId, a.teamName, a.teamNo, a.name teamLeader, b.equipmentError, b.programError, b.terminalError, b.carError, b.toolsError, b.sum ' +
        'FROM(SELECT a.teamId, a.teamName, a.teamNo, b.name ' +
        'FROM(SELECT id teamId, name teamName, team_no teamNo ' +
        'FROM team t ' +
        'WHERE t.team_no > 0 ' +
        'GROUP BY t.id) a LEFT JOIN (SELECT name, team_position teamPosition, team_id teamId ' +
        'FROM employee ' +
        'WHERE team_position = 3) b ON(a.teamId = b.teamId)) a LEFT JOIN (SELECT t.id teamId, t.name, t.team_no, count(*) sum, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'장비오류\' THEN 1 ELSE 0 END) equipmentError, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'프로그램오류\' THEN 1 ELSE 0 END) programError, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'단말기오류\' THEN 1 ELSE 0 END) terminalError, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'측정차량\' THEN 1 ELSE 0 END) carError, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'부수기자재\' THEN 1 ELSE 0 END) toolsError ' +
        'FROM report r JOIN report_details rd ON(r.id = rd.report_id) ' +
        'JOIN team t ON(t.id = r.team_id) ' +
        'WHERE r.type = 1 AND r.date BETWEEN STR_TO_DATE(?, \'%Y-%m-%d\') AND STR_TO_DATE(?, \'%Y-%m-%d\') AND rd.type = 1 ' +
        'GROUP BY teamId) b ON (a.teamId = b.teamId) ' +
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
                    dates.push({
                        startDay: results[i].startDay,
                        endDay: results[i].endDay
                    });
                }
                callback(null, dates);
            });
        }, getErrorPerWeek
        ], function(err, result) {
            if (err) {
                return callback(err);
            }
            callback(null, resData);
        });

        function getErrorPerWeek(dates, callback) {
            async.each(dates, function(date, callback) {
                var dateObj = new Date();
                var today = dateObj.getFullYear() + '-' + (dateObj.getMonth() + 1) + '-' + dateObj.getDate();
                var endDay = date.endDay.split('-');
                if ((endDay[0] >= dateObj.getFullYear()) && (endDay[1] >= dateObj.getMonth() + 1) && (endDay[2] >= dateObj.getDate())) {
                    date.endDay = today;
                }

                var week = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
                var dayOfweek = week[dateObj.getDay()];

                dbConn.query(sql_select_error_statistics_per_day, [date.startDay, date.endDay], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    var data = [];
                    for (var i = 0; i < results.length; i++) {
                        var week;
                        if (date.endDay === today) {
                            week = date.startDay + '(월요일)' + ' ~ ' + date.endDay + '(' + dayOfweek + ')';
                        } else {
                            week = date.startDay + '(월요일)' + ' ~ ' + date.endDay + '(일요일)';
                        }
                        data.push({
                            startDay: date.startDay,
                            endDay: date.endDay,
                            week: week,
                            teamId: results[i].teamId,
                            teamName: results[i].teamName + ' ' + results[i].teamNo + '조',
                            teamLeader: results[i].teamLeader || '',
                            equipmentError: results[i].equipmentError || 0,
                            programError: results[i].programError || 0,
                            terminalError: results[i].terminalError || 0,
                            carError: results[i].carError || 0,
                            toolsError: results[i].toolsError || 0,
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

//월별 에러 통계
function getErrorStatisticsPerMonth(callback) {
    //실제 측정 리포트가 있는 날짜들을 가져옴
    var sql_select_month =
        'SELECT DISTINCT YEAR(date) year, MONTH(date) month ' +
        'FROM report ' +
        'WHERE type = 1 ' +
        'ORDER BY MONTH(date) DESC';

    //날짜에 따라 에러사항 가져옴
    var sql_select_error_statistics_per_month =
        'SELECT a.teamId, a.teamName, a.teamNo, a.name teamLeader, b.equipmentError, b.programError, b.terminalError, b.carError, b.toolsError, b.sum ' +
        'FROM(SELECT a.teamId, a.teamName, a.teamNo, b.name ' +
        'FROM(SELECT id teamId, name teamName, team_no teamNo ' +
        'FROM team t ' +
        'WHERE t.team_no > 0 ' +
        'GROUP BY t.id) a LEFT JOIN (SELECT name, team_position teamPosition, team_id teamId ' +
        'FROM employee ' +
        'WHERE team_position = 3) b ON(a.teamId = b.teamId)) a LEFT JOIN (SELECT t.id teamId, t.name, t.team_no, count(*) sum, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'장비오류\' THEN 1 ELSE 0 END) equipmentError, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'프로그램오류\' THEN 1 ELSE 0 END) programError, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'단말기오류\' THEN 1 ELSE 0 END) terminalError, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'측정차량\' THEN 1 ELSE 0 END) carError, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'부수기자재\' THEN 1 ELSE 0 END) toolsError ' +
        'FROM report r JOIN report_details rd ON(r.id = rd.report_id) ' +
        'JOIN team t ON(t.id = r.team_id) ' +
        'WHERE r.type = 1 AND YEAR(r.date) = ? AND MONTH(r.date) = ? AND rd.type = 1    ' +
        'GROUP BY teamId) b ON (a.teamId = b.teamId) ' +
        'ORDER BY a.teamId';

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }

        var resData = [];

        async.waterfall([function(callback) {
            dbConn.query(sql_select_month, [], function(err, results) {
                if (err) {
                    return callback(err);
                }
                var months = [];
                for(var i = 0; i < results.length; i++) {
                    months.push({
                        year: results[i].year,
                        month: results[i].month
                    });
                }
                callback(null, months);
            });
        }, getErrorPerDay
        ], function(err, result) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            callback(null, resData);
        });

        function getErrorPerDay(months, callback) {
            async.each(months, function(month, callback) {
                dbConn.query(sql_select_error_statistics_per_month, [month.year, month.month], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    var data = [];
                    for (var i = 0; i < results.length; i++) {
                        data.push({
                            teamId: results[i].teamId,
                            year: month.year,
                            month: month.month,
                            teamName: results[i].teamName + ' ' + results[i].teamNo + '조',
                            teamLeader: results[i].teamLeader || '',
                            equipmentError: results[i].equipmentError || 0,
                            programError: results[i].programError || 0,
                            terminalError: results[i].terminalError || 0,
                            carError: results[i].carError || 0,
                            toolsError: results[i].toolsError || 0,
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

//분기별 에러 통계
function getErrorStatisticsPerQuarter(callback) {
    //실제 측정 리포트가 있는 날짜들을 가져옴
    var sql_select_month =
        'SELECT DISTINCT YEAR(date) year, QUARTER(date) quarter ' +
        'FROM report ' +
        'WHERE type = 1 ' +
        'ORDER BY QUARTER(date) DESC';

    //날짜에 따라 에러사항 가져옴
    var sql_select_error_statistics_per_month =
        'SELECT a.teamId, a.teamName, a.teamNo, a.name teamLeader, b.equipmentError, b.programError, b.terminalError, b.carError, b.toolsError, b.sum ' +
        'FROM(SELECT a.teamId, a.teamName, a.teamNo, b.name ' +
        'FROM(SELECT id teamId, name teamName, team_no teamNo ' +
        'FROM team t ' +
        'WHERE t.team_no > 0 ' +
        'GROUP BY t.id) a LEFT JOIN (SELECT name, team_position teamPosition, team_id teamId ' +
        'FROM employee ' +
        'WHERE team_position = 3) b ON(a.teamId = b.teamId)) a LEFT JOIN (SELECT t.id teamId, t.name, t.team_no, count(*) sum, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'장비오류\' THEN 1 ELSE 0 END) equipmentError, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'프로그램오류\' THEN 1 ELSE 0 END) programError, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'단말기오류\' THEN 1 ELSE 0 END) terminalError, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'측정차량\' THEN 1 ELSE 0 END) carError, ' +
        'SUM(CASE WHEN rd.obstacle_classification = \'부수기자재\' THEN 1 ELSE 0 END) toolsError ' +
        'FROM report r JOIN report_details rd ON(r.id = rd.report_id) ' +
        'JOIN team t ON(t.id = r.team_id) ' +
        'WHERE r.type = 1 AND YEAR(r.date) = ? AND quarter(r.date) = ? AND rd.type = 1 ' +
        'GROUP BY teamId) b ON (a.teamId = b.teamId) ' +
        'ORDER BY a.teamId';


    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        var resData = [];
        async.waterfall([function(callback) {
            dbConn.query(sql_select_month, [], function(err, results) {
                if (err) {
                    return callback(err);
                }
                var quarters = [];
                for(var i = 0; i < results.length; i++) {
                    quarters.push({
                        year: results[i].year,
                        quarter: results[i].quarter
                    });
                }
                callback(null, quarters);
            });
        }, getErrorPerDay
        ], function(err, result) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            callback(null, resData);
        });

        function getErrorPerDay(quarters, callback) {
            async.each(quarters, function(quarter, callback) {
                dbConn.query(sql_select_error_statistics_per_month, [quarter.year, quarter.quarter], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    var data = [];
                    for (var i = 0; i < results.length; i++) {
                        data.push({
                            teamId: results[i].teamId,
                            year: quarter.year,
                            quarter: quarter.quarter,
                            teamName: results[i].teamName + ' ' + results[i].teamNo + '조',
                            teamLeader: results[i].teamLeader || '',
                            equipmentError: results[i].equipmentError || 0,
                            programError: results[i].programError || 0,
                            terminalError: results[i].terminalError || 0,
                            carError: results[i].carError || 0,
                            toolsError: results[i].toolsError || 0,
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

//일별 에러 통계의 자세한 에러 사항 보기
function getDetailErrorStatePerDay(reqData, callback) {
    var sql_detail_error_state =
        'SELECT date_format(r.date, \'%Y-%m-%d\') date, t.name teamName, t.team_no teamNo, a.name teamLeader, e.name, e.team_position teamPosition, rd.work_details workDetails, rd.obstacle_classification obstacleClassification, rd.obstacle_details obstacleDetails, rd.obstacle_start_time obstacleStartTime, rd.obstacle_end_time obstacleEndTime, rd.obstacle_phenomenon obstaclePhenomenon, rd.obstacle_result obstacleResult ' +
        'FROM team t JOIN report r ON (t.id = r.team_id) ' +
        'JOIN report_details rd ON (rd.report_id = r.id) ' +
        'JOIN employee e ON (e.id = r.employee_id) ' +
        'JOIN (SELECT e.name, t.id ' +
        'FROM employee e JOIN team t ON(e.team_id = t.id) ' +
        'WHERE t.id = ? AND e.team_position = 3) a ON (t.id = a.id) ' +
        'WHERE r.type = 1 AND t.id = ? AND r.date = STR_TO_DATE(?, \'%Y-%m-%d\') AND rd.type = 1 AND rd.obstacle_classification = ? ' +
        'ORDER BY obstacleStartTime';

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_detail_error_state, [reqData.teamId, reqData.teamId, reqData.date, reqData.obstacleClassification], function(err, results) {
            dbConn.release();
            if (err) {
               return callback(err);
           }
           var resData = [];
           for (var i = 0; i < results.length; i++) {
               resData.push({
                   date: results[i].date,
                   teamName: results[i].teamName + ' ' + results[i].teamNo + '조',
                   teamLeader: results[i].teamLeader,
                   errorGenerator: results[i].name,
                   teamPosition: results[i].teamPosition,
                   workDetails: results[i].workDetails,
                   obstacleClassification: results[i].obstacleClassification || '',
                   obstacleDetails: results[i].obstacleDetails || '',
                   obstacleTime: (results[i].obstacleStartTime || '') + ' ~ ' + (results[i].obstacleEndTime || ''),
                   obstaclePhenomenon: results[i].obstaclePhenomenon || '',
                   obstacleResult: results[i].obstacleResult || ''
               });
           }
           callback(null, resData);
        });
    });
}

//주별 에러 통계의 자세한 에러 사항 보기
function getDetailErrorStatePerWeek(reqData, callback) {
    var sql_detail_error_state =
        'SELECT date_format(r.date, \'%Y-%m-%d\') date, t.name teamName, t.team_no teamNo, a.name teamLeader, e.name, e.team_position teamPosition, rd.work_details workDetails, rd.obstacle_classification obstacleClassification, rd.obstacle_details obstacleDetails, rd.obstacle_start_time obstacleStartTime, rd.obstacle_end_time obstacleEndTime, rd.obstacle_phenomenon obstaclePhenomenon, rd.obstacle_result obstacleResult ' +
        'FROM team t JOIN report r ON (t.id = r.team_id) ' +
        'JOIN report_details rd ON (rd.report_id = r.id) ' +
        'JOIN employee e ON (e.id = r.employee_id) ' +
        'JOIN (SELECT e.name, t.id ' +
        'FROM employee e JOIN team t ON(e.team_id = t.id) ' +
        'WHERE t.id = ? AND e.team_position = 3) a ON (t.id = a.id) ' +
        'WHERE r.type = 1 AND t.id = ? AND r.date BETWEEN STR_TO_DATE(?, \'%Y-%m-%d\') AND STR_TO_DATE(?, \'%Y-%m-%d\') AND rd.type = 1 AND rd.obstacle_classification = ? ' +
        'ORDER BY date DESC';

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_detail_error_state, [reqData.teamId, reqData.teamId, reqData.startDay, reqData.endDay, reqData.obstacleClassification], function(err, results) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            var resData = [];
            for (var i = 0; i < results.length; i++) {
                resData.push({
                    date: results[i].date,
                    teamName: results[i].teamName + ' ' + results[i].teamNo + '조',
                    teamLeader: results[i].teamLeader,
                    errorGenerator: results[i].name,
                    teamPosition: results[i].teamPosition,
                    workDetails: results[i].workDetails,
                    obstacleClassification: results[i].obstacleClassification || '',
                    obstacleDetails: results[i].obstacleDetails || '',
                    obstacleTime: (results[i].obstacleStartTime || '') + ' ~ ' + (results[i].obstacleEndTime || ''),
                    obstaclePhenomenon: results[i].obstaclePhenomenon || '',
                    obstacleResult: results[i].obstacleResult || ''
                });
            }
            callback(null, resData);
        });
    });
}

//월별 에러 통계의 자세한 에러 사항 보기
function getDetailErrorStatePerMonth(reqData, callback) {
    var sql_detail_error_state =
        'SELECT date_format(r.date, \'%Y-%m-%d\') date, t.name teamName, t.team_no teamNo, a.name teamLeader, e.name, e.team_position teamPosition, rd.work_details workDetails, rd.obstacle_classification obstacleClassification, rd.obstacle_details obstacleDetails, rd.obstacle_start_time obstacleStartTime, rd.obstacle_end_time obstacleEndTime, rd.obstacle_phenomenon obstaclePhenomenon, rd.obstacle_result obstacleResult ' +
        'FROM team t JOIN report r ON (t.id = r.team_id) ' +
        'JOIN report_details rd ON (rd.report_id = r.id) ' +
        'JOIN employee e ON (e.id = r.employee_id) ' +
        'JOIN (SELECT e.name, t.id ' +
        'FROM employee e JOIN team t ON(e.team_id = t.id) ' +
        'WHERE t.id = ? AND e.team_position = 3) a ON (t.id = a.id) ' +
        'WHERE r.type = 1 AND t.id = ? AND YEAR(r.date) = ? AND MONTH(r.date) = ? AND rd.type = 1 AND rd.obstacle_classification = ? ' +
        'ORDER BY date DESC';

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_detail_error_state, [reqData.teamId, reqData.teamId, reqData.year, reqData.month, reqData.obstacleClassification], function(err, results) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            var resData = [];
            for (var i = 0; i < results.length; i++) {
                resData.push({
                    date: results[i].date,
                    teamName: results[i].teamName + ' ' + results[i].teamNo + '조',
                    teamLeader: results[i].teamLeader,
                    errorGenerator: results[i].name,
                    teamPosition: results[i].teamPosition,
                    workDetails: results[i].workDetails,
                    obstacleClassification: results[i].obstacleClassification || '',
                    obstacleDetails: results[i].obstacleDetails || '',
                    obstacleTime: (results[i].obstacleStartTime || '') + ' ~ ' + (results[i].obstacleEndTime || ''),
                    obstaclePhenomenon: results[i].obstaclePhenomenon || '',
                    obstacleResult: results[i].obstacleResult || ''
                });
            }
            callback(null, resData);
        });
    });
}

//분기별 에러 통계의 자세한 에러 사항 보기
function getDetailErrorStatePerQuarter(reqData, callback) {
    var sql_detail_error_state =
        'SELECT date_format(r.date, \'%Y-%m-%d\') date, t.name teamName, t.team_no teamNo, a.name teamLeader, e.name, e.team_position teamPosition, rd.work_details workDetails, rd.obstacle_classification obstacleClassification, rd.obstacle_details obstacleDetails, rd.obstacle_start_time obstacleStartTime, rd.obstacle_end_time obstacleEndTime, rd.obstacle_phenomenon obstaclePhenomenon, rd.obstacle_result obstacleResult ' +
        'FROM team t JOIN report r ON (t.id = r.team_id) ' +
        'JOIN report_details rd ON (rd.report_id = r.id) ' +
        'JOIN employee e ON (e.id = r.employee_id) ' +
        'JOIN (SELECT e.name, t.id ' +
        'FROM employee e JOIN team t ON(e.team_id = t.id) ' +
        'WHERE t.id = ? AND e.team_position = 3) a ON (t.id = a.id) ' +
        'WHERE r.type = 1 AND t.id = ? AND YEAR(r.date) = ? AND quarter(r.date) = ? AND rd.type = 1 AND rd.obstacle_classification = ? ' +
        'ORDER BY date DESC';

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_detail_error_state, [reqData.teamId, reqData.teamId, reqData.year, reqData.quarter, reqData.obstacleClassification], function(err, results) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            var resData = [];
            for (var i = 0; i < results.length; i++) {
                resData.push({
                    date: results[i].date,
                    teamName: results[i].teamName + ' ' + results[i].teamNo + '조',
                    teamLeader: results[i].teamLeader,
                    errorGenerator: results[i].name,
                    teamPosition: results[i].teamPosition,
                    workDetails: results[i].workDetails,
                    obstacleClassification: results[i].obstacleClassification || '',
                    obstacleDetails: results[i].obstacleDetails || '',
                    obstacleTime: (results[i].obstacleStartTime || '') + ' ~ ' + (results[i].obstacleEndTime || ''),
                    obstaclePhenomenon: results[i].obstaclePhenomenon || '',
                    obstacleResult: results[i].obstacleResult || ''
                });
            }
            callback(null, resData);
        });
    });
}

//월별 차량 상태
function getCarState(callback) {
    //리포트의 년과 월을 가져온다.
    var select_reports_year_and_month =
        'SELECT DISTINCT year(date) year, month(date) month ' +
        'FROM report ' +
        'WHERE type = 1 ' +
        'ORDER BY date DESC';

    //년과 월을 통해 마지막 날짜를 구함
    var select_last_day_of_month =
        'SELECT DAYOFMONTH(LAST_DAY(STR_TO_DATE(?, \'%Y-%m\'))) lastDay';

    //년 월을 통해 차량 탑승팀 구하기
    var select_team_and_cars_by_date = "SELECT "+
                                        "DISTINCT car_type carType,car_number carNumber, "+
                                        "CASE WHEN DAY(date) = 1 THEN team_name ELSE NULL END day1, "+
                                        "CASE WHEN DAY(date) = 2 THEN team_name ELSE NULL END day2, "+
                                        "CASE WHEN DAY(date) = 3 THEN team_name ELSE NULL END day3, "+
                                        "CASE WHEN DAY(date) = 4 THEN team_name ELSE NULL END day4, "+
                                        "CASE WHEN DAY(date) = 5 THEN team_name ELSE NULL END day5, "+
                                        "CASE WHEN DAY(date) = 6 THEN team_name ELSE NULL END day6, "+
                                        "CASE WHEN DAY(date) = 7 THEN team_name ELSE NULL END day7, "+
                                        "CASE WHEN DAY(date) = 8 THEN team_name ELSE NULL END day8, "+
                                        "CASE WHEN DAY(date) = 9 THEN team_name ELSE NULL END day9, "+
                                        "CASE WHEN DAY(date) = 10 THEN team_name ELSE NULL END day10, "+
                                        "CASE WHEN DAY(date) = 11 THEN team_name ELSE NULL END day11, "+
                                        "CASE WHEN DAY(date) = 12 THEN team_name ELSE NULL END day12, "+
                                        "CASE WHEN DAY(date) = 13 THEN team_name ELSE NULL END day13, "+
                                        "CASE WHEN DAY(date) = 14 THEN team_name ELSE NULL END day14, "+
                                        "CASE WHEN DAY(date) = 15 THEN team_name ELSE NULL END day15, "+
                                        "CASE WHEN DAY(date) = 16 THEN team_name ELSE NULL END day16, "+
                                        "CASE WHEN DAY(date) = 17 THEN team_name ELSE NULL END day17, "+
                                        "CASE WHEN DAY(date) = 18 THEN team_name ELSE NULL END day18, "+
                                        "CASE WHEN DAY(date) = 19 THEN team_name ELSE NULL END day19, "+
                                        "CASE WHEN DAY(date) = 20 THEN team_name ELSE NULL END day20, "+
                                        "CASE WHEN DAY(date) = 21 THEN team_name ELSE NULL END day21, "+
                                        "CASE WHEN DAY(date) = 22 THEN team_name ELSE NULL END day22, "+
                                        "CASE WHEN DAY(date) = 23 THEN team_name ELSE NULL END day23, "+
                                        "CASE WHEN DAY(date) = 24 THEN team_name ELSE NULL END day24, "+
                                        "CASE WHEN DAY(date) = 25 THEN team_name ELSE NULL END day25, "+
                                        "CASE WHEN DAY(date) = 26 THEN team_name ELSE NULL END day26, "+
                                        "CASE WHEN DAY(date) = 27 THEN team_name ELSE NULL END day27, "+
                                        "CASE WHEN DAY(date) = 28 THEN team_name ELSE NULL END day28, "+
                                        "CASE WHEN DAY(date) = 29 THEN team_name ELSE NULL END day29, "+
                                        "CASE WHEN DAY(date) = 30 THEN team_name ELSE NULL END day30, "+
                                        "CASE WHEN DAY(date) = 31 THEN team_name ELSE NULL END day31 "+
                                        "FROM report "+
                                        "WHERE type = 1 AND Year(date) = ? AND MONTH(date) = ? ";
    /* var select_team_and_cars_by_date =
         'SELECT a.carType, a.carNumber, b.day1, b.day2, b.day3, b.day4, b.day5, b.day6, b.day7, b.day8, b.day9, b.day10, b.day11, b.day12, b.day13, b.day14, b.day15, b.day16, b.day17, b.day18, b.day19, b.day20, b.day21, b.day22, b.day23, b.day24, b.day25, b.day26, b.day27, b.day28, b.day29, b.day30, b.day31 ' +
         'FROM(SELECT DISTINCT car_type carType, car_number carNumber ' +
         'FROM ' +
         'report ' +
         'WHERE Year(date) = ? AND MONTH(date) = ?) a LEFT JOIN (SELECT DISTINCT team_name teamName, team_member teamMember, car_type carType, car_number carNumber, ' +
         'CASE WHEN DAY(date) = 1 THEN team_name ELSE NULL END day1, ' +
         'CASE WHEN DAY(date) = 2 THEN team_name ELSE NULL END day2, ' +
         'CASE WHEN DAY(date) = 3 THEN team_name ELSE NULL END day3, ' +
         'CASE WHEN DAY(date) = 4 THEN team_name ELSE NULL END day4, ' +
         'CASE WHEN DAY(date) = 5 THEN team_name ELSE NULL END day5, ' +
         'CASE WHEN DAY(date) = 6 THEN team_name ELSE NULL END day6, ' +
         'CASE WHEN DAY(date) = 7 THEN team_name ELSE NULL END day7, ' +
         'CASE WHEN DAY(date) = 8 THEN team_name ELSE NULL END day8, ' +
         'CASE WHEN DAY(date) = 9 THEN team_name ELSE NULL END day9, ' +
         'CASE WHEN DAY(date) = 10 THEN team_name ELSE NULL END day10, ' +
         'CASE WHEN DAY(date) = 11 THEN team_name ELSE NULL END day11, ' +
         'CASE WHEN DAY(date) = 12 THEN team_name ELSE NULL END day12, ' +
         'CASE WHEN DAY(date) = 13 THEN team_name ELSE NULL END day13, ' +
         'CASE WHEN DAY(date) = 14 THEN team_name ELSE NULL END day14, ' +
         'CASE WHEN DAY(date) = 15 THEN team_name ELSE NULL END day15, ' +
         'CASE WHEN DAY(date) = 16 THEN team_name ELSE NULL END day16, ' +
         'CASE WHEN DAY(date) = 17 THEN team_name ELSE NULL END day17, ' +
         'CASE WHEN DAY(date) = 18 THEN team_name ELSE NULL END day18, ' +
         'CASE WHEN DAY(date) = 19 THEN team_name ELSE NULL END day19, ' +
         'CASE WHEN DAY(date) = 20 THEN team_name ELSE NULL END day20, ' +
         'CASE WHEN DAY(date) = 21 THEN team_name ELSE NULL END day21, ' +
         'CASE WHEN DAY(date) = 22 THEN team_name ELSE NULL END day22, ' +
         'CASE WHEN DAY(date) = 23 THEN team_name ELSE NULL END day23, ' +
         'CASE WHEN DAY(date) = 24 THEN team_name ELSE NULL END day24, ' +
         'CASE WHEN DAY(date) = 25 THEN team_name ELSE NULL END day25, ' +
         'CASE WHEN DAY(date) = 26 THEN team_name ELSE NULL END day26, ' +
         'CASE WHEN DAY(date) = 27 THEN team_name ELSE NULL END day27, ' +
         'CASE WHEN DAY(date) = 28 THEN team_name ELSE NULL END day28, ' +
         'CASE WHEN DAY(date) = 29 THEN team_name ELSE NULL END day29, ' +
         'CASE WHEN DAY(date) = 30 THEN team_name ELSE NULL END day30, ' +
         'CASE WHEN DAY(date) = 31 THEN team_name ELSE NULL END day31, date ' +
         'FROM report ' +
         'WHERE type = 1 AND Year(date) = ? AND MONTH(date) = ?) b ON (a.carNumber = b.carNumber) ' +
         'ORDER BY a.carNumber';*/

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        async.waterfall([getYearAndMonth, getLastDay, getCarAndTeamInfo], function(err, result) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            callback(null, result);
        });

        function getYearAndMonth(callback) {
            dbConn.query(select_reports_year_and_month, [], function(err, results) {
                if (err) {
                    callback(err);
                }
                var resDatas = [];
                for (var i = 0; i < results.length; i++) {
                    resDatas.push({
                        year: results[i].year,
                        month: results[i].month,
                        lastDay: '',
                        dayDatas: []
                    });
                }
                callback(null, resDatas);
            });
        }

        function getLastDay(resDatas, callback) {
            async.each(resDatas, function(data, callback) {
                dbConn.query(select_last_day_of_month, [data.year + '-' + data.month], function(err, results) {
                    if (err) {
                        callback(err);
                    }
                    data.lastDay = results[0].lastDay;
                    callback();
                });
            }, function(err) {
                if (err) {
                    return callback(err);
                }
                callback(null, resDatas);
            });
        }

        function getCarAndTeamInfo(resDatas, callback) {

            async.each(resDatas, function(data, callback) {
                dbConn.query(select_team_and_cars_by_date, [data.year, data.month], function(err, results) {
                    if (err) {
                        callback(err);
                    }
                    for (var i = 0; i < results.length; i++) {
                        var index = findWithAttr(data.dayDatas, 'carNumber', results[i].carNumber);
                        if (index === -1) { //배열에 그 car가 없을 때
                            data.dayDatas.push({
                                carType: results[i].carType,
                                carNumber: results[i].carNumber,
                                day1: results[i].day1,
                                day2: results[i].day2,
                                day3: results[i].day3,
                                day4: results[i].day4,
                                day5: results[i].day5,
                                day6: results[i].day6,
                                day7: results[i].day7,
                                day8: results[i].day8,
                                day9: results[i].day9,
                                day10: results[i].day10,
                                day11: results[i].day11,
                                day12: results[i].day12,
                                day13: results[i].day13,
                                day14: results[i].day14,
                                day15: results[i].day15,
                                day16: results[i].day16,
                                day17: results[i].day17,
                                day18: results[i].day18,
                                day19: results[i].day19,
                                day20: results[i].day20,
                                day21: results[i].day21,
                                day22: results[i].day22,
                                day23: results[i].day23,
                                day24: results[i].day24,
                                day25: results[i].day25,
                                day26: results[i].day26,
                                day27: results[i].day27,
                                day28: results[i].day28,
                                day29: results[i].day29,
                                day30: results[i].day30,
                                day31: results[i].day31
                            });
                        } else { //배열 속에 이미 car가 있을 때
                            for (var j = 1; j <= 31; j++) {
                                var day = 'day' + j;
                                if (!data.dayDatas[index][day]) {
                                    data.dayDatas[index][day] = results[i][day];
                                }
                            }
                        }
                    }
                    callback();
                });
            }, function(err, result) {
                if (err) {
                    return callback(err);
                }
                callback(null, resDatas);
            });
        }
    });
}

//월별 차량 자세한 정보
function getDetailCarState(reqData, callback) {
    var select_detail_car_state =
        'SELECT a.teamName, b.teamLeader, a.teamMember, a.work_details, a.startTime, a.endTime, a.location1, a.location2, a.target1, a.target2, a.carType, a.carNumber, a.carMileageBefore, a.carMileageAfter, a.carRefuelState, a.refuelingPrice, a.carSignificant ' +
        'FROM(SELECT DISTINCT r.team_name teamName, r.team_member teamMember, rd.work_details, rd.start_time startTime, rd.end_time endTime, r.location location1, rd.location location2, rd.target1, rd.target2, car_type carType, car_number carNumber, car_manager carManager, car_mileage_before carMileageBefore, car_mileage_after carMileageAfter, car_refuel_state carRefuelState, car_significant carSignificant, refueling_price refuelingPrice ' +
        'FROM report r LEFT JOIN report_details rd ON (r.id = rd.report_id) ' +
        'WHERE r.type = 1 AND r.team_position = \'조장\' AND r.team_name = ? AND r.date = str_to_date(?, \'%Y-%m-%d\') ' +
        'ORDER BY rd.start_time) a JOIN(SELECT e.name teamLeader, r.team_name teamName ' +
        'FROM report r JOIN employee e ON(r.employee_id = e.id) ' +
        'WHERE type = 0 AND r.team_name = ? AND r.date = str_to_date(?, \'%Y-%m-%d\') AND r.team_position = \'조장\') b ON (a.teamName = b.teamName) ' +
        'WHERE work_details NOT IN (103) ' +
        'ORDER BY a.startTime';

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(select_detail_car_state, [reqData.teamName, reqData.date, reqData.teamName, reqData.date], function(err, results) {
            if (err) {
                return callback(err);
            }
            var resData = {};
            if (!results) {
                resData.code = 0;
                return callback(null, resData);
            }
            resData.code = 1;
            resData.date = reqData.date;
            resData.teamName = results[0].teamName || '미작성';
            resData.teamLeader = results[0].teamLeader || '미작성';
            resData.teamMember = results[0].teamMember || '미작성';
            resData.carType = results[0].carType || '미작성';
            resData.carNumber = results[0].carNumber || '미작성';
            resData.carMileageBefore = results[0].carMileageBefore || '미작성';
            resData.carMileageAfter = results[0].carMileageAfter || '미작성';
            resData.carRefuelState = results[0].carRefuelState || '미작성';
            resData.refuelingPrice = results[0].refuelingPrice || '미작성';
            resData.carSignificant = results[0].carSignificant || '미작성';
            resData.carDriveInfo = [];
            for(var i = 0; i < results.length; i++) {
                resData.carDriveInfo.push({
                    time: (results[i].startTime || '') + ' ~ ' + (results[i].endTime || ''),
                    location: (results[i].location1 || '') + ' ' + (results[i].location2 || '') + ' ' + (results[i].target1 || '')
                });
            }
            callback(null, resData);
        });
    })
}

//일별 콜수 정보
function getCallsPerDay(callback) {
    var select_day =
        'SELECT DISTINCT(DATE_FORMAT(date, \'%Y-%m-%d\')) date ' +
        'FROM report ' +
        'WHERE type = 1 ' +
        'ORDER BY date DESC';

    var select_calls_info =
        'SELECT a.teamId, a.teamName, a.teamNo, a.name teamLeader, b.teamMember teamMember, b.name measurer, b.equipmentName, b.planCalls, b.realCalls ' +
        'FROM(SELECT a.teamId, a.teamName, a.teamNo, b.name ' +
        'FROM(SELECT id teamId, name teamName, team_no teamNo ' +
        'FROM team t ' +
        'WHERE t.team_no > 0 ' +
        'GROUP BY t.id) a LEFT JOIN (SELECT name, team_position teamPosition, team_id teamId ' +
        'FROM employee ' +
        'WHERE team_position = 3) b ON(a.teamId = b.teamId)) a LEFT JOIN (SELECT a.team_id teamId, a.team_member teamMember, a.name, a.equipment_name equipmentName, a.calls planCalls, realCalls ' +
        'FROM(SELECT e.id employeeId, r.team_id, r.team_member, e.id, e.name, r.equipment_name, r.calls ' +
        'FROM report r JOIN employee e ON(r.employee_id = e.id) ' +
        'WHERE date = str_to_date(?, \'%Y-%m-%d\') AND type = 0) a LEFT JOIN (SELECT e.id employeeId, r.team_id, r.equipment_name, sum(rd.calls) realCalls ' +
        'FROM report r JOIN employee e ON(r.employee_id = e.id) ' +
        'JOIN report_details rd ON(r.id = rd.report_id) ' +
        'WHERE r.date = str_to_date(?, \'%Y-%m-%d\') AND r.type = 1 ' +
        'GROUP BY r.id) b ON (a.employeeId = b.employeeId)) b ON (a.teamId = b.teamId)';

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        var resData = [];

        async.waterfall([getDays, getCallsInfo], function(err, results) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            if (results === 0) {
                return callback(null, 0);
            }
            callback(null, resData);
        });

        function getDays(callback) {
            dbConn.query(select_day, [], function(err, results) {
                if (err) {
                    return callback(err);
                }
                var dates = [];
                if (!results) { //리포트가 없을 경우
                    return callback(err, 0);
                } else { //리포트가 있을 경우
                    for(var i = 0; i < results.length; i++) {
                        dates.push(results[i].date);
                    }
                    callback(null, dates);
                }
            });
        }

        function getCallsInfo(dates, callback) {
            if (dates === 0) {
                return callback(null, 0);
            } else {
                async.each(dates, function(date, callback) {
                    dbConn.query(select_calls_info, [date, date], function(err, results) {
                        if (err) {
                            callback(err);
                        }
                        var callsInfo = {};
                        callsInfo.date = date;
                        callsInfo.teams = [];
                        for (var i = 0; i < results.length; i++) {
                            var index = findWithAttr(callsInfo.teams, 'teamId', results[i].teamId);
                            if (index === -1) { //팀 배열에 팀이 없다면
                                var team ={};
                                team.measureInfo = [];
                                team.teamId = results[i].teamId;
                                team.teamName = results[i].teamName + ' ' + results[i].teamNo + '조';
                                team.teamLeader = results[i].teamLeader;
                                team.teamMember = results[i].teamMember || '계획서 미업로드';
                                var measureInfo = {};
                                measureInfo.measurer = results[i].measurer;
                                measureInfo.equipmentName = results[i].equipmentName;
                                measureInfo.planCalls = results[i].planCalls;
                                measureInfo.realCalls = results[i].realCalls;
                                team.measureInfo.push(measureInfo);
                                callsInfo.teams.push(team);
                            } else { //팀 배열에 이미 팀이 있다면
                                var measureInfo = {};
                                measureInfo.measurer = results[i].measurer;
                                measureInfo.equipmentName = results[i].equipmentName;
                                measureInfo.planCalls = results[i].planCalls;
                                measureInfo.realCalls = results[i].realCalls;
                                callsInfo.teams[index].measureInfo.push(measureInfo);
                            }

                        }
                        resData.push(callsInfo);
                        callback();
                    });
                }, function(err, result) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null);
                });
            }
        }
    });
}

//월별 콜수 정보
function getCallsPerMonth(callback) {

}

//객체가 가지고있는 프로퍼티의 값을 통해서 그 객체가 배열의 몇번째에 있는지 찾는 함수
function findWithAttr(array, attr, value) {
    for(var i = 0; i < array.length; i += 1) {
        if(array[i][attr] === value) {
            return i;
        }
    }
    return -1;
}


module.exports.reportList = reportList;
module.exports.addReport = addReport;
module.exports.newReport = newReport;
module.exports.confirm = confirm;
module.exports.confirmEdit = confirmEdit;
module.exports.confirmInsert = confirmInsert;
module.exports.confirmUpdate = confirmUpdate;
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
module.exports.getDetailErrorStatePerDay = getDetailErrorStatePerDay;
module.exports.getDetailErrorStatePerWeek = getDetailErrorStatePerWeek;
module.exports.getDetailErrorStatePerMonth = getDetailErrorStatePerMonth;
module.exports.getDetailErrorStatePerQuarter = getDetailErrorStatePerQuarter;
module.exports.getCarState = getCarState;
module.exports.getDetailCarState = getDetailCarState;
module.exports.getCallsPerDay = getCallsPerDay;
module.exports.getCallsPerMonth = getCallsPerMonth;
