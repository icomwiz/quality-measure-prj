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

module.exports.detailsList = detailsList;