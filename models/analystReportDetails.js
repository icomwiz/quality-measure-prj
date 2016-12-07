var dbPool = require('./common').dbPool;

function getMyReportDetails(reqData, callback) {
    var sql_select_my_report_details =
        'SELECT TIME_FORMAT(ard.start_time,\'%H시 %i분\') startTime, TIME_FORMAT(ard.end_time,\'%H시 %i분\') endTime, ard.work_details workDetails, ard.note, ard.type ' +
        'FROM analyst_report ar JOIN analyst_report_details ard ON(ar.id = ard.analyst_report_id) ' +
        'WHERE ar.employee_id = ? AND ar.date = str_to_date(?,\'%Y-%m-%d\') ' +
        'ORDER BY startTime';

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

function postMyReportDetails(reqData, callback) {
    console.log(reqData);
    var sql_insert_my_report_details =
        'INSERT INTO analyst_report_details(analyst_report_id, start_time, end_time, work_details, note, type) ' +
        'VALUES(?, IF(? = \'\', NULL , ?), IF(? = \'\', NULL , ?), ?, ?, ?)';

    dbPool.getConnection(function(err, dbConn) {
       if (err) {
           return callback(err);
       }
       dbConn.query(sql_insert_my_report_details, [reqData.reportId, reqData.startTime, reqData.startTime, reqData.endTime, reqData.endTime, reqData.workDetails, reqData.note, reqData.type], function(err, results) {
           dbConn.release();
           if (err) {
              return callback(err);
           }
           callback(null, 1);
       });
    });
}

module.exports.getMyReportDetails = getMyReportDetails;
module.exports.postMyReportDetails = postMyReportDetails;
