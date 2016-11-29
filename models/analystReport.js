var dbPool = require('./common').dbPool;
var async = require('async');

function getMyReport(eid, callback) {
    var sql_select_my_report =
        'SELECT id, date_format(date, \'%Y-%m-%d\') date, major_job majorJob, work_start_time workStartTime, work_end_time workEndTime, over_time overTime, etc, vacation ' +
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

module.exports.getMyReport = getMyReport;
