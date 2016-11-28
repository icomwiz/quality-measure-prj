/**
 * Created by 11026 on 2016-11-28.
 */
var dbPool = require('./common').dbPool;
var async = require('async');

function measureTaskReport(callback) {
    var sql_select = ''
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_select, [], function(err, result) {
            if (err) {
                return callback(err);
            }
            callback(null, err);
        });
    });

}

module.exports.measureTaskReport = measureTaskReport;