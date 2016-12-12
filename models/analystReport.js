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
        'SELECT date, major_job majorJob, work_start_time workStartTime, work_end_time workEndTime, etc_time etcTime, over_time overTime, vacation ' +
        'FROM analyst_report ' +
        'WHERE id = ?';

    var sql_select_report_details =
        'SELECT start_time startTime, end_time endTime, work_details workDetails, note, type ' +
        'FROM analyst_report_details ' +
        'WHERE analyst_report_id = ?';

    var resData = {};
    resData.details = [];

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        async.series([getReportInfo, getReportDetailsInfo], function(err, result) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
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
            });
        }

        function getReportDetailsInfo(callback) {
            dbConn.query(sql_select_report_details, [reportId], function(err, results) {
                if (err) {
                    return callback(err);
                }
                for (var i = 0; results.lenbits; i++) {
                    resData.details.push({
                        startTime: results[i].startTime,
                        endTime: results[i].endTime,
                        workDetails: results[i].workDetails,
                        note: results[i].note,
                        type: results[i].type
                    });
                }
            });
        }
    });
}

module.exports.getMyReport = getMyReport;
module.exports.postMyReport = postMyReport;
module.exports.deleteMyReport = deleteMyReport;
module.exports.getParticularReport = getParticularReport;