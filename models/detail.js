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
        "AND rd.work_details < 100 "+
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

function baseDetail(report_id, user_id, callback) {
    var baseInfo = {};
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        async.series([function (callback) {
            var me = "SELECT name FROM employee WHERE id = ?";
            dbConn.query(me, [user_id], function(err, result) {
                if (err) {
                    return callback(err);
                }
                baseInfo.name = result[0].name;
                callback(null, null);
            });
        }, function(callback) {
            var sql_base_info = "SELECT team_member, location, car_number, car_type, equipment_name "+
                "FROM report WHERE id = ?";
            dbConn.query(sql_base_info, [report_id], function(err, result) {
                if (err) {
                    return callback(err);
                }
                baseInfo.team_member = result[0].team_member;
                baseInfo.location = result[0].location;
                baseInfo.car_number = result[0].car_number;
                baseInfo.car_type = result[0].car_type;
                baseInfo.equipment_name = result[0].equipment_name;

                callback(null, null);
            });
        }], function(err, results) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            dbConn.release();
            callback(null, baseInfo);
        });
    });
}

function addDetail(info, callback) {
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
            if (info.errCheck == 1) {
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

function deleteDetail(detail_id, callback) {
    var delete_detail = "DELETE FROM report_details WHERE id = ?;";
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(delete_detail, [detail_id], function(err, result) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            callback(null, 'ok');
        })
    });
}

function updateDetailSelect(detail_id, callback) {
    var sql_Select_Deport = "SELECT rd.id, rd.report_id, work_details, target1, target2, r.location location1, rd.location location2, start_time, end_time, rd.calls, rd.type, "+
                            "obstacle_classification, obstacle_details, obstacle_start_time, obstacle_end_time, obstacle_phenomenon, obstacle_result, "+
                            "r.team_member, r.equipment_name, r.car_manager, "+
                            "date_format(convert_tz(r.date, '+00:00', '+09:00'), '%Y-%m-%d') `date`" +
                            "FROM report_details rd "+
                            "JOIN report r ON (r.id = rd.report_id) "+
                            "WHERE rd.id = ?";
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_Select_Deport, [detail_id], function(err, result) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            callback(null, result[0]);
        });
    });
}

function updateDetail(info, callback) {
    if(info.type == 1) {
        var update_detail = "UPDATE report_details "+
            "SET work_details=?, start_time=?, end_time=?, calls=?, location=?, target1=?, target2=?, "+
            "obstacle_classification=?, obstacle_details=?, obstacle_start_time=?, obstacle_end_time=?, "+
            "obstacle_phenomenon=?, obstacle_result=?, type = ? "+
            "WHERE id = ?";
        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(update_detail, [info.work_details, info.start_time, info.end_time, info.calls, info.location2, info.target1, info.target2,
                info.obstacle_classification, info.obstacle_details, info.obstacle_start_time, info.obstacle_end_time,
                info.obstacle_phenomenon, info.obstacle_result, info.type, info.detail_id], function(err, result) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                callback(null, null);
            });
        });
    } else {
        var update_detail2_notErr = "UPDATE report_details "+
            "SET work_details=?, start_time=?, end_time=?, calls=?, location=?, target1=?, target2=?, "+
            "obstacle_classification=NULL, obstacle_details=NULL, obstacle_start_time=NULL, obstacle_end_time=NULL, "+
            "obstacle_phenomenon=NULL, obstacle_result=NULL, type = 0 "+
            "WHERE id = ?";
        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(update_detail2_notErr, [info.work_details, info.start_time, info.end_time, info.calls, info.location2, info.target1, info.target2, info.detail_id], function(err, result) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                callback(null, null);
            });
        });
    }
}

module.exports.detailsList = detailsList;
module.exports.addDetail = addDetail;
module.exports.baseDetail = baseDetail;
module.exports.deleteDetail = deleteDetail;
module.exports.updateDetailSelect = updateDetailSelect;
module.exports.updateDetail = updateDetail;