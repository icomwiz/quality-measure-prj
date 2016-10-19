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

module.exports.report = report;