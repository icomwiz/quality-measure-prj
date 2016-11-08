var Report = require('../models/report');
var Employee = require('../models/employee');
var formidable = require('formidable');
var path = require('path');
var express = require('express');
var date = require('date-utils');
var fs = require('fs');
var xlsx = require('xlsx');
var CronJob = require('cron').CronJob;
var router = express.Router();

router.get('/', function(req, res, next) {
    var action = parseInt(req.query.action);
    var Reportid = parseInt(req.query.Reportid);
    if (action === 0 && !Reportid) { //필주
        var user_id = req.user.id;
        Report.reportList(user_id, function(err, result) {
            if(err) {
                return next(err);
            }
            Report.addReport(user_id, function(err, leader, member, equipment, results) {
                if (err) {
                    return next(err);
                }

                // console.log(results[2][0].id);
                // console.log(results[2][0].location);
                // console.log(results[2][0].car_number);
                // console.log(results[2][0].car_type);
                // console.log(results[2][0].type);
                // console.log(results[2][0].date);
                res.render('main', {
                    title : 'Icomwiz',
                    report : result,
                    leader : leader,
                    member : member,
                    equipment : equipment,
                    base : results[2][0],
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
            console.log(result.employees[0].work);
            res.render('partsteamreport',
                {
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
                    avgWorkDetails: result.avgWorkDetails
            });
        });
    } else {
        res.send(new Error('action 지정 하세요'));
    }
});

router.delete('/:id', function(req, res, next) {
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

router.post('/', function(req, res, next) {
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

router.put('/:id', function(req, res, next) {
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
router.post('/planner', function(req, res, next) {
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
                        plan.department = worksheet1[z].v;
                    } else if(z.substring(0, 1) === 'C') { //직책
                        plan.departmentPosition = worksheet1[z].v;
                    } else if(z.substring(0, 1) === 'D') { //파트
                        plan.partName = worksheet1[z].v.split(',');
                    } else if(z.substring(0, 1) === 'E') { //팀
                        plan.teamName = worksheet1[z].v;
                    } else if(z.substring(0, 1) === 'F') { //조
                        plan.teamNo = worksheet1[z].v;
                    } else if(z.substring(0, 1) === 'G') { //조원
                        plan.teamMember = worksheet1[z].v;
                    } else if(z.substring(0, 1) === 'H') { //직위
                        plan.teamPosition = worksheet1[z].v;
                    } else if(z.substring(0, 1) === 'I') { //이름
                        plan.name = worksheet1[z].v;
                    } else if(z.substring(0, 1) === 'J') { //휴대폰 번호
                        plan.phoneNumber = worksheet1[z].v;
                    } else if(z.substring(0, 1) === 'K') { //이메일
                        plan.email = worksheet1[z].v;
                    } else if(z.substring(0, 1) === 'L') { //측정장비
                        plan.equipmentName = worksheet1[z].v;
                    } else if(z.substring(0, 1) === 'M') { //차량번호
                        plan.carNumber = worksheet1[z].v;
                    } else if(z.substring(0, 1) === 'N') { //차량종류
                        plan.carType = worksheet1[z].v;
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
            for (var i = 0; i < plans.length; i++) {
                var date = plans[i].date.split('-'); //2016-10-31 형식으로 되어있는 날짜 형식을 - 단위로 자름.
                if (date[1].length === 1) { //date[1]은 월. 1월이라 적었을 경우 앞에 0을 붙여 01로 바꿔줌
                    date[1] = '0' + date[1];
                }
                if (date[2].length === 1) { //date[2]는 일. 1일이라 적었을 경우 앞에 0을 붙여 01로 바꿔줌
                    date[2] = '0' + date[2];
                }
                date = date[0] + '-' + date[1] + '-' + date[2];
                if (date === today) { //계획의 날짜가 오늘이면 바로 업데이트
                    Report.updatePlan(plans[i], function(err, result) {
                        if (err) {
                            return next(err);
                        }
                    });
                } else { //계획의 날짜가 오늘이 아니면 cron을 통해 스케쥴링
                    var date = plans[i].date.split('-'); //2016-10-31 형식으로 되어있는 날짜 형식을 - 단위로 자름.
                    var month = (parseInt(date[1]) - 1).toString(); //01월이라 되어있는 형식을 앞의 0을 제거하여 표현
                    var day = parseInt(date[2]).toString(); //01일이라 되어있는 형식을 앞의 0을 제거하여 표현
                    var cronTime = '0 0 0' + ' ' + day + ' ' + month + ' ' + '*';
                    console.log(cronTime);
                    var job = new CronJob(cronTime ,function() {
                        console.log('스케줄링 시작');
                        Report.updatePlan(plans[i], function(err, result) {
                            if (err) {
                                return next(err);
                            }
                        });
                        job.stop();
                    }, function() {
                    }, true, 'Asia/Seoul');
                }
            }
            res.send({
                result: '계획서 업로드 완료!'
            });
        });
    });
});

module.exports = router;
