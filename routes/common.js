function isAuthenticatedForMeasurer(req, res, next) { //측정자용 인증확인
    if ((!req.user) || (req.user.teamPosition === 0) || (req.user.teamPosition === 1) || (req.user.teamPosition === 2)) { //세션이 없거나 분석자일 때
        res.redirect('http://localhost:3000/auth');
    }
}

function isAuthenticatedForAnalyst(req, res, next) { //분석자용 인증 확인
    if ((!req.user) || (req.user.teamPosition === 3) || (req.user.teamPosition === 4)) { //세션이 없거나 측정자일 때
        res.redirect('http://localhost:3000/auth');
    }
}

module.exports.isAuthenticatedForMeasurer = isAuthenticatedForMeasurer;
module.exports.isAuthenticatedForAnalyst = isAuthenticatedForAnalyst;