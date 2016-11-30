/**
 * Created by 11026 on 2016-11-28.
 */
var dbPool = require('./common').dbPool;
var async = require('async');

function measureTaskReport(reportDate, callback) {
    var sql_start_TaskStatus = "SELECT e.id, r.team_name, e.name, rd.start_time, a.end_time "+
    "FROM employee e "+
    "JOIN report r ON (r.employee_id = e.id) "+
    "JOIN report_details rd ON(r.id = rd.report_id) "+
    "JOIN (SELECT e.id, e.name, max(end_time) end_time "+
    "FROM employee e "+
    "JOIN report r ON (r.employee_id = e.id) "+
    "JOIN report_details rd ON(r.id = rd.report_id) "+
    "WHERE work_details < 100 AND r.date = ? "+
    "GROUP BY e.name) a ON (e.id = a.id) "+
    "WHERE work_details < 100 AND rd.work_details = 1 AND r.date = ? " +
    "ORDER BY e.name";

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_start_TaskStatus, [reportDate, reportDate], function(err, result) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            callback(null, result);
        });
    });
}

module.exports.measureTaskReport = measureTaskReport;