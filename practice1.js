var express = require('express'), http = require('http'), path = require('path');
var bodyParser = require('body-parser'), static = require('serve-static');

var app = express();

app.set('port',process.env.PORT || 3000); //포트설정

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use('/',static(path.join(__dirname,'public')));

var router = express.Router();

router.route('/process/login').post(function(req,res){
    console.log('/process/login 처리함');

    var paramId = req.body.id||req.query.id;
    var paramPassword = req.body.password||req.query.password;

    res.writeHead('200',{'Content-Type':'text/html;charset=utf8'});
    res.write('<h1>express에서 응답한 결과</h1>');
    res.write('<h1>express에서 응답 '+paramId+' </h1>');
    res.write('<h1>express에서 응답 '+paramPassword+' </h1>');
    res.write("<br><br><a href='/login.html'>로그인 페이지로 돌아가기</a>");
    res.end();
    
});

app.use('/',router);


http.createServer(app).listen(app.get('port'),function(){
    console.log('익스프레스 서버 시작 : '+app.get('port'));
});



