/**
 * Created by pil on 2016-11-02.
 */
var dbPool = require('./common').dbPool;
var async = require('async');

function detailsList(report_id, callback) {
    var list = "SELECT rd.id, rd.work_Details, r.location, rd.location locationDetail, rd.target1, r.team_name "+
        "FROM report_details rd "+
        "JOIN report r ON (r.id = rd.report_id) "+
        "WHERE rd.report_id = ? "+
        "AND rd.work_details != 101 "+
        "AND rd.work_details != 100 "+
        "ORDER BY rd.id DESC;";

    var team_name = "SELECT r.team_name "+
                    "FROM report_details rd "+
                    "JOIN report r ON (r.id = rd.report_id) "+
                    "WHERE rd.report_id = ? "+
                    "AND rd.work_details != 101 "+
                    "AND rd.work_details = 100";

    var tmp = {};

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(list, [report_id], function(err, result) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            if(result[0]) {
                dbConn.release();
                callback(null, result);
            } else {
                dbConn.query(team_name, [report_id], function(err, result2) {
                    dbConn.release();
                    if (err) {
                        return callback(err);
                    }
                    callback(null, result2)
                });
            }
        });
    });
}

function addDetail(info, callback) {
    console.log(info);

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
           return callback(err);
        }
        dbConn.beginTransaction(function(err) {
            if (err) {
                return callback(err);
            }
            async.series([updateReportCall, insertDetail], function(err, results) {
                if (err) {
                    return dbConn.rollback(function () {
                        dbConn.release();
                        callback(err);
                    });
                }
                    dbConn.commit(function() {
                        dbConn.release();
                        callback(null, results);
                    });
            });
        });


        function updateReportCall(callback) {
            var update_ReportCall = "UPDATE report SET calls =+ ? WHERE id = ?";
            dbConn.query(update_ReportCall, [info.calls, info.Reportid], function(err, result) {
                if (err) {
                    return callback(err);
                }
                callback(null, 'ok');
            });

        }
        function insertDetail(callback) {
            if (info.errCheck == 0) {
                var insert_detail1 = "INSERT INTO "+
                    "report_details(report_id, work_details, target1, target2, location, start_time, end_time, calls, "+
                    "`type`, obstacle_classification, obstacle_details, obstacle_start_time, obstacle_end_time, obstacle_phenomenon, obstacle_result) "+
                    "VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ";
                dbConn.query(insert_detail1, [info.Reportid, info.work_details, info.target1, info.target2, info.location, info.start_time, info.end_time, info.calls,
                    info.errCheck, info.errorList.obstacle_classification, info.errorList.obstacle_details, info.errorList.obstacle_start_time, info.errorList.obstacle_end_time,
                    info.errorList.obstacle_phenomenon, info.errorList.obstacle_result], function(err, result) {
                    if (err) {
                        return callback(err)
                    }
                    callback(null, 'ok');
                });

            } else {
                var insert_detail2 = "INSERT INTO "+
                    "report_details(report_id, work_details, target1, target2, location, start_time, end_time, calls, `type`) "+
                    "VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?) ";
                dbConn.query(insert_detail2, [info.Reportid, info.work_details, info.target1, info.target2, info.location, info.start_time, info.end_time, info.calls,
                    info.errCheck], function(err, result) {
                    if (err) {
                        return callback(err)
                    }
                    callback(null, 'ok');
                });
            }
        }
    });
}

module.exports.detailsList = detailsList;
module.exports.addDetail = addDetail;