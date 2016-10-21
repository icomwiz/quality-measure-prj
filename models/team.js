var dbPool = require('./common').dbPool;

// INPUT: partId, OUTPUT: teamName
function getOwnsTeamListByPartId(partId, callback) {
    var sql_select_owns_teams = 'SELECT t.name teamName ' +
        'FROM part p JOIN teams_parts tp ON(p.id = tp.part_id) ' +
        'JOIN team t ON(t.id = tp.team_id) ' +
        'WHERE p.id = ? AND t.team_no > 0 ' +
        'GROUP BY t.name';

    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_select_owns_teams, [partId], function(err, results) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            return callback(err, results);
        });
    });
}

// INPUT: partId, OUTPUT: teamId, teamName, teamNo
function getOwnsTeamListByTeamName(teamName, callback) {
    var sql_select_owns_teams = 'SELECT t.id teamId, t.name teamName, t.team_no teamNo ' +
                                'FROM part p JOIN teams_parts tp ON(p.id = tp.part_id) ' +
                                            'JOIN team t ON(t.id = tp.team_id) ' +
                                'WHERE t.name = ?';

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

module.exports.getOwnsTeamListByPartId = getOwnsTeamListByPartId;
module.exports.getOwnsTeamListByTeamName = getOwnsTeamListByTeamName;