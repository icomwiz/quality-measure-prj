/**
 * Created by 11026 on 2016-11-28.
 */
var dbPool = require('./common').dbPool;
var async = require('async');

function measureTaskReport(reportDate, callback) {
    var data_daily_briefing = {};
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
    var sql_select_date = "SELECT id FROM daily_briefing WHERE date = ? LIMIT 1";

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_start_TaskStatus, [reportDate, reportDate], function(err, result1) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            data_daily_briefing = result1;

            dbConn.query(sql_select_date, [reportDate], function(err, result2) {
                if (err) {
                    dbConn.release();
                    return callback(err);
                }
                callback(null, data_daily_briefing, result2);
            });
        });
    });
}

function daily_briefingView(reportDate, callback) {
    var data_daily_briefing = {};
    var briefing = {};
    var daily_briefing_id = {};
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
    var sql_select_date = "SELECT id FROM daily_briefing WHERE date = ? LIMIT 1";

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        async.series([measureTaskReportSub, date_select, briefingView], function(err, results) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            dbConn.release();
            callback(null, data_daily_briefing, daily_briefing_id, briefing);
        });

        function date_select(callback) {
            dbConn.query(sql_select_date, [reportDate], function(err, result) {
                if (err) {
                    return callback(err);
                }
                daily_briefing_id = result;
                callback(null);
            });
        }

        function measureTaskReportSub(callback) {
            dbConn.query(sql_start_TaskStatus, [reportDate, reportDate], function(err, result) {
                if (err) {
                    return callback(err);
                }
                data_daily_briefing = result;
                callback(null, null);
            });
        }


        function briefingView(callback) {
            var routine = [];
            var k1 = [];
            var theme = [];
            var holiyday = {};

            var sql_select_daily_briefing = "SELECT dbd.id, composition, group_placement, equipment, " +
                                            "allocation_of_people, measurement_team, support_staff, dbd.type, db.date "+
                                            "FROM daily_briefing db "+
                                            "JOIN daily_briefing_details dbd ON (db.id = dbd.daily_briefing_id) " +
                                            "WHERE db.date = ?";
            dbConn.query(sql_select_daily_briefing, [reportDate],function(err, result) {
               if (err) {
                  return callback(err);
               }

               briefing.routine = [];
               briefing.k1 = [];
               briefing.theme = [];

               async.each(result, function(item, callback) {
                   if (item.type == 1) {
                       routine.push({
                           id : item.id,
                           composition : item.composition,
                           group_placement : item.group_placement,
                           equipment : item.equipment,
                           allocation_of_people : item.allocation_of_people,
                           measurement_team : item.measurement_team,
                           support_staff : item.support_staff
                       });
                   } else if (item.type == 2) {
                       k1.push({
                           id: item.id,
                           composition: item.composition,
                           group_placement: item.group_placement,
                           equipment: item.equipment,
                           allocation_of_people: item.allocation_of_people,
                           measurement_team: item.measurement_team,
                           support_staff: item.support_staff
                       });
                   } else if (item.type == 3) {
                       theme.push({
                               id: item.id,
                               composition: item.composition,
                               group_placement: item.group_placement,
                               equipment: item.equipment,
                               allocation_of_people: item.allocation_of_people,
                               measurement_team: item.measurement_team,
                               support_staff: item.support_staff
                           });
                   } else {
                       holiyday.allocation_of_people = item.allocation_of_people;
                       holiyday.measurement_team = item.measurement_team;
                       holiyday.support_staff = item.support_staff;
                   }

                   briefing.routine = routine;
                   briefing.k1 = k1;
                   briefing.theme = theme;
                   briefing.holiyday = holiyday;

                   callback();

               }, function(err) {
                   if (err) {
                       return callback(err);
                   }
                   callback(null);
               });
            });

        }
    });
}

function daily_briefing(info, callback) {
    var daily_briefing_id ;
    var sql_insert = "INSERT " +
                     "INTO daily_briefing_details(daily_briefing_id, composition, group_placement, equipment, allocation_of_people, measurement_team, support_staff, type) "+
                     "VALUES(?, ?, ?, ?, ?, ?, ?, ?)";
    var sql_insert_holiday = "INSERT "+
                              "INTO daily_briefing_details(daily_briefing_id, allocation_of_people, measurement_team, support_staff, type) "+
                              "VALUES(?, ?, ?, ?, ?)";
    var sql_update = "UPDATE report SET unusual_matters = ? WHERE employee_id = ? AND id = ?";

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.beginTransaction(function(err) {
            if (err) {
                return callback(null);
            }
            if(info.daily_briefing_id !== '') {
                //TODO : 있을경우 만들어야함.
                console.log("info.daily_briefing_id 번호는 : "+info.daily_briefing_id);

                async.series([delete_daily_briefing, insert_daily_briefing, updateReport], function(err, results) {
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

            } else {
                //TODO : 없을경우실행
                async.series([daily_briefing, insert_daily_briefing, updateReport], function(err, results) {
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
            }

            function delete_daily_briefing(callback) {
                var sql_delete = "DELETE FROM daily_briefing_details WHERE daily_briefing_id = ?" ;
                dbConn.query(sql_delete, [info.daily_briefing_id], function(err, result) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, null);
                });
            }

            function daily_briefing(callback) {
                var sql_insert_daily_briefing = "INSERT INTO daily_briefing(date) VALUES (?)";
                dbConn.query(sql_insert_daily_briefing, [info.Date], function(err, result) {
                    if (err) {
                        return callback(err);
                    }
                    //console.log(result.insertId);
                    daily_briefing_id = result.insertId;
                    callback(null);
                });
            }

            function insert_daily_briefing(callback) {
                async.series([insertRoutine, insertK1, insertTheme, insertholiday], function(err, result) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, null);
                });

                function insertRoutine(callback) {
                    daily_briefing_id = daily_briefing_id || info.daily_briefing_id;
                    async.each(info.routine, function(item, done) {
                        if (item.composition !== ''  && item.group_placement !== '' && item.equipment !== '' && item.AssignedPerson !== '' && item.measurePerson !== '' && item.supprotPerson !== '') {
                            dbConn.query(sql_insert, [daily_briefing_id, item.composition, item.group_placement, item.equipment, item.AssignedPerson, item.measurePerson, item.supprotPerson, 1], function(err, result) {
                                if (err) {
                                    return done(err);
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
                function insertK1(callback) {
                    daily_briefing_id = daily_briefing_id || info.daily_briefing_id;
                    async.each(info.K1, function(item, done) {
                        if(item.composition !== '' && item.group_placement !== '' && item.equipment !== '' && item.AssignedPerson !== '' && item.measurePerson !== '' && item.supprotPerson !== '') {
                            dbConn.query(sql_insert, [daily_briefing_id, item.composition, item.group_placement, item.equipment, item.AssignedPerson, item.measurePerson, item.supprotPerson, 2], function(err, result) {
                                if (err) {
                                    return done(err);
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
                    daily_briefing_id = daily_briefing_id || info.daily_briefing_id;
                    async.each(info.theme, function(item, done) {
                        if(item.composition !== '' && item.group_placement !== '' && item.equipment !== '' && item.AssignedPerson !== '' && item.measurePerson !== '' && item.supprotPerson !== '') {
                            dbConn.query(sql_insert, [daily_briefing_id, item.composition, item.group_placement, item.equipment, item.AssignedPerson, item.measurePerson, item.supprotPerson, 3], function(err, result) {
                                if (err) {
                                    return done(err);
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
                    daily_briefing_id = daily_briefing_id || info.daily_briefing_id;
                    dbConn.query(sql_insert_holiday, [daily_briefing_id, info.holiday.AssignedPerson, info.holiday.measurePerson, info.holiday.supprotPerson, 4], function(err, result) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null, null);
                    });
                }

            }


            function updateReport(callback) {
                async.each(info.User, function(item, done) {
                    dbConn.query(sql_update, [item.unusual_matters, item.user_id, item.report_id], function(err, result) {
                        if (err) {
                            return done(err);
                        }
                    });
                    done();
                }, function(err) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, null)
                });

            }
        });
    });
}

function managementView(callback) {
    var sql_select ="SELECT e.id id, e.name, "+
                    "CAST(AES_DECRYPT(UNHEX(e.email), 'wiz') AS CHAR) email, "+
                    "CAST(AES_DECRYPT(UNHEX(e.phone_number), 'wiz') AS CHAR) phone_number, " +
                    "e.team_id, e.team_position, e.department_id, e.department_position "+
                    "FROM employee e "+
                    "LEFT JOIN team t ON (t.id = e.team_id) "+
                    "WHERE (t.team_no = 0 OR e.team_position = 0) AND e.type = 1 "+
                    "ORDER BY id ASC ";
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_select, function(err, result) {
            if (err) {
                return callback(err);
            }
            callback(null, result);
        });
    })
}

function managementInsert(info, callback) {
    var sql_insert = "INSERT INTO " +
    "employee(name, email, phone_number, password, team_id, team_position, department_id, department_position, equipment_name) " +
    "VALUES(?, HEX(AES_ENCRYPT(?, 'wiz')), "+
    "HEX(AES_ENCRYPT(?, 'wiz')), "+
    "HEX(AES_ENCRYPT(SHA2('1111', 512), 'wiz')), ?, ?, ?, ?, null)";
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_insert, [info.name, info.email, info.phone, info.part, info.group, info.department, info.position],function(err, result) {
            if (err) {
                return callback(err);
            }
            callback(null, result);
        });
    });
}
function managementDelete(info, callback) {
    var sql = "UPDATE employee SET "+
    "password = '1111', phone_number='' ,email = '', department_position = '', type=0 "+
    "WHERE id = ?";
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql, [info.id], function(err, result) {
            if (err) {
                return callback(err);
            }
            callback(null, "ok");
        });
    });
}

function managementUpdate(info, callback) {
    var update_query = "UPDATE employee SET " +
    "name = ? , email = HEX(AES_ENCRYPT(?, 'wiz')), phone_number = HEX(AES_ENCRYPT(?, 'wiz')), " +
    "team_id = ?, team_position = ?, department_id = ?, department_position = ? " +
    "WHERE id =  ?";
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(update_query, [info.updateName, info.updateEmail, info.updatePhone, info.updatePart,
            info.updateGroup, info.updateDepartment, info.updatePosition, info.UserId], function(err, result) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            callback(null, null);
        });
    })
}

module.exports.measureTaskReport = measureTaskReport;
module.exports.daily_briefing = daily_briefing;
module.exports.daily_briefingView = daily_briefingView;
module.exports.managementView = managementView;
module.exports.managementInsert = managementInsert;
module.exports.managementDelete = managementDelete;
module.exports.managementUpdate = managementUpdate;