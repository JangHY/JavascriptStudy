var express = require('express'), http = require('http'), path = require('path');
var bodyParser = require('body-parser'), static = require('serve-static');
var expressErrorHandler = require('express-error-handler');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');

var app = express();

app.set('port',process.env.PORT || 3000); //포트설정

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(expressSession({
    secret:'my key',
    resave:true,
    saveUninitialized:true
}));

app.use('/',static(path.join(__dirname,'public')));


var router = express.Router();

router.route('/process/login').post(function(req,res){
    console.log('/process/login 처리함');

    var paramId = req.body.id||req.query.id;
    var paramPassword = req.body.password||req.query.password;

    if(req.session.user){
        console.log('이미 로그인 되어 상품 페이지로 이동합니다.');
        res.redirect('/public/product.html');
    }else{
        req.session.user = {
            id: paramId,
            name: '소녀시대',
            authorized: true
        }
    }


    res.writeHead('200',{'Content-Type':'text/html;charset=utf8'});
    res.write('<h1>express에서 응답한 결과</h1>');
    res.write('<h1>express에서 응답 '+paramId+' </h1>');
    res.write('<h1>express에서 응답 '+paramPassword+' </h1>');
    res.write("<br><br><a href='/process/product'>상품 페이지로 돌아가기</a>");
    res.end();
    
});

router.route('/process/logout').get(function(req,res){
    console.log('/process/logout 호출됨');

    if(req.session.user){
        req.session.destroy(function(err){
            if(err) {throw err;}
            console.log("logout 완료");
            res.redirect('/login2.html');
        });
    }
    else{
        console.log("아직 로그인 안된 상태");
        res.redirect('/public/login2.html');
    }
})

router.route('/process/users/:id').get(function(req,res){
    console.log('/porcess/users/:id 처리함')

    var paramId = req.params.id;

    res.writeHead('200',{'Content-Type':'text/html;charset=utf8'});
    res.write('<h1>express에서 응답한 결과</h1>');
    res.write('<h1>paramId : '+paramId+' </h1>');
    res.end();
});

router.route('/process/showCookie').get(function(req,res){
    console.log('process/showCookie 호출됨');

    res.send(req.cookies);
});

router.route('/process/setUserCookie').get(function(req,res){
    console.log('/process/setUserCookie 호출됨');

    res.cookie('user',{
        id:'mike',
        name:'소녀시대',
        authorized:true
    });

    res.redirect('/process/showCookie');
});

router.route('/process/product').get(function(req,res){
    console.log('/process/product 호출됨');
    //session으로 로그인 되었는지 확인하여 분기
    if(req.session.user){
        res.redirect('/product.html');
    }else{
        res.redirect('/login2.html');
    }
});


app.use('/',router);

var errorHandler = expressErrorHandler({
    static:{
        '404':'./public/404.html'
    }
});

app.use(expressErrorHandler.httpError(404));
app.use(errorHandler);








http.createServer(app).listen(app.get('port'),function(){
    console.log('익스프레스 서버 시작 : '+app.get('port'));
});



