var express = require('express'), http = require('http'), path = require('path');
var bodyParser = require('body-parser'), static = require('serve-static');
var expressErrorHandler = require('express-error-handler');
var cookieParser = require('cookie-parser');//쿠키
var expressSession = require('express-session');//세션
var multer = require('multer');//파일업로드용
var fs = require('fs');//파일업로드용
var cors = require('cors');//다중 서버 접속 지원
var MongoClient = require('mongodb').MongoClient;
var mongoose = require('mongoose');
var mongodb = require('mongodb');
var crypto = require('crypto');
var user = require('./routes/user.js');
var config = require('./config');
var route_loader = require('./routes/route_loader.js');

var database = require('./database/database.js');;
var UserSchema;
var UserModel;


var app = express();

app.set('port',process.env.PORT || config.server_port); //포트설정

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

//public 폴더와 uploads 폴더 오픈
app.use('/public',static(path.join(__dirname,'public')));
app.use('/uploads',static(path.join(__dirname,'uploads')));

//쿠키 parser 설정
app.use(cookieParser());

//세션 설정
app.use(expressSession({
    secret:'my key',
    resave:true,
    saveUninitialized:true
}));

//클라이언트에서 ajax으로 요청했을 때 CORS (다중 서버 접속) 지원
app.use(cors());

var storage = multer.diskStorage({
    destination: function(req, file, callback){//폴더 위치
        callback(null, 'uploads')
    },
    filename: function(req, file, callback){//업로드 되는 파일 이름
        callback(null, file.originalname+Date.now())
    }
});

var upload = multer({
    storage: storage,
    limits:{//파일 크기, 개수 제한
        files: 10,
        fileSize: 1024*1024*1024
    }
});


var router = route_loader.init(app,express.Router());

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

router.route('/').get(function(req,res){
    console.log('/process/product 호출됨');
    //session으로 로그인 되었는지 확인하여 분기
    if(req.session.user){
        res.redirect('/public/product.html');
    }else{
        res.redirect('/public/login.html');
    }
});


router.route('/process/photo').post(upload.array('photo',1), function(req,res){
    console.log('/process/photo 호출됨');

    try{
        var files  = req.files;

        console.dir("#=======업로드 된 첫번째 파일 정보=======#");
        console.dir(req.files[0]);
        console.dir("#===================================#");
        var originalname = '',
        filename = '',
        mimetype = '',
        size = 0;
    
    if (Array.isArray(files)) {   // 배열에 들어가 있는 경우 (설정에서 1개의 파일도 배열에 넣게 했음)
        console.log("배열에 들어있는 파일 개수 : %d", files.length);
        
        for (var index = 0; index < files.length; index++) {
            originalname = files[index].originalname;
            filename = files[index].filename;
            mimetype = files[index].mimetype;
            size = files[index].size;
        }
        
    } else {   // 배열에 들어가 있지 않은 경우 (현재 설정에서는 해당 없음)
        console.log("파일 개수 : 1 ");
        
        originalname = files[index].originalname;
        filename = files[index].name;
        mimetype = files[index].mimetype;
        size = files[index].size;
    }
    
    console.log('현재 파일 정보 : ' + originalname + ', ' + filename + ', '
            + mimetype + ', ' + size);
    
    // 클라이언트에 응답 전송
    res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
    res.write('<h3>파일 업로드 성공</h3>');
    res.write('<hr/>');
    res.write('<p>원본 파일명 : ' + originalname + ' -> 저장 파일명 : ' + filename + '</p>');
    res.write('<p>MIME TYPE : ' + mimetype + '</p>');
    res.write('<p>파일 크기 : ' + size + '</p>');
    res.end();


    }
    catch(err){
        console.dir(err.stack);
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
    database.init(app,config);
    user.init(database, UserSchema, UserModel);
});



