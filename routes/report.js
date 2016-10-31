var Report = require('../models/report');
var Employee = require('../models/employee');
var formidable = require('formidable');
var path = require('path');
var express = require('express');
var date = require('date-utils');
var fs = require('fs');
var xlsx = require('xlsx');
var router = express.Router();

router.get('/', function(req, res, next) {
    var action = parseInt(req.query.action);
    var Reportid = parseInt(req.query.Reportid);
    if (action === 0 && !Reportid) {
        var user_id = req.user.id;
        Report.reportList(function(err, result) {
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
    } else if ( action === 1 && !Reportid) {
        var teamId = req.query.teamId || -1;
        Report.getReportsByteamId(teamId, function(err, result) {
            if (err) {
                return next(err);
            }
            res.send({
                result: result
            });
        });
    } else if(action === 0 && Reportid) {
        res.send({
            result : "1234"
        });
    }
    else {
        res.send(new Error('action 지정 하세요'));
    }
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
        console.log(today);

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
                    } else if(z.substring(0,1) === 'B') { //부서
                        plan.department = worksheet1[z].v;
                    } else if(z.substring(0,1) === 'C') { //직책
                        plan.departmentPosition = worksheet1[z].v;
                    } else if(z.substring(0,1) === 'D') { //파트
                        plan.partName = worksheet1[z].v.split(',');
                    } else if(z.substring(0,1) === 'E') { //팀
                        plan.teamName = worksheet1[z].v;
                    } else if(z.substring(0,1) === 'F') { //조
                        plan.teamNo = worksheet1[z].v;
                    } else if(z.substring(0,1) === 'G') { //직위
                        plan.teamPosition = worksheet1[z].v;
                    } else if(z.substring(0,1) === 'H') { //이름
                        plan.name = worksheet1[z].v;
                    } else if(z.substring(0,1) === 'I') { //휴대폰 번호
                        plan.phoneNumber = worksheet1[z].v;
                    } else if(z.substring(0,1) === 'J') { //이메일
                        plan.email = worksheet1[z].v;
                    } else if(z.substring(0,1) === 'K') { //측정 장비
                        plan.equipmentName = worksheet1[z].v;
                    } else if(z.substring(0,1) === 'L') { //차량 번호
                        plan.carNumber = worksheet1[z].v;
                    } else if(z.substring(0,1) === 'M') { //차량 종류
                        plan.carType = worksheet1[z].v;
                    } else if(z.substring(0,1) === 'N') { //업무 후 차량 관리자
                        plan.carManager = worksheet1[z].v;
                    } else if(z.substring(0,1) === 'O') { //측정 지역
                        plan.location = worksheet1[z].v;
                    } else if(z.substring(0,1) === 'P') { //일일 측정 목표 호량
                        plan.calls = worksheet1[z].v;
                        plans.push(plan);
                    }
                }
            }
            console.log(plans);
            for (var i = 0; i < plans.length; i++) {
                if (plans[i].date === today) { //계획의 날짜가 오늘이면 바로 업데이트
                    Report.updatePlan(plans[i], function(err, callback) {
                        if (err) {
                            return next(err);
                        }

                    });
                } else { //계획의 날짜가 오늘이 아니면 cron을 통해 스케쥴링

                }
            }
            res.send({
                result: '계획서 업로드 완료!'
            });
        });
    });
});

module.exports = router;
