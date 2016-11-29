var dbPool = require('./common').dbPool;

function getMyReportDetails(reqData, callback) {
    var sql_select_my_report_details =
        'SELECT ard.start_time startTime, ard.end_time endTime, ard.work_details workDetails, ard.note, ard.type ' +
        'FROM analyst_report ar JOIN analyst_report_details ard ON(ar.id = ard.analyst_report_id) ' +
        'WHERE ar.employee_id = ? AND ar.date = str_to_date(?,\'%Y-%m-%d\')';

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_select_my_report_details, [reqData.employeeId, reqData.date], function(err, results) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            callback(null, results);
        });
    });
}

module.exports.getMyReportDetails = getMyReportDetails;
