var dbPool = require('./common').dbPool;
var async = require('async');

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
                    return callback(null, 1, reportId);
                });
            }
        });
    });
}

module.exports.getMyReport = getMyReport;
module.exports.postMyReport = postMyReport;