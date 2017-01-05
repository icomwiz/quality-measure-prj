var dbPool = require('./common').dbPool;
var async = require('async');

//OUTPUT: teamName
function getTeamList(date, callback) {
    var sql_select_owns_teams =
        'SELECT t.name teamName ' +
        'FROM team t JOIN report r ON(t.id = r.team_id) ' +
        'WHERE t.team_no > 0 AND r.type = 1 AND r.date = str_to_date(?, \'%Y-%m-%d\') ' +
        'GROUP BY t.name';

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_select_owns_teams, [date], function(err, results) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            return callback(err, results);
        });
    });
}

// INPUT: partId, OUTPUT: teamId, teamName, teamNo
function getTeamListByTeamName(reqData, callback) {
    var sql_select_owns_teams =
        'SELECT t.id teamId, t.name teamName, t.team_no teamNo ' +
        'FROM team t JOIN report r ON(r.team_id = t.id) ' +
        'WHERE t.name = ? AND r.type = 1 AND r.date = str_to_date(?, \'%Y-%m-%d\') ' +
        'GROUP BY t.id';

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_select_owns_teams, [reqData.teamName, reqData.date], function(err, results) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            return callback(err, results);
        });
    });
}

//내근자가 측정결과를 분석하고 에러를 발견했을 때 해당팀의 특정날짜에 생긴 에러사항을 저장시키기 위한 함수
function setAnalystEvaluationError(reqData, callback) {
    var sql_select_team_analyst_error =
        'SELECT * ' +
        'FROM team_analyst_error ' +
        'WHERE team_id = ? AND analyst_evaluation_error_id = (SELECT id ' +
                                                             'FROM analyst_evaluation_error ' +
                                                             'WHERE name = CASE WHEN ? = \'uploadError\' THEN \'업로드오류\' ' +
                                                                               'WHEN ? = \'compressionNameError\' THEN \'압축파일명오류\' ' +
                                                                               'WHEN ? = \'settingError\' THEN \'Setting오류\' ' +
                                                                               'WHEN ? = \'etcError\' THEN \'기타오류\' ' +
                                                                               'WHEN ? = \'conversionError\' THEN \'Conversion Error\' ' +
                                                                               'WHEN ? = \'serverError\' THEN \'Server오류\' ' +
                                                                               'WHEN ? = \'segmentOmissionError\' THEN \'Segment누락\' ' +
                                                                               'WHEN ? = \'compressionLiftError\' THEN \'압축해제에러\' ' +
                                                                               'WHEN ? = \'etc\' THEN \'기타\' END) AND date = STR_TO_DATE(?, \'%Y-%m-%d\')';

    var sql_insert_team_analyst_error =
        'INSERT INTO team_analyst_error(team_id, analyst_evaluation_error_id, date, employee_id, obstacle_phenomenon, obstacle_result) ' +
        'VALUES(?, (SELECT id ' +
                   'FROM analyst_evaluation_error ' +
                   'WHERE name = CASE WHEN ? = \'uploadError\' THEN \'업로드오류\' ' +
                                     'WHEN ? = \'compressionNameError\' THEN \'압축파일명오류\' ' +
                                     'WHEN ? = \'settingError\' THEN \'Setting오류\' ' +
                                     'WHEN ? = \'etcError\' THEN \'기타오류\' ' +
                                     'WHEN ? = \'conversionError\' THEN \'Conversion Error\' ' +
                                     'WHEN ? = \'serverError\' THEN \'Server오류\' ' +
                                     'WHEN ? = \'segmentOmissionError\' THEN \'Segment누락\' ' +
                                     'WHEN ? = \'compressionLiftError\' THEN \'압축해제에러\' ' +
                                     'WHEN ? = \'etc\' THEN \'기타\' END), STR_TO_DATE(?, \'%Y-%m-%d\'), ?, ?, ?)';

    var sql_delete_team_analyst_error =
        'DELETE FROM team_analyst_error ' +
        'WHERE team_id = ? AND analyst_evaluation_error_id = (SELECT id ' +
                                                             'FROM analyst_evaluation_error ' +
                                                             'WHERE name = CASE WHEN ? = \'uploadError\' THEN \'업로드오류\' ' +
                                                                               'WHEN ? = \'compressionNameError\' THEN \'압축파일명오류\' ' +
                                                                               'WHEN ? = \'settingError\' THEN \'Setting오류\' ' +
                                                                               'WHEN ? = \'etcError\' THEN \'기타오류\' ' +
                                                                               'WHEN ? = \'conversionError\' THEN \'Conversion Error\' ' +
                                                                               'WHEN ? = \'serverError\' THEN \'Server오류\' ' +
                                                                               'WHEN ? = \'segmentOmissionError\' THEN \'Segment누락\' ' +
                                                                               'WHEN ? = \'compressionLiftError\' THEN \'압축해제에러\' ' +
                                                                               'WHEN ? = \'etc\' THEN \'기타\' END) AND date = STR_TO_DATE(?, \'%Y-%m-%d\')';

    var sql_update_team_analyst_error =
        'UPDATE team_analyst_error ' +
        'SET employee_id = ? AND obstacle_phenomenon = ? AND obstacle_result ' +
        'WHERE analyst_evaluation_error_id = (SELECT id ' +
                                             'FROM analyst_evaluation_error ' +
                                             'WHERE name = CASE WHEN ? = \'uploadError\' THEN \'업로드오류\' ' +
                                                               'WHEN ? = \'compressionNameError\' THEN \'압축파일명오류\' ' +
                                                               'WHEN ? = \'settingError\' THEN \'Setting오류\' ' +
                                                               'WHEN ? = \'etcError\' THEN \'기타오류\' ' +
                                                               'WHEN ? = \'conversionError\' THEN \'Conversion Error\' ' +
                                                               'WHEN ? = \'serverError\' THEN \'Server오류\' ' +
                                                               'WHEN ? = \'segmentOmissionError\' THEN \'Segment누락\' ' +
                                                               'WHEN ? = \'compressionLiftError\' THEN \'압축해제에러\' ' +
                                                               'WHEN ? = \'etc\' THEN \'기타\' END) AND date = str_to_date(?, \'%Y-%m-%d\')';

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        async.each(reqData.errors, function(item, callback) {
            if (parseInt(item.value) === 0 ) { //체크되어있지 않다면
                setErrorLift(item.name, function(err) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null);
                });
            } else { //체크되어있다면
                setErrorChk(item.name, item.phenomenon, item.result, function(err) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null);
                });
            }
        }, function(err) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            callback(null);
        });

        //에러 저장하기
        function setErrorChk(errType, phenomenon, result, callback) {
            dbConn.query(sql_select_team_analyst_error, [reqData.teamId, errType, errType, errType, errType, errType, errType, errType, errType, errType, reqData.date], function(err, results) {
                if (err) {
                    return callback(err);
                }
                if (results.length === 0) { //에러가 테이블에 저장되어 있는지 없는지 검사한 뒤 저장되어있지 않다면 insert하기
                    dbConn.query(sql_insert_team_analyst_error, [reqData.teamId, errType, errType, errType, errType, errType, errType, errType, errType, errType, reqData.date, reqData.employeeId, phenomenon, result], function(err, results) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null);
                    });
                } else { //테이블에 이미 저장되어 있다면 업데이트 하기
                    callback(null);
                }
            });
        }

        function setErrorUpdate(errType, phenomenon, result, callback) {

        }

        //에러 해제하기
        function setErrorLift(errType, callback) {
            dbConn.query(sql_select_team_analyst_error, [reqData.teamId, errType, errType, errType, errType, errType, errType, errType, errType, errType, reqData.date], function(err, results) {
                if (err) {
                    return callback(err);
                }
                if (results.length === 0) { //에러가 테이블에 저장되어 있는지 없는지 검사한 뒤 저장되어있지 않다면
                    callback(null);
                } else { //저장되어 있다면
                    dbConn.query(sql_delete_team_analyst_error, [reqData.teamId, errType, errType, errType, errType, errType, errType, errType, errType, errType, reqData.date], function(err, results) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null);
                    });
                }
            });
        }
    });
}

//특정 팀의 어떤날의 내근자가 발견한 에러를 가져오는 함수
function getAnalystEvaluationError(reqData, callback) {
    var select_team_analyst_report =
        'SELECT CASE WHEN aee.name = \'업로드오류\' THEN \'uploadError\' ' +
                    'WHEN aee.name = \'압축파일명오류\' THEN \'compressionNameError\' ' +
                    'WHEN aee.name = \'Setting오류\' THEN \'settingError\' ' +
                    'WHEN aee.name = \'기타오류\' THEN \'etcError\' ' +
                    'WHEN aee.name = \'Conversion Error\' THEN \'conversionError\' ' +
                    'WHEN aee.name = \'Server오류\' THEN \'serverError\' ' +
                    'WHEN aee.name = \'Segment누락\' THEN \'segmentOmissionError\' ' +
                    'WHEN aee.name = \'압축해제에러\' THEN \'compressionLiftError\' ' +
                    'WHEN aee.name = \'기타\' THEN \'etc\' END errorName ' +
        'FROM team_analyst_error tae JOIN analyst_evaluation_error aee ON (tae.analyst_evaluation_error_id = aee.id) ' +
        'WHERE team_id = ? AND date = str_to_date(?, \'%Y-%m-%d\')';

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }

        dbConn.query(select_team_analyst_report, [reqData.teamId, reqData.date], function(err, results) {
            if (err) {
                return callback(err);
            }
            if (results.length === 0) {
                callback(null, 0);
            } else {
                var resData = [];
                for (var i = 0; i <results.length; i++) {
                    resData.push({
                        errorName: results[i].errorName
                    });
                }
                callback(null, resData);
            }
        });
    });
}

module.exports.getTeamList = getTeamList;
module.exports.getTeamListByTeamName = getTeamListByTeamName;
module.exports.setAnalystEvaluationError = setAnalystEvaluationError;
module.exports.getAnalystEvaluationError = getAnalystEvaluationError;