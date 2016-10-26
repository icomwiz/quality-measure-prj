var dbPool = require('./common').dbPool;

//OUTPUT: teamName
function getTeamList(callback) {
    var sql_select_owns_teams = 'SELECT name teamName ' +
                                'FROM team ' +
                                'WHERE team_no > 0 ' +
                                'GROUP BY name';

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_select_owns_teams, function(err, results) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            return callback(err, results);
        });
    });
}

// INPUT: partId, OUTPUT: teamId, teamName, teamNo
function getTeamListByTeamName(teamName, callback) {
    var sql_select_owns_teams = 'SELECT t.id teamId, t.name teamName, t.team_no teamNo ' +
                                'FROM part p JOIN teams_parts tp ON(p.id = tp.part_id) ' +
                                            'JOIN team t ON(t.id = tp.team_id) ' +
                                'WHERE t.name = ? ' +
                                'GROUP BY t.id';

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_select_owns_teams, [teamName], function(err, results) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            return callback(err, results);
        });
    });
}

module.exports.getTeamList = getTeamList;
module.exports.getTeamListByTeamName = getTeamListByTeamName;