var dbPool = require('./common').dbPool;
var async = require('async');

//내 리포트 모두 가져오기
function getMyReport(eid, callback) {
    var sql_select_my_report =
        'SELECT id, date_format(date, \'%Y-%m-%d\') date, major_job majorJob, TIME_FORMAT(work_start_time, \'%H시 %i분\') workStartTime, TIME_FORMAT(work_end_time, \'%H시 %i분\') workEndTime, TIME_FORMAT(over_time, \'%H시 %i분\') overTime, TIME_FORMAT(etc_time, \'%H시 %i분\') etcTime, vacation ' +
        'FROM analyst_report ' +
        'WHERE employee_id = ? ' +
        'ORDER BY date DESC';
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_select_my_report, [eid], function(err, results) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            callback(null, results);
        });
    });
}

//내 리포트 등록하기
function postMyReport(reqData, callback) {
    var sql_select_my_report =
        'SELECT id ' +
        'FROM analyst_report ' +
        'WHERE employee_id = ? AND date = str_to_date(?, \'%Y-%m-%d\')';

    var insert_analyst_report =
        'INSERT INTO analyst_report(employee_id, part_id, date, major_job, work_start_time, work_end_time, etc_time, over_time) ' +
        'VALUES(?, (SELECT p.id ' +
                   'FROM part p JOIN teams_parts tp ON (p.id = tp.part_id) ' +
                               'JOIN team t ON (t.id = tp.team_id) ' +
                               'JOIN employee e ON(e.team_id = t.id) ' +
                   'WHERE e.id = ?), str_to_date(?, \'%Y-%m-%d\'), ?, IF(? = \'\', NULL , ?), IF(? = \'\', NULL , ?), IF(? = \'\', NULL , ?), IF(? = \'\', NULL , ?))';

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_select_my_report, [reqData.employeeId, reqData.date], function(err, results) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            if (0 < results.length) { //이미 리포트가 있을 경우
                dbConn.release();
                return callback(null, 0);
            } else { //리포트가 없을 경우
                dbConn.query(insert_analyst_report, [reqData.employeeId, reqData.employeeId, reqData.date, reqData.majorJob, reqData.workStartTime, reqData.workStartTime, reqData.workEndTime, reqData.workEndTime, reqData.etcTime, reqData.etcTime, reqData.overTime, reqData.overTime], function(err, results) {
                    dbConn.release();
                    if (err) {
                        return callback(err);
                    }
                    var reportId = results.insertId;
                    callback(null, 1, reportId);
                });
            }
        });
    });
}

//휴가 등록하기
function postVacation(reqData, callback) {
    //휴가의 날짜 검색
    var sql_select_dates =
        'select * from ' +
        '(select adddate(?, t4.i*10000 + t3.i*1000 + t2.i*100 + t1.i*10 + t0.i) selected_date from ' +
        '(select 0 i union select 1 union select 2 union select 3 union select 4 union select 5 union select 6 union select 7 union select 8 union select 9) t0, ' +
        '(select 0 i union select 1 union select 2 union select 3 union select 4 union select 5 union select 6 union select 7 union select 8 union select 9) t1, ' +
        '(select 0 i union select 1 union select 2 union select 3 union select 4 union select 5 union select 6 union select 7 union select 8 union select 9) t2, ' +
        '(select 0 i union select 1 union select 2 union select 3 union select 4 union select 5 union select 6 union select 7 union select 8 union select 9) t3, ' +
        '(select 0 i union select 1 union select 2 union select 3 union select 4 union select 5 union select 6 union select 7 union select 8 union select 9) t4) v ' +
        'where selected_date between ? and ?';

    //그날 리포트가 있나 없나 검사
    var sql_select_my_report =
        'SELECT id ' +
        'FROM analyst_report ' +
        'WHERE employee_id = ? AND date = str_to_date(?, \'%Y-%m-%d\')';

    //리포트 없다면 휴가로 insert하기
    var sql_insert_vacation_report =
        'INSERT INTO analyst_report(employee_id, part_id, date, major_job, vacation) ' +
        'VALUES(?, (SELECT p.id ' +
                   'FROM part p JOIN teams_parts tp ON (p.id = tp.part_id) ' +
                               'JOIN team t ON (t.id = tp.team_id) ' +
                               'JOIN employee e ON(e.team_id = t.id) ' +
                   'WHERE e.id = ?), str_to_date(?, \'%Y-%m-%d\'), ?, 1)';

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.beginTransaction(function(err) {
            if (err) {
                return callback(err);
            }
            async.waterfall([getVacationDates, chkAndInserts], function(err, result) {
                if (err) {
                    return dbConn.rollback(function() {
                        dbConn.release();
                        callback(err);
                    });
                }
                dbConn.commit(function() {
                    dbConn.release();
                    callback(null);
                });
            });
        });

        function getVacationDates(callback) {
            dbConn.query(sql_select_dates, [reqData.vacationStart, reqData.vacationStart, reqData.vacationEnd], function(err, results) {
                if (err) {
                    return callback(err);
                }
                var dates = [];
                for (var i = 0; i < results.length; i++) {
                    dates.push(results[i].selected_date);
                }
                callback(null, dates);
            });
        }

        function chkAndInserts(dates, callback) {
            async.each(dates, chkAndInsert, function(err) {
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        }

        function chkAndInsert(date, callback) {
            async.waterfall([function(callback) {
                dbConn.query(sql_select_my_report, [reqData.employeeId, date], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    if (results.length !== 0) { //그날의 리포트가 이미 있다면
                        return callback(new Error(date + ' 날짜의 리포트가 이미 있습니다.'));
                    }
                    callback(null, date); //그날의 리포트가 없다면
                });
            }, function(date, callback) {
                dbConn.query(sql_insert_vacation_report, [reqData.employeeId, reqData.employeeId, date, reqData.majorWork], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null);
                });
            }], function(err, result) {
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        }
    });
}

//내 리포트 지우기
function deleteMyReport(reportId, callback) {
    var sql_delete_report_details =
        'DELETE FROM analyst_report_details ' +
        'WHERE analyst_report_id = ?';

    var sql_delete_report =
        'DELETE FROM analyst_report ' +
        'WHERE id = ?';

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }

        dbConn.beginTransaction(function (err) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            async.series([deleteReportDetails, deleteReport], function(err, result) {
                if (err) {
                    return dbConn.rollback(function() {
                        dbConn.release();
                        callback(err);
                    });
                }
                dbConn.commit(function() {
                    dbConn.release();
                    callback(null);
                });
            });

        });

        function deleteReport(callback) {
            dbConn.query(sql_delete_report, [reportId], function(err, results) {
                if (err) {
                    return callback(err)
                }
                callback(null);
            });
        }

        function deleteReportDetails(callback) {
            dbConn.query(sql_delete_report_details, [reportId], function(err, results) {
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        }

    });

}

//내 특정 리포트 가져오기
function getParticularReport(reportId, callback) {
    var sql_select_report =
        'SELECT DATE_FORMAT(date,\'%Y-%m-%d\') date, major_job majorJob, DATE_FORMAT(work_start_time, \'%H:%i\') workStartTime, DATE_FORMAT(work_end_time, \'%H:%i\') workEndTime, DATE_FORMAT(etc_time, \'%H:%i\') etcTime, DATE_FORMAT(over_time, \'%H:%i\') overTime, vacation ' +
        'FROM analyst_report ' +
        'WHERE id = ?';

    var sql_select_report_details =
        'SELECT DATE_FORMAT(start_time, \'%H:%i\') startTime, DATE_FORMAT(end_time, \'%H:%i\') endTime, work_details workDetails, note, type ' +
        'FROM analyst_report_details ' +
        'WHERE analyst_report_id = ? ' +
        'ORDER BY startTime';

    var resData = {};
    resData.details = [];

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }

        async.series([getReportInfo, getReportDetailsInfo], function(err, result) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            dbConn.release();
            callback(null, resData);
        });

        function getReportInfo(callback) {
            dbConn.query(sql_select_report, [reportId], function(err, results) {
                if (err) {
                    return callback(err);
                }
                resData.date = results[0].date;
                resData.majorJob = results[0].majorJob;
                resData.workStartTime = results[0].workStartTime;
                resData.workEndTime = results[0].workEndTime;
                resData.etcTime = results[0].etcTime;
                resData.overTime = results[0].overTime;
                resData.vacation = results[0].vacation;
                callback(null);
            });
        }

        function getReportDetailsInfo(callback) {
            dbConn.query(sql_select_report_details, [reportId], function(err, results) {
                if (err) {
                    return callback(err);
                }
                for (var i = 0; i < results.length; i++) {
                    var data = {
                        startTime: results[i].startTime,
                        endTime: results[i].endTime,
                        workDetails: results[i].workDetails,
                        note: results[i].note,
                        type: results[i].type
                    };
                    resData.details.push(data);
                }
                callback(null);
            });
        }
    });
}


module.exports.getMyReport = getMyReport;
module.exports.postMyReport = postMyReport;
module.exports.deleteMyReport = deleteMyReport;
module.exports.getParticularReport = getParticularReport;
module.exports.postVacation = postVacation;