var Report = require('../models/report');
var formidable = require('formidable');
var path = require('path');
var express = require('express');
var date = require('date-utils');
var fs = require('fs');
var xlsx = require('xlsx');
var CronJob = require('cron').CronJob;
var router = express.Router();
var isAuthenticated = require('./common').isAuthenticated;
var isAuthenticatedForMeasurer = require('./common').isAuthenticatedForMeasurer;

router.get('/', isAuthenticated, function(req, res, next) {
    var action = parseInt(req.query.action);
    var Reportid = parseInt(req.query.Reportid);

    if (action === 0 && !Reportid) { //필주
        var user_id = req.user.id;
        Report.reportList(user_id, function(err, result, name) {
            if(err) {
                return next(err);
            }
            Report.addReport(user_id, function(err, results) {
                if (err) {
                    return next(err);
                }
                res.render('main', {
                    // title : 'Icomwiz',
                    title : name +'님 반갑습니다.',
                    report : result,
                    leader : results[0].name,
                    member : results[1].team_member,
                    equipment : results[1].equipment_name,
                    location : results[1].location,
                    car_number : results[1].car_number,
                    car_type : results[1].car_type,
                    report_id : result[0].id
                });
            });
        });
    } else if ( action === 1 && !Reportid) { //재성
        var teamId = req.query.teamId || -1;
        Report.getReportsByteamId(teamId, function(err, result) {
            if (err) {
                return next(err);
            }
            res.send({
                result: result
            });
        });
    } else if(action === 0 && Reportid) { //필주
        var info = {};
        info.user_id = req.user.id;
        info.Reportid = req.query.Reportid;
        Report.updateReportSelect(info, function(err, result) {
            if (err) {
                return next(err);
            }
            res.send({
                result : result
            });
        });
    } else if(action === 2) { //재성
        var resData = {};
        resData.teamId = req.query.teamId;
        resData.date = req.query.date;
        Report.getReportDetailperDate(resData, function(err, result) {
            if (err) {
                return next(err);
            }
            res.render('parts-team-report',
                {
                    teamId: req.query.teamId,
                    teamName: result.teamName,
                    date: resData.date,
                    teamMember: result.teamMember,
                    teamLeader: result.teamLeader,
                    location: result.location,
                    employees: result.employees,
                    carType: result.carType,
                    carNumber: result.carNumber,
                    carManager: result.carManager,
                    carMileageBefore: result.carMileageBefore,
                    carMileageAfter: result.carMileageAfter,
                    carRefuelState: result.carRefuelState,
                    performances: result.performances,
                    measureObj: result.measureObj,
                    totalDelayTime: result.totalDelayTime,
                    totalErrorCount: result.totalErrorCount,
                    avgWorkDetails: result.avgWorkDetails,
                    finishInfos: result.finishInfos
            });
        });
    } else {
        res.send(new Error('action 지정 하세요'));
    }
});

router.delete('/:id', isAuthenticatedForMeasurer, function(req, res, next) {
    var reportid = req.params.id;
    Report.deleteReport(reportid, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            result : 'ok'
        })
    });
});

router.post('/', isAuthenticatedForMeasurer, function(req, res, next) {
    var info = {};
    info.report = req.body;
    info.report.user_id = req.user.id;

    Report.newReport(info.report, function(err, result) {
        if(err) {
            return next(err);
        }
        res.send({result : "ok"});
    });
});

router.get('/confirm', isAuthenticatedForMeasurer, function(req, res, next) {
    function date(){
        var date = new Date();

        var year  = date.getFullYear();
        var month = date.getMonth() + 1; // 0부터 시작하므로 1더함 더함
        var day   = date.getDate();

        if(month < 10) {
            month = "0"+month;
        }
        if(day < 10) {
            day = "0"+day
        }
        return year +'-'+month+'-'+day;
    }

    var user_id = req.user.id;
    var info = {};
    info.user_id = user_id;
    info.date = date();
    info.report_id = req.query.report;
    console.log(info.report_id);


    //수정
    if (req.query.action == "edit") {
        Report.confirmEdit(info, function(err, dbInfo) {
            if (err) {
                return next(err);
            }
            Report.confirm(info, function(err, result) {
                if (err) {
                    return next(err);
                }
                res.render('confirm', {
                    report_id : info.report_id,
                    title : 'title',
                    ErrCount : result.ErrCount, //에러횟수
                    measure_inning : result.measure_inning, //측정진행상황
                    calls : result.calls, //콜 횟수
                    planCalls : result.planCalls, //계획된콜횟수
                    callsPercentage : result.callsPercentage+"% ("+result.calls+"/"+result.planCalls+")", //콜 백분위계산
                    team_leader : result.team_leader,
                    team_member : result.team_member,
                    location : result.location,
                    car_number : result.car_number,
                    car_type : result.car_type,
                    equipment_name : result.equipment_name,
                    car_mileage_before : result.car_mileage_before,
                    car_refuel_state : result.car_refuel_state,

                    cause_of_incompletion : dbInfo.report.cause_of_incompletion, //금일실적 미완료원인
                    plan_of_incompletion : dbInfo.report.plan_of_incompletion, //향후 실적 조치 방안
                    refueling_price : dbInfo.report.refueling_price, //금일주유금액
                    car_significant : dbInfo.report.car_significant, //금일차량특이사항
                    car_mileage_after : dbInfo.report.car_mileage_after, // 종료후 KM

                    ftp : {
                        id : dbInfo.FTP.id,
                        start : dbInfo.FTP.start_time,  //ftp 측정데이터업로드시작
                        end : dbInfo.FTP.end_time //ftp 측정데이터업로드끝
                    },
                    Returntime : {
                        id : dbInfo.Returntime.id,
                        start : dbInfo.Returntime.start_time, //측정종료복귀시작
                        end : dbInfo.Returntime.end_time, //측정종료복귀끝
                    }
                });
            });
        });
    } else { //생성
        Report.confirm(info, function(err, result) {
            if (err) {
                return next(err);
            }
            res.render('confirm', {
                report_id : null,
                title : 'title',
                ErrCount : result.ErrCount, //에러횟수
                measure_inning : result.measure_inning, //측정진행상황
                calls : result.calls, //콜 횟수
                planCalls : result.planCalls, //계획된콜횟수
                callsPercentage : result.callsPercentage+"% ("+result.calls+"/"+result.planCalls+")", //콜 백분위계산
                team_leader : result.team_leader,
                team_member : result.team_member,
                location : result.location,
                car_number : result.car_number,
                car_type : result.car_type,
                equipment_name : result.equipment_name,
                car_mileage_before : result.car_mileage_before,
                car_refuel_state : result.car_refuel_state
            });
        });
    }


});

router.post('/confirm', isAuthenticatedForMeasurer, function(req, res, next) {
    var info = req.body;
    info.report_id = req.query.report;
    info.refueling_price = parseInt(req.body.refueling_price) || 0;
    Report.confirmInsert(info, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({result : 'ok'});
    });
});

router.put('/confirm', isAuthenticatedForMeasurer, function(req, res, next) {
    var info = req.body;
    info.report_id = req.query.report;
    info.refueling_price = parseInt(req.body.refueling_price) || 0;
    Report.confirmUpdate(info, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({result : 'ok'});
    });
});

router.put('/:id', isAuthenticatedForMeasurer, function(req, res, next) {
    var info = {};
    info.report = req.body;
    info.report.report_id = req.params.id;
    info.report.user_id = req.user.id;

    Report.updateReport(info, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({result : "ok"});
    });
});

//엑셀파일을 통해 계획 업로드 하기
router.post('/planner', isAuthenticated, function(req, res, next) {
    var form = new formidable.IncomingForm();
    form.uploadDir = path.join(__dirname, '../planners');
    form.keepExtensions = true;
    form.multiples = false;
    form.parse(req, function(err, fields, files) {
        if (err) {
            return next(err);
        }
        var srcExcelPath = files.uploadExcelfile.path;
        var date = new Date();
        var dt = date.toFormat('YYYY-MM-DD HH24-MI-SS');
        var today = date.toFormat('YYYY-MM-DD');

        var excelFileName = req.user.name + ' ' + dt + path.extname(srcExcelPath);
        var destExcelPath = path.join(path.dirname(srcExcelPath), excelFileName);
        fs.rename(srcExcelPath, destExcelPath, function(err) {
            if (err) {
                return next(err);
            }
            var plans = [];
            var planner = xlsx.readFile(destExcelPath);
            var worksheet1 = planner.Sheets['Sheet1'];
            for (z in worksheet1) {
                if (z.substring(1, z.length) > 2) {
                    if (z.substring(0, 1) === 'A') { //날짜
                        var plan = {};
                        plan.date = worksheet1[z].v;
                    } else if(z.substring(0, 1) === 'B') { //부서
                        plan.department = worksheet1[z].v.replace(/\s/gi,'');
                    } else if(z.substring(0, 1) === 'C') { //직책
                        plan.departmentPosition = worksheet1[z].v.replace(/\s/gi,'');
                    } else if(z.substring(0, 1) === 'D') { //파트
                        plan.partName = (worksheet1[z].v).replace(/\s/gi,'');
                    } else if(z.substring(0, 1) === 'E') { //팀
                        plan.teamName = worksheet1[z].v.replace(/\s/gi,'');
                    } else if(z.substring(0, 1) === 'F') { //조
                        plan.teamNo = worksheet1[z].v;
                    } else if(z.substring(0, 1) === 'G') { //조원
                        plan.teamMember = worksheet1[z].v;
                    } else if(z.substring(0, 1) === 'H') { //직위
                        plan.teamPosition = worksheet1[z].v;
                    } else if(z.substring(0, 1) === 'I') { //이름
                        plan.name = worksheet1[z].v.replace(/\s/gi,'');
                    } else if(z.substring(0, 1) === 'J') { //휴대폰 번호
                        plan.phoneNumber = worksheet1[z].v.replace(/\s/gi,'');
                    } else if(z.substring(0, 1) === 'K') { //이메일
                        plan.email = worksheet1[z].v.replace(/\s/gi,'');
                    } else if(z.substring(0, 1) === 'L') { //측정장비
                        plan.equipmentName = worksheet1[z].v;
                    } else if(z.substring(0, 1) === 'M') { //차량번호
                        plan.carNumber = worksheet1[z].v.replace(/\s/gi,'');
                    } else if(z.substring(0, 1) === 'N') { //차량종류
                        plan.carType = worksheet1[z].v.replace(/\s/gi,'');
                    } else if(z.substring(0, 1) === 'O') { //업무후 차량 관리자
                        plan.carManager = worksheet1[z].v;
                    } else if(z.substring(0, 1) === 'P') { //측정지역
                        plan.location = worksheet1[z].v;
                    } else if(z.substring(0, 1) === 'Q') { //측정 목표 호량
                        plan.calls = worksheet1[z].v;
                        plans.push(plan);
                    }
                }
            }
            // for (var i = 0; i < plans.length; i++) {
            //
            // }
            var i = 0;
            var loop = setInterval(function () {
                if (i < plans.length) {
                    var date = plans[i].date.split('-'); //2016-10-31 형식으로 되어있는 날짜 형식을 - 단위로 자름.
                    if (date[1].length === 1) { //date[1]은 월. 1월이라 적었을 경우 앞에 0을 붙여 01로 바꿔줌
                        date[1] = '0' + date[1];
                    }
                    if (date[2].length === 1) { //date[2]는 일. 1일이라 적었을 경우 앞에 0을 붙여 01로 바꿔줌
                        date[2] = '0' + date[2];
                    }
                    date = date[0] + '-' + date[1] + '-' + date[2];
                    if (date === today) { //계획의 날짜가 오늘이면 바로 업데이트
                        Report.updatePlan(plans[i], function (err, result) {
                            if (err) {
                                return next(err);
                            }
                        });
                    } else { //계획의 날짜가 오늘이 아니면 cron을 통해 스케쥴링
                        var date = plans[i].date.split('-'); //2016-10-31 형식으로 되어있는 날짜 형식을 - 단위로 자름.
                        var month = (parseInt(date[1]) - 1).toString(); //01월이라 되어있는 형식을 앞의 0을 제거하여 표현
                        var day = parseInt(date[2]).toString(); //01일이라 되어있는 형식을 앞의 0을 제거하여 표현
                        var cronTime = '0 0 0' + ' ' + day + ' ' + month + ' ' + '*';
                        (function (index) {
                            var job = new CronJob(cronTime, function () {
                                Report.updatePlan(plans[index], function (err, result) {
                                    if (err) {
                                        return next(err);
                                    }
                                });
                                job.stop();
                            }, function () {
                            }, true, 'Asia/Seoul');
                        })(i);
                    }
                    i++;
                } else {
                    clearInterval(loop);
                    res.send({
                        result: '계획서 업로드 완료!'
                    });
                }
            }, 100);
        });
    });

});

//에러 통계 보기
router.get('/statistics', isAuthenticated, function(req, res, next) {
    var action = parseInt(req.query.action);
    if (action === 0) { //일별
        Report.getErrorStatisticsPerDay(function(err, result) {
            if (err) {
                return next(err);
            }
            console.log(result[0]);
            res.render('parts-day-error', {
                result: result
            });
        });
    } else if (action === 1) { //주별
        Report.getErrorStatisticsPerWeek(function(err, result) {
            if (err) {
                return next(err);
            }
            console.log(result);
            res.render('parts-week-error', {
                result: result
            });
        });
    } else if (action === 2) { //월별
        Report.getErrorStatisticsPerMonth(function(err, result) {
            if (err) {
                return next(err);
            }
            res.render('parts-month-error', {
                result: result
            });
        });
    } else if (action === 3) { //분기별
        Report.getErrorStatisticsPerQuarter(function(err, result) {
            if (err) {
                return next(err);
            }
            res.render('parts-quarter-error', {
                result: result
            });
        });
    } else if (action === 4) { //일별 자세한 에러 사항 보기
        var reqData = {};
        reqData.teamId = parseInt(req.query.teamId);
        reqData.date = req.query.date;
        reqData.obstacleClassification = decodeURI(req.query.obstacleClassification);
        Report.getDetailErrorStatePerDay(reqData, function(err, result) {
            if (err) {
                return next(err);
            }
            res.send({
                result: result
            });
        });
    } else if (action === 5) { //주별 자세한 에러 사항 보기
        var reqData = {};
        reqData.teamId = parseInt(req.query.teamId);
        reqData.startDay = req.query.startDay;
        reqData.endDay = req.query.endDay;
        reqData.obstacleClassification = decodeURI(req.query.obstacleClassification);
        Report.getDetailErrorStatePerWeek(reqData, function(err, result) {
            if (err) {
                return next(err);
            }
            console.log(result);
            res.send({
                result: result
            });
        });
    } else if (action === 6) { //월별 자세한 에러 사항 보기
        var reqData = {};
        reqData.teamId = parseInt(req.query.teamId);
        reqData.year = parseInt(req.query.year);
        reqData.month = parseInt(req.query.month);
        reqData.obstacleClassification = decodeURI(req.query.obstacleClassification);
        Report.getDetailErrorStatePerMonth(reqData, function(err, result) {
            if (err) {
                return next(err);
            }
            res.send({
                result: result
            });
        });
    } else if (action === 7) { //분기별 자세한 에러 사항 보기
        var reqData = {};
        reqData.teamId = parseInt(req.query.teamId);
        reqData.year = parseInt(req.query.year);
        reqData.quarter = parseInt(req.query.quarter);
        reqData.obstacleClassification = decodeURI(req.query.obstacleClassification);
        Report.getDetailErrorStatePerQuarter(reqData, function(err, result) {
            if (err) {
                return next(err);
            }
            res.send({
                result: result
            });
        });
    }
});

//차량들 정보 보기
router.get('/cars', isAuthenticated, function(req, res, next) {
    Report.getCarState(function(err, result) {
        if (err) {
            return next(err);
        }
        res.render('parts-car-state', {
            result: result
        });
    });
});

//차량들 자세한 정보 가져오기
router.get('/detailcarinfo', isAuthenticated, function(req, res, next) {
    var reqData = {};
    reqData.date = req.query.year + '-' + req.query.month + '-' + req.query.day;
    reqData.teamName = decodeURI(req.query.teamName);
    Report.getDetailCarState(reqData, function(err, result) {
       if (err) {
           return next(err);
       }
       res.send({
           detailResult: result
       });
    });
});

//콜수 현황 보기
router.get('/calls', isAuthenticated, function(req, res, next) {
    var action = parseInt(req.query.action);
    if (action === 0) { //일별 호량
        Report.getCallsPerDay(function (err, result) {
            if (err) {
                return next(err);
            }
            if (result === 0 ) {
                res.send({
                    result: 0
                });
            } else {
                res.render('parts-day-calls', {
                    result: result
                });
            }
        });
    } else if (action === 1) { //월별 호량
        Report.getCallsPerMonth(function (err, result) {
            if (err) {
                return next(err);
            }
            res.render('parts-month-calls', {
                result: result
            });
        });
    }
});

//<script>코드에서 morrisjs라이브러리 사용하여 그래프 표현을 위해 ajax로 콜수 현황 다시 불러오기
router.get('/calls/ajax', isAuthenticated, function(req, res, next) {
    var action = parseInt(req.query.action);
    if (action === 0) { //일별 호량
        Report.getCallsPerDay(function (err, result) {
            if (err) {
                return next(err);
            }
            if (result === 0 ) {
                res.send({
                    result: 0
                });
            } else {
                res.send({
                    result: result
                });
            }
        });
    } else if (action === 1) { //월별 호량
        Report.getCallsPerMonth(function (err, result) {
            if (err) {
                return next(err);
            }
            res.send({
                result: result
            });
        });
    }
});

module.exports = router;
