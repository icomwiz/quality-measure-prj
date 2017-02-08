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
            if (0 != results.length) { //이미 리포트가 있을 경우
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

//휴가 등록하기
function postVacation(reqData, callback) {
    //휴가의 날짜 검색
    var sql_select_dates =
        'select * from ' +
        '(select adddate(?, t4.i*10000 + t3.i*1000 + t2.i*100 + t1.i*10 + t0.i) selected_date from ' +
        '(select 0 i union select 1 union select 2 union select 3 union select 4 union select 5 union select 6 union select 7 union select 8 union select 9) t0, ' +
        '(select 0 i union select 1 union select 2 union select 3 union select 4 union select 5 union select 6 union select 7 union select 8 union select 9) t1, ' +
        '(select 0 i union select 1 union select 2 union select 3 union select 4 union select 5 union select 6 union select 7 union select 8 union select 9) t2, ' +
        '(select 0 i union select 1 union select 2 union select 3 union select 4 union select 5 union select 6 union select 7 union select 8 union select 9) t3, ' +
        '(select 0 i union select 1 union select 2 union select 3 union select 4 union select 5 union select 6 union select 7 union select 8 union select 9) t4) v ' +
        'where selected_date between ? and ?';

    //그날 리포트가 있나 없나 검사
    var sql_select_my_report =
        'SELECT id ' +
        'FROM analyst_report ' +
        'WHERE employee_id = ? AND date = str_to_date(?, \'%Y-%m-%d\')';

    //리포트 없다면 휴가로 insert하기
    var sql_insert_vacation_report =
        'INSERT INTO analyst_report(employee_id, part_id, date, major_job, vacation) ' +
        'VALUES(?, (SELECT p.id ' +
                   'FROM part p JOIN teams_parts tp ON (p.id = tp.part_id) ' +
                               'JOIN team t ON (t.id = tp.team_id) ' +
                               'JOIN employee e ON(e.team_id = t.id) ' +
                   'WHERE e.id = ?), str_to_date(?, \'%Y-%m-%d\'), ?, 1)';

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.beginTransaction(function(err) {
            if (err) {
                return callback(err);
            }
            async.waterfall([getVacationDates, chkAndInserts], function(err, result) {
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

        function getVacationDates(callback) {
            dbConn.query(sql_select_dates, [reqData.vacationStart, reqData.vacationStart, reqData.vacationEnd], function(err, results) {
                if (err) {
                    return callback(err);
                }
                var dates = [];
                for (var i = 0; i < results.length; i++) {
                    dates.push(results[i].selected_date);
                }
                callback(null, dates);
            });
        }

        function chkAndInserts(dates, callback) {
            async.each(dates, chkAndInsert, function(err) {
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        }

        function chkAndInsert(date, callback) {
            async.waterfall([function(callback) {
                dbConn.query(sql_select_my_report, [reqData.employeeId, date], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    if (results.length !== 0) { //그날의 리포트가 이미 있다면
                        return callback(new Error(date + ' 날짜의 리포트가 이미 있습니다.'));
                    }
                    callback(null, date); //그날의 리포트가 없다면
                });
            }, function(date, callback) {
                dbConn.query(sql_insert_vacation_report, [reqData.employeeId, reqData.employeeId, date, reqData.majorWork], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null);
                });
            }], function(err, result) {
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        }
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
        'SELECT DATE_FORMAT(date,\'%Y-%m-%d\') date, major_job majorJob, DATE_FORMAT(work_start_time, \'%H:%i\') workStartTime, DATE_FORMAT(work_end_time, \'%H:%i\') workEndTime, DATE_FORMAT(etc_time, \'%H:%i\') etcTime, DATE_FORMAT(over_time, \'%H:%i\') overTime, vacation ' +
        'FROM analyst_report ' +
        'WHERE id = ?';

    var sql_select_report_details =
        'SELECT DATE_FORMAT(start_time, \'%H:%i\') startTime, DATE_FORMAT(end_time, \'%H:%i\') endTime, work_details workDetails, note, type ' +
        'FROM analyst_report_details ' +
        'WHERE analyst_report_id = ? ' +
        'ORDER BY startTime';

    var resData = {};
    resData.details = [];

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        async.series([getReportInfo, getReportDetailsInfo], function(err, result) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            dbConn.release();
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
                callback(null);
            });
        }

        function getReportDetailsInfo(callback) {
            dbConn.query(sql_select_report_details, [reportId], function(err, results) {
                if (err) {
                    return callback(err);
                }
                for (var i = 0; i < results.length; i++) {
                    var data = {
                        startTime: results[i].startTime,
                        endTime: results[i].endTime,
                        workDetails: results[i].workDetails,
                        note: results[i].note,
                        type: results[i].type
                    };
                    resData.details.push(data);
                }
                callback(null);
            });
        }
    });
}

//employeeId와 날짜를 통해 리포트 가져오기
function getReortByEmployeeId(reqData, callback) {
    var sql_select_report = 'SELECT id reportId, DATE_FORMAT(date, \'%Y-%m-%d\') date, major_job majorJob, DATE_FORMAT(work_start_time, \'%H:%i\') workStartTime, DATE_FORMAT(work_end_time, \'%H:%i\') workEndTime, DATE_FORMAT(etc_time, \'%H:%i\') etcTime, DATE_FORMAT(over_time, \'%H:%i\') overTime, vacation ' +
                            'FROM analyst_report ' +
                            'WHERE employee_id = ? AND date = str_to_date(?, \'%Y-%m-%d\')';

    var sql_select_report_details = 'SELECT DATE_FORMAT(start_time, \'%H:%i\') startTime, DATE_FORMAT(end_time, \'%H:%i\') endTime, work_details workDetails, note, type ' +
                                    'FROM analyst_report_details ' +
                                    'WHERE analyst_report_id = ? ' +
                                    'ORDER BY startTime';

    var reportId;
    var resData = {};
    resData.details = [];

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        async.series([getReportInfo, getReportDetailsInfo], function(err, result) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            dbConn.release();
            callback(null, resData);
        });

        function getReportInfo(callback) {
            dbConn.query(sql_select_report, [reqData.employeeId, reqData.date], function(err, results) {
                if (err) {
                    return callback(err);
                }
                reportId = results[0].reportId;
                resData.date = results[0].date;
                resData.majorJob = results[0].majorJob || '';
                resData.workStartTime = results[0].workStartTime || '';
                resData.workEndTime = results[0].workEndTime || '';
                resData.etcTime = results[0].etcTime || '';
                resData.overTime = results[0].overTime || '';
                resData.vacation = results[0].vacation || '';
                callback(null);
            });
        }

        function getReportDetailsInfo(callback) {
            dbConn.query(sql_select_report_details, [reportId], function(err, results) {
                if (err) {
                    return callback(err);
                }
                for (var i = 0; i < results.length; i++) {
                    var data = {
                        startTime: results[i].startTime || '',
                        endTime: results[i].endTime || '',
                        workDetails: results[i].workDetails || '',
                        note: results[i].note || '',
                        type: results[i].type || ''
                    };
                    resData.details.push(data);
                }
                callback(null);
            });
        }
    });
}

//날짜를 통해 리포트가 있는지 없는지 검사
function getExistingReport(reqData, callback) {
    var sql_select_analystReport =
        'SELECT * ' +
        'FROM analyst_report ' +
        'WHERE employee_id = ? AND date = str_to_date(?, \'%Y-%m-%d\')';

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_select_analystReport, [reqData.employeeId, reqData.date], function(err, results) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            if (results.length === 0) { //존재하지 않으면
                callback(null, 0);
            } else {
                callback(null, 1); //존재하면
            }
        });
    });
}

//월별 출퇴근 상태
function getAnalystCommuteState(callback) {
    //내근자업무일지의 년과 월을 가지고옴.
    var sql_select_analystreports_year_and_month =
        'SELECT DISTINCT year(date) year, month(date) month ' +
        'FROM analyst_report ' +
        'ORDER BY date DESC';

    //년과 월을 통해 마지막 날짜를 구함
    var sql_select_last_day_of_month =
        'SELECT DAYOFMONTH(LAST_DAY(STR_TO_DATE(?, \'%Y-%m\'))) lastDay';

    //년과 월을 통해 파트들을 가져옴
    var sql_select_parts =
        'SELECT a.id partId, a.name partName, count(*) employeeCount ' +
        'FROM (SELECT p.Id, p.name, count(e.id) ' +
              'FROM analyst_report ar JOIN employee e ON (ar.employee_id = e.id) ' +
                                     'JOIN team t ON (e.team_id = t.id) ' +
                                     'JOIN teams_parts tp ON (t.id = tp.team_id) ' +
                                     'JOIN part p ON (p.id = tp.part_id) ' +
              'WHERE YEAR(ar.date) = 2017 AND MONTH(ar.date) = 1 ' +
              'GROUP BY e.id) a ' +
        'GROUP BY a.id';

    //년과 월을 통해 출퇴근정보를 가져옴
    var sql_select_commute_state =
        'SELECT p.id partId, p.name partName, e.id employeeId, e.name employeeName, ' +
                                           'CASE WHEN DAY(date) = 1 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day1, ' +
                                           'CASE WHEN DAY(date) = 2 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day2, ' +
                                           'CASE WHEN DAY(date) = 3 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day3, ' +
                                           'CASE WHEN DAY(date) = 4 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day4, ' +
                                           'CASE WHEN DAY(date) = 5 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day5, ' +
                                           'CASE WHEN DAY(date) = 6 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day6, ' +
                                           'CASE WHEN DAY(date) = 7 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day7, ' +
                                           'CASE WHEN DAY(date) = 8 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day8, ' +
                                           'CASE WHEN DAY(date) = 9 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day9, ' +
                                           'CASE WHEN DAY(date) = 10 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day10, ' +
                                           'CASE WHEN DAY(date) = 11 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day11, ' +
                                           'CASE WHEN DAY(date) = 12 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day12, ' +
                                           'CASE WHEN DAY(date) = 13 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day13, ' +
                                           'CASE WHEN DAY(date) = 14 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day14, ' +
                                           'CASE WHEN DAY(date) = 15 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day15, ' +
                                           'CASE WHEN DAY(date) = 16 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day16, ' +
                                           'CASE WHEN DAY(date) = 17 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day17, ' +
                                           'CASE WHEN DAY(date) = 18 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day18, ' +
                                           'CASE WHEN DAY(date) = 19 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day19, ' +
                                           'CASE WHEN DAY(date) = 20 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day20, ' +
                                           'CASE WHEN DAY(date) = 21 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day21, ' +
                                           'CASE WHEN DAY(date) = 22 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day22, ' +
                                           'CASE WHEN DAY(date) = 23 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day23, ' +
                                           'CASE WHEN DAY(date) = 24 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day24, ' +
                                           'CASE WHEN DAY(date) = 25 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day25, ' +
                                           'CASE WHEN DAY(date) = 26 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day26, ' +
                                           'CASE WHEN DAY(date) = 27 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day27, ' +
                                           'CASE WHEN DAY(date) = 28 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day28, ' +
                                           'CASE WHEN DAY(date) = 29 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day29, ' +
                                           'CASE WHEN DAY(date) = 30 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day30, ' +
                                           'CASE WHEN DAY(date) = 31 THEN concat_ws(\'-\', ar.vacation, concat_ws(\',\', DATE_FORMAT(ar.work_start_time, \'%H:%i\'), DATE_FORMAT(ar.work_end_time, \'%H:%i\'), DATE_FORMAT(ar.over_time, \'%H:%i\'))) END day31 ' +
        'FROM analyst_report ar JOIN employee e ON (ar.employee_id = e.id) ' +
        'JOIN team t ON (e.team_id = t.id) ' +
        'JOIN teams_parts tp ON (t.id = tp.team_id) ' +
        'JOIN part p ON (p.id = tp.part_id) ' +
        'WHERE YEAR(ar.date) = ? AND MONTH(ar.date) = ? ' +
        'ORDER BY partId';

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        async.waterfall([getYearAndMonth, getLastDay, getParts, getCommuteInfo], function(err, result) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            callback(null, result);
        });

        function getYearAndMonth(callback) {
            dbConn.query(sql_select_analystreports_year_and_month, [], function(err, results) {
                if (err) {
                    return callback(err);
                }
                var resDatas = [];
                for (var i = 0; i < results.length; i++) {
                    resDatas.push({
                        year: results[i].year,
                        month: results[i].month,
                        lastDay: '',
                        parts: [],
                        dayDatas: []
                    });
                }
                callback(null, resDatas);
            });
        }

        function getLastDay(resDatas, callback) {
            async.each(resDatas, function(data, callback) {
                dbConn.query(sql_select_last_day_of_month, [data.year + '-' + data.month], function(err, results) {
                    if (err) {
                        callback(err);
                    }
                    data.lastDay = results[0].lastDay;
                    callback();
                });
            }, function(err) {
                if (err) {
                    return callback(err);
                }
                callback(null, resDatas);
            });
        }

        function getParts(resDatas, callback) {
            async.each(resDatas, function(data, callback) {
                dbConn.query(sql_select_parts, [data.year, data.month], function(err, results) {
                    if (err) {
                        callback(err);
                    }
                    if (results.length != 0) {
                        for (var i = 0; i < results.length; i ++) {
                            data.parts.push({
                                partId: results[0].partId,
                                partName: results[0].partName,
                                employeeCount: results[0].employeeCount
                            });
                        }
                    }
                    callback();
                });
            }, function(err) {
                if (err) {
                    return callback(err);
                }
                callback(null, resDatas);
            });
        }

        function getCommuteInfo(resDatas, callback) {
            async.each(resDatas, function(data, callback) {
                dbConn.query(sql_select_commute_state, [data.year, data.month], function(err, results) {
                    if (err) {
                        callback(err);
                    }
                    if (results.length != 0) {
                        for (var i = 0; i < results.length; i++) {
                            var index = findWithAttr(data.dayDatas, 'employeeId', results[i].employeeId);
                            if (index === -1) {
                                data.dayDatas.push({
                                    partId: results[i].partId,
                                    partName: results[i].partName,
                                    employeeId: results[i].employeeId,
                                    employeeName: results[i].employeeName,

                                    day1Vacation: (results[i].day1 === null) ? '' : results[i].day1.substring(0, 1),
                                    day1Start: results[i].day1 === null ? '' : results[i].day1.split('-')[1].split(',')[0] || '',
                                    day1End: results[i].day1 === null ? '' : results[i].day1.split('-')[1].split(',')[1] || '',
                                    day1Over: results[i].day1 === null ? '' : results[i].day1.split('-')[1].split(',')[2] || '',

                                    day2Vacation: results[i].day2 === null ? '' : results[i].day2.substring(0, 1),
                                    day2Start: results[i].day2 === null ? '' : results[i].day2.split('-')[1].split(',')[0] || '',
                                    day2End: results[i].day2 === null ? '' : results[i].day2.split('-')[1].split(',')[1] || '',
                                    day2Over: results[i].day2 === null ? '' : results[i].day2.split('-')[1].split(',')[2] || '',

                                    day3Vacation: results[i].day3 === null ? '' : results[i].day3.substring(0, 1),
                                    day3Start: results[i].day3 === null ? '' : results[i].day3.split('-')[1].split(',')[0] || '',
                                    day3End: results[i].day3 === null ? '' : results[i].day3.split('-')[1].split(',')[1] || '',
                                    day3Over: results[i].day3 === null ? '' : results[i].day3.split('-')[1].split(',')[2] || '',

                                    day4Vacation: results[i].day4 === null ? '' : results[i].day4.substring(0, 1),
                                    day4Start: results[i].day4 === null ? '' : results[i].day4.split('-')[1].split(',')[0] || '',
                                    day4End: results[i].day4 === null ? '' : results[i].day4.split('-')[1].split(',')[1] || '',
                                    day4Over: results[i].day4 === null ? '' : results[i].day4.split('-')[1].split(',')[2] || '',

                                    day5Vacation: results[i].day5 === null ? '' : results[i].day5.split('-')[0],
                                    day5Start: results[i].day5 === null ? '' : results[i].day5.split('-')[1].split(',')[0] || '',
                                    day5End: results[i].day5 === null ? '' : results[i].day5.split('-')[1].split(',')[1] || '',
                                    day5Over: results[i].day5 === null ? '' : results[i].day5.split('-')[1].split(',')[2] || '',

                                    day6Vacation: results[i].day6 === null ? '' : results[i].day6.split('-')[0] || '',
                                    day6Start: results[i].day6 === null ? '' : results[i].day6.split('-')[1].split(',')[0] || '',
                                    day6End: results[i].day6 === null ? '' : results[i].day6.split('-')[1].split(',')[1] || '',
                                    day6Over: results[i].day6 === null ? '' : results[i].day6.split('-')[1].split(',')[2] || '',

                                    day7Vacation: results[i].day7 === null ? '' : results[i].day7.substring(0, 1),
                                    day7Start: results[i].day7 === null ? '' : results[i].day7.split('-')[1].split(',')[0] || '',
                                    day7End: results[i].day7 === null ? '' : results[i].day7.split('-')[1].split(',')[1] || '',
                                    day7Over: results[i].day7 === null ? '' : results[i].day7.split('-')[1].split(',')[2] || '',

                                    day8Vacation: results[i].day8 === null ? '' : results[i].day8.substring(0, 1),
                                    day8Start: results[i].day8 === null ? '' : results[i].day8.split('-')[1].split(',')[0] || '',
                                    day8End: results[i].day8 === null ? '' : results[i].day8.split('-')[1].split(',')[1] || '',
                                    day8Over: results[i].day8 === null ? '' : results[i].day8.split('-')[1].split(',')[2] || '',

                                    day9Vacation: results[i].day9 === null ? '' : results[i].day9.substring(0, 1),
                                    day9Start: results[i].day9 === null ? '' : results[i].day9.split('-')[1].split(',')[0] || '',
                                    day9End: results[i].day9 === null ? '' : results[i].day9.split('-')[1].split(',')[1] || '',
                                    day9Over: results[i].day9 === null ? '' : results[i].day9.split('-')[1].split(',')[2] || '',

                                    day10Vacation: results[i].day10 === null ? '' : results[i].day10.substring(0, 1),
                                    day10Start: results[i].day10 === null ? '' : results[i].day10.split('-')[1].split(',')[0] || '',
                                    day10End: results[i].day10 === null ? '' : results[i].day10.split('-')[1].split(',')[1] || '',
                                    day10Over: results[i].day10 === null ? '' : results[i].day10.split('-')[1].split(',')[2] || '',

                                    day11Vacation: results[i].day11 === null ? '' : results[i].day11.substring(0, 1),
                                    day11Start: results[i].day11 === null ? '' : results[i].day11.split('-')[1].split(',')[0] || '',
                                    day11End: results[i].day11 === null ? '' : results[i].day11.split('-')[1].split(',')[1] || '',
                                    day11Over: results[i].day11 === null ? '' : results[i].day11.split('-')[1].split(',')[2] || '',

                                    day12Vacation: results[i].day12 === null ? '' : results[i].day12.substring(0, 1),
                                    day12Start: results[i].day12 === null ? '' : results[i].day12.split('-')[1].split(',')[0] || '',
                                    day12End: results[i].day12 === null ? '' : results[i].day12.split('-')[1].split(',')[1] || '',
                                    day12Over: results[i].day12 === null ? '' : results[i].day12.split('-')[1].split(',')[2] || '',

                                    day13Vacation: results[i].day13 === null ? '' : results[i].day13.substring(0, 1),
                                    day13Start: results[i].day13 === null ? '' : results[i].day13.split('-')[1].split(',')[0] || '',
                                    day13End: results[i].day13 === null ? '' : results[i].day13.split('-')[1].split(',')[1] || '',
                                    day13Over: results[i].day13 === null ? '' : results[i].day13.split('-')[1].split(',')[2] || '',

                                    day14Vacation: results[i].day14 === null ? '' : results[i].day14.substring(0, 1),
                                    day14Start: results[i].day14 === null ? '' : results[i].day14.split('-')[1].split(',')[0] || '',
                                    day14End: results[i].day14 === null ? '' : results[i].day14.split('-')[1].split(',')[1] || '',
                                    day14Over: results[i].day14 === null ? '' : results[i].day14.split('-')[1].split(',')[2] || '',

                                    day15Vacation: results[i].day15 === null ? '' : results[i].day15.substring(0, 1),
                                    day15Start: results[i].day15 === null ? '' : results[i].day15.split('-')[1].split(',')[0] || '',
                                    day15End: results[i].day15 === null ? '' : results[i].day15.split('-')[1].split(',')[1] || '',
                                    day15Over: results[i].day15 === null ? '' : results[i].day15.split('-')[1].split(',')[2] || '',

                                    day16Vacation: results[i].day16 === null ? '' : results[i].day16.substring(0, 1),
                                    day16Start: results[i].day16 === null ? '' : results[i].day16.split('-')[1].split(',')[0] || '',
                                    day16End: results[i].day16 === null ? '' : results[i].day16.split('-')[1].split(',')[1] || '',
                                    day16Over: results[i].day16 === null ? '' : results[i].day16.split('-')[1].split(',')[2] || '',

                                    day17Vacation: results[i].day17 === null ? '' : results[i].day17.substring(0, 1),
                                    day17Start: results[i].day17 === null ? '' : results[i].day17.split('-')[1].split(',')[0] || '',
                                    day17End: results[i].day17 === null ? '' : results[i].day17.split('-')[1].split(',')[1] || '',
                                    day17Over: results[i].day17 === null ? '' : results[i].day17.split('-')[1].split(',')[2] || '',

                                    day18Vacation: results[i].day18 === null ? '' : results[i].day18.substring(0, 1),
                                    day18Start: results[i].day18 === null ? '' : results[i].day18.split('-')[1].split(',')[0] || '',
                                    day18End: results[i].day18 === null ? '' : results[i].day18.split('-')[1].split(',')[1] || '',
                                    day18Over: results[i].day18 === null ? '' : results[i].day18.split('-')[1].split(',')[2] || '',

                                    day19Vacation: results[i].day19 === null ? '' : results[i].day19.substring(0, 1),
                                    day19Start: results[i].day19 === null ? '' : results[i].day19.split('-')[1].split(',')[0] || '',
                                    day19End: results[i].day19 === null ? '' : results[i].day19.split('-')[1].split(',')[1] || '',
                                    day19Over: results[i].day19 === null ? '' : results[i].day19.split('-')[1].split(',')[2] || '',

                                    day20Vacation: results[i].day20 === null ? '' : results[i].day20.substring(0, 1),
                                    day20Start: results[i].day20 === null ? '' : results[i].day20.split('-')[1].split(',')[0] || '',
                                    day20End: results[i].day20 === null ? '' : results[i].day20.split('-')[1].split(',')[1] || '',
                                    day20Over: results[i].day20 === null ? '' : results[i].day20.split('-')[1].split(',')[2] || '',

                                    day21Vacation: results[i].day21 === null ? '' : results[i].day21.substring(0, 1),
                                    day21Start: results[i].day21 === null ? '' : results[i].day21.split('-')[1].split(',')[0] || '',
                                    day21End: results[i].day21 === null ? '' : results[i].day21.split('-')[1].split(',')[1] || '',
                                    day21Over: results[i].day21 === null ? '' : results[i].day21.split('-')[1].split(',')[2] || '',

                                    day22Vacation: results[i].day22 === null ? '' : results[i].day22.substring(0, 1),
                                    day22Start: results[i].day22 === null ? '' : results[i].day22.split('-')[1].split(',')[0] || '',
                                    day22End: results[i].day22 === null ? '' : results[i].day22.split('-')[1].split(',')[1] || '',
                                    day22Over: results[i].day22 === null ? '' : results[i].day22.split('-')[1].split(',')[2] || '',

                                    day23Vacation: results[i].day23 === null ? '' : results[i].day23.substring(0, 1),
                                    day23Start: results[i].day23 === null ? '' : results[i].day23.split('-')[1].split(',')[0] || '',
                                    day23End: results[i].day23 === null ? '' : results[i].day23.split('-')[1].split(',')[1] || '',
                                    day23Over: results[i].day23 === null ? '' : results[i].day23.split('-')[1].split(',')[2] || '',

                                    day24Vacation: results[i].day24 === null ? '' : results[i].day24.substring(0, 1),
                                    day24Start: results[i].day24 === null ? '' : results[i].day24.split('-')[1].split(',')[0] || '',
                                    day24End: results[i].day24 === null ? '' : results[i].day24.split('-')[1].split(',')[1] || '',
                                    day24Over: results[i].day24 === null ? '' : results[i].day24.split('-')[1].split(',')[2] || '',

                                    day25Vacation: results[i].day25 === null ? '' : results[i].day25.substring(0, 1),
                                    day25Start: results[i].day25 === null ? '' : results[i].day25.split('-')[1].split(',')[0] || '',
                                    day25End: results[i].day25 === null ? '' : results[i].day25.split('-')[1].split(',')[1] || '',
                                    day25Over: results[i].day25 === null ? '' : results[i].day25.split('-')[1].split(',')[2] || '',

                                    day26Vacation: results[i].day26 === null ? '' : results[i].day26.substring(0, 1),
                                    day26Start: results[i].day26 === null ? '' : results[i].day26.split('-')[1].split(',')[0] || '',
                                    day26End: results[i].day26 === null ? '' : results[i].day26.split('-')[1].split(',')[1] || '',
                                    day26Over: results[i].day26 === null ? '' : results[i].day26.split('-')[1].split(',')[2] || '',

                                    day27Vacation: results[i].day27 === null ? '' : results[i].day27.substring(0, 1),
                                    day27Start: results[i].day27 === null ? '' : results[i].day27.split('-')[1].split(',')[0] || '',
                                    day27End: results[i].day27 === null ? '' : results[i].day27.split('-')[1].split(',')[1] || '',
                                    day27Over: results[i].day27 === null ? '' : results[i].day27.split('-')[1].split(',')[2] || '',

                                    day28Vacation: results[i].day28 === null ? '' : results[i].day28.substring(0, 1),
                                    day28Start: results[i].day28 === null ? '' : results[i].day28.split('-')[1].split(',')[0] || '',
                                    day28End: results[i].day28 === null ? '' : results[i].day28.split('-')[1].split(',')[1] || '',
                                    day28Over: results[i].day28 === null ? '' : results[i].day28.split('-')[1].split(',')[2] || '',

                                    day29Vacation: results[i].day29 === null ? '' : results[i].day29.substring(0, 1),
                                    day29Start: results[i].day29 === null ? '' : results[i].day29.split('-')[1].split(',')[0] || '',
                                    day29End: results[i].day29 === null ? '' : results[i].day29.split('-')[1].split(',')[1] || '',
                                    day29Over: results[i].day29 === null ? '' : results[i].day29.split('-')[1].split(',')[2] || '',

                                    day30Vacation: results[i].day30 === null ? '' : results[i].day30.substring(0, 1),
                                    day30Start: results[i].day30 === null ? '' : results[i].day30.split('-')[1].split(',')[0] || '',
                                    day30End: results[i].day30 === null ? '' : results[i].day30.split('-')[1].split(',')[1] || '',
                                    day30Over: results[i].day30 === null ? '' : results[i].day30.split('-')[1].split(',')[2] || '',

                                    day31Vacation: results[i].day31 === null ? '' : results[i].day31.substring(0, 1),
                                    day31Start: results[i].day31 === null ? '' : results[i].day31.split('-')[1].split(',')[0] || '',
                                    day31End: results[i].day31 === null ? '' : results[i].day31.split('-')[1].split(',')[1] || '',
                                    day31Over: results[i].day31 === null ? '' : results[i].day31.split('-')[1].split(',')[2] || ''
                                });
                            } else {
                                for (var j = 1; j <= 31; j++) {
                                    var day = 'day' + j;
                                    if (!data.dayDatas[index][day + 'Vacation']) {
                                        data.dayDatas[index][day + 'Vacation'] = results[i][day] === null ? '' : results[i][day].substring(0, 1) || '';
                                        data.dayDatas[index][day + 'Start'] = results[i][day] === null ? '' : results[i][day].split('-')[1].split(',')[0] || '';
                                        data.dayDatas[index][day + 'End'] = results[i][day] === null ? '' : results[i][day].split('-')[1].split(',')[1] || '';
                                        data.dayDatas[index][day + 'Over'] = results[i][day] === null ? '' : results[i][day].split('-')[1].split(',')[2] || '';
                                    }
                                }
                            }
                        }
                    }
                    callback();
                });
            }, function(err) {
                if (err) {
                    return callback(err);
                }
                callback(null, resDatas);
            });
        }
    });
}

//객체가 가지고있는 프로퍼티의 값을 통해서 그 객체가 배열의 몇번째에 있는지 찾는 함수
function findWithAttr(array, attr, value) {
    for(var i = 0; i < array.length; i += 1) {
        if(array[i][attr] === value) {
            return i;
        }
    }
    return -1;
}




module.exports.getMyReport = getMyReport;
module.exports.postMyReport = postMyReport;
module.exports.deleteMyReport = deleteMyReport;
module.exports.getParticularReport = getParticularReport;
module.exports.postVacation = postVacation;
module.exports.getExistingReport = getExistingReport;
module.exports.getAnalystCommuteState = getAnalystCommuteState;
module.exports.getReortByEmployeeId = getReortByEmployeeId;