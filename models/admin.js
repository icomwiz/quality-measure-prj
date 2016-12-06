/**
 * Created by 11026 on 2016-11-28.
 */
var dbPool = require('./common').dbPool;
var async = require('async');

function measureTaskReport(reportDate, callback) {
    var sql_start_TaskStatus = "SELECT e.id, r.id report_id, r.team_name, e.name, rd.start_time, a.end_time, r.unusual_matters "+
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

function daily_briefing(info, callback) {
    var sql_insert = "INSERT " +
                    "INTO daily_briefing(composition, group_placement, equipment, allocation_of_people, measurement_team, support_staff, date) "+
                    "VALUES(?, ?, ?, ?, ?, ?, ?)";
    var sql_insert_holiday = "INSERT "+
                             "INTO daily_briefing(allocation_of_people, measurement_team, support_staff, date) "+
                             "VALUES(?, ?, ?, ?)";
    var sql_update = "UPDATE report SET unusual_matters = ? WHERE employee_id = ? AND id = ?";

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.beginTransaction(function(err) {
            if (err) {
                return callback(null);
            }
            async.series([function(callback) {
                async.series([insertRoutine, insertQOE, insertTheme, insertholiday], function(err, result) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, null);
                });

                function insertRoutine(callback) {
                    async.each(info.routine, function(item, done) {
                        if(item.composition !== ''  && item.group_placement !== '' && item.equipment !== '' && item.AssignedPerson !== '' && item.measurePerson !== '' && item.supprotPerson !== '') {
                            dbConn.query(sql_insert, [item.composition, item.group_placement, item.equipment, item.AssignedPerson, item.measurePerson, item.supprotPerson, info.Date], function(err, result) {
                                if (err) {
                                    done(err);
                                }
                            });
                        }
                        done();
                    }, function(err) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null, null);
                    });
                }

                function insertQOE(callback) {
                    async.each(info.QOE, function(item, done) {
                        if(item.composition !== '' && item.group_placement !== '' && item.equipment !== '' && item.AssignedPerson !== '' && item.measurePerson !== '' && item.supprotPerson !== '') {
                            dbConn.query(sql_insert, [item.composition, item.group_placement, item.equipment, item.AssignedPerson, item.measurePerson, item.supprotPerson, info.Date], function(err, result) {
                                if (err) {
                                    done(err);
                                }
                            });
                        }
                        done();
                    }, function(err) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null, null);
                    });
                }

                function insertTheme(callback) {
                    async.each(info.theme, function(item, done) {
                        if(item.composition !== '' && item.group_placement !== '' && item.equipment !== '' && item.AssignedPerson !== '' && item.measurePerson !== '' && item.supprotPerson !== '') {
                            dbConn.query(sql_insert, [item.composition, item.group_placement, item.equipment, item.AssignedPerson, item.measurePerson, item.supprotPerson, info.Date], function(err, result) {
                                if (err) {
                                    done(err);
                                }
                            });
                        }
                        done();
                    }, function(err) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null, null);
                    });
                }

                function insertholiday(callback) {
                    dbConn.query(sql_insert_holiday, [info.holiday.AssignedPerson, info.holiday.measurePerson, info.holiday.supprotPerson, info.Date], function(err, result) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null, null);
                    });
                }

            }, function(callback) {
                async.each(info.User, function(item, done) {
                    dbConn.query(sql_update, [item.unusual_matters, item.user_id, item.report_id], function(err, result) {
                        if (err) {
                            done(err);
                        }
                    });
                    done();
                }, function(err) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, null)
                });

            }], function(err, results) {
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
    });
}

module.exports.measureTaskReport = measureTaskReport;
module.exports.daily_briefing = daily_briefing;