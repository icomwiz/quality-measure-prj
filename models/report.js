var dbPool = require('./common').dbPool;

function report(callback) {
    dbPool.getConnection(function(err, dbConn) {
        var sql_select_report = "SELECT DISTINCT r.id, DATE_FORMAT(CONVERT_TZ(r.date, '+00:00', '+09:00'), '%Y-%m-%d') date, " +
                                "rd.location, rd.target1, t.name teamName "+
                                "FROM report r LEFT JOIN report_details rd ON (r.id = rd.report_id) "+
                                "JOIN employee e ON (r.employee_id = e.id) "+
                                "LEFT JOIN team t ON (t.id = e.team_id) ";
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_select_report, function(err, result) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            return callback(err, result);
        });
    });
}

// INPUT: teamName, OUTPUT: teamName, date, location
function getReportsByteamId(teamId, callback) {
    var sql_select_reports_order_by_date =
        "SELECT t.name teamName, t.team_no teamNo, DATE_FORMAT(CONVERT_TZ(r.date, '+00:00', '+09:00'), '%Y-%m-%d') date, r.location " +
        "FROM team t JOIN report r ON(t.id = r.team_id) " +
        "WHERE t.id = ? " +
        "GROUP BY r.date " +
        "ORDER BY r.date DESC";

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_select_reports_order_by_date, [teamId], function(err, results) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            callback(null, results);
        });
    })
}

module.exports.report = report;
module.exports.getReportsByteamId = getReportsByteamId;