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

var database;
var UserSchema;
var UserModel;

function connectDB(){
    var databaseUrl = "mongodb://localhost:27017/local";

    console.log('데이터 베이스 연결을 시도합니다.');
    mongoose.Promise = global.Promise;
    mongoose.connect(databaseUrl);
    database = mongoose.connection;

    database.on('error',console.error.bind(console, 'mongoose connection erre'));
    database.on('open',function(){
        console.log('데이터베이스에 연결되었습니다.:'+databaseUrl);

        createUserSchema();

        // UserSchema = mongoose.Schema({
        //     id: {type:String, require:true, unique:true},
        //     password: {type:String, require:true},
        //     name:{type:String, index:'hashed'},
        //     age: {type:Number, 'default':-1},
        //     created_at:{type:Date, index:{unique:false},'default':Date.now},
        //     updated_at:{type:Date, index:{unique:false},'default':Date.now}
        // });

        // UserSchema.static('findById', function(id, callback){
        //     return this.find({id:id},callback);
        // });

        // UserSchema.static('findAll',function(callback){
        //     return this.find({},callback);
        // })


        // console.log('UserSchema 정의함.');

        // UserModel = mongoose.model("users",UserSchema);
        // console.log('UserModel 정의함');
    });

    database.on('disconnected',function(){
        console.log("연결이 끊어졌습니다. 5초 후 다시 연결합니다.");
        setInterval(connectDB, 5000);
    });
}

function createUserSchema(){
    UserSchema = mongoose.Schema({
        id: {type:String, require:true, unique:true, 'default':' '},
        hashed_password: {type:String, require:true, 'default':' '},
        salt :{type: String, require: true}, //password 암호화 key 저장
        name:{type:String, index:'hashed', 'default':' '},
        age: {type:Number, 'default':-1},
        created_at:{type:Date, index:{unique:false},'default':Date.now},
        updated_at:{type:Date, index:{unique:false},'default':Date.now}
    });

    UserSchema.virtual('info').set(function(info){
        var splitted = info.split(' ');
        this.id = splitted[0];
        this.name = splitted[1];
        console.log('virtual info 설정함 : %s, %s', this.id, this.name);
    })
    .get(function(){return this.id+' '+this.name});
    console.log('UserSchema 정의함.');

    UserSchema.virtual('password').set(function(password){
        this._password = password;
        this.salt = this.makeSalt();
        this.hashed_password = this.encryptPassword(password);
        console.log('virtual password 호출됨 : '+this.hashed_password);
    })
    .get(function(){return this._password});

    UserSchema.method('encryptPassword', function(plainText, inSalt){
        if(inSalt){
            return crypto.createHmac('sha1',inSalt).update(plainText).digest('hex');
        }else{
            return crypto.createHmac('sha1', this.salt).update(plainText).digest('hex');
        }
    });

    UserSchema.method('makeSalt',function(){
        return Math.round((new Date().valueOf()*Math.random()))+'';
    });

    UserSchema.method('authenticate', function(plainText, inSalt, hashed_password){
        if(inSalt){
            console.log('authenticate 호출됨: : %s -> %s : %s',plainText,this.encryptPassword(plainText,inSalt),hashed_password);
                return this.encryptPassword(plainText, inSalt) == hashed_password;
        }
        else{
            console.log('authenticate 호출됨: : %s -> %s : %s',plainText,this.encryptPassword(plainText,inSalt),hashed_password);
            return this.encryptPassword(plainText) == hashed_password;
        }
    });

    UserSchema.path('id').validate(function(id){
        return id.length;
    },'id 칼럼의 값이 없습니다.');

    UserSchema.path('name').validate(function(name){
        return name.length;
    },'name 칼럼의 값이 없습니다.');

    UserModel = mongoose.model("users",UserSchema);
    console.log("UserModel 정의함");
}



var authUser = function(database, id, password, callback){
    console.log('authUser 호출됨 : '+id+", "+password);

    UserModel.findById(id, function(err,results){//아이디 확인
        if(err){
            callback(err, null);
            return;
        }
        
        console.log('아이디 [%s]로 사용자 검색 결과',id);
        console.log(results);

        if(results.length > 0){
            console.log("아이디와 일치하는 사용자 찾음");

            var user = new UserModel({id:id});
            var authenticated = user.authenticate(password, results[0]._doc.salt, result[0]._doc.hashed_password);

            if(authenticated){
                console.log('비밀번호 일치함');
                callback(null, results);
            }
            else{
                console.log('비밀번호 일치하지 않음');
                callback(null,null);
            }


            // if(results[0]._doc.password == password){ //비밀번호 확인
            //     console.log("비밀번호 일치함");
            //     callback(null, results);
            // }else{
            //     console.log("비밀번호 일치하지 않음");
            //     callback(null, null);
            // }
        }
        else{
            console.log("아이디와 일치하는 사용자를 찾지 못함.");
            callback(null, null);
        }
    });


    // UserModel.find({"id":id,"password":password},function(err,results){
    //     if(err){
    //         callback(err,null);
    //         return;
    //     }

    //     console.log('아이디 [%s], 비밀번호 [%s]로 사용자 검색 결과',id, password);
    //     console.log(results);

    //     if(results.length>0){
    //         console.log('아이디 [%s], 비밀번호 [%s]가 일치하는 사용자 찾음',id, password);
    //         callback(null,results);
    //     }
    //     else{
    //         console.log("일치하는 사용자를 찾지 못함.");
    //         callback(null,null);
    //     }
    // });


    // var users = database.collection('users');

    // users.find({"id":id, "password":password}).toArray(function(err,docs){

    //     if(err){
    //         callback(err,null);
    //         return;
    //     }

    //     if(docs.length>0){
    //         console.log('아이디 [%s], 비밀번호 [%s]가 일치하는 사용자 찾음',id, password);
    //         callback(null,docs);
    //     }
    //     else{
    //         console.log("일치하는 사용자를 찾지 못함.");
    //         callback(null,null);
    //     }
    // });
}

var addUser = function(database, id, password, name, callback){
    console.log('addUser 호출됨 : '+id+", "+password+", "+name);

    var user = new UserModel({"id":id,"password":password,"name":name});

    user.save(function(err){
        if(err){
            callback(err,null);
            return;
        }
        console.log("사용자 데이터 추가함");
        callback(null,user);
    });


    // var users = database.collection('users');

    // users.insertMany([{"id":id,"password":password,"name":name}],function(err,result){
    //     if(err){
    //         callback(err,null);
    //         return;
    //     }

    //     if(result.insertedCount > 0){
    //         console.log("사용자 레코드 추가됨 : "+result.insertedCount);
    //     }
    //     else{
    //         console.log("추가된 레코드가 없음");
    //     }

    //     callback(null,result);
    // });
}


var app = express();

app.set('port',process.env.PORT || 3000); //포트설정

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

var router = express.Router();

router.route("/process/listuser").post(function(req,res){
    console.log("/process/listuser 호출됨.");

    if(database){
        UserModel.findAll(function(err,results){
            if(err){
                console.error("사용자 리스트 조회 중 오류 발생: "+err.stack);

                res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
                res.write('<h2>사용자 리스트 조회 중 오류 발생</h2>');
                res.write('<p>'+err.stack+'</p>');
                res.end();

                return;
            }

            if(results){
                console.dir(results);

                res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
                res.write('<h2>사용자 리스트</h2>');
                res.write('<div><ul>');

                for(var i = 0; i < results.length; i++){
                    var curId = results[i]._doc.id;
                    var curName = results[i]._doc.name;
                    res.write('     <li>#'+i+' : '+curId+", "+curName+'</li>');
                }

                res.write('</ul></div>');
                res.end();
            }
            else{
                res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
                res.write('<h2>사용자 리스트 조회 실패</h2>');
                res.end();
            }
        });
    }
    else{
        res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
        res.write('<h2>데이터베이스 연결 실패</h2>');
        res.end();
    }
})

router.route('/process/login').post(function(req,res){
    console.log('/process/login 호출됨');

    var paramId = req.body.id||req.query.id;
    var paramPassword = req.body.password||req.query.password;

    // if(req.session.user){
    //     console.log('이미 로그인 되어 상품 페이지로 이동합니다.');
    //     res.redirect('/public/product.html');
    // }else{
    //     req.session.user = {
    //         id: paramId,
    //         name: '소녀시대',
    //         authorized: true
    //     }
    // }

    if (database) {
		authUser(database, paramId, paramPassword, function(err, docs) {
			if (err) {throw err;}
			
            // 조회된 레코드가 있으면 성공 응답 전송
			if (docs) {
				console.dir(docs);

                // 조회 결과에서 사용자 이름 확인
				var username = docs[0].name;
				
				res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
				res.write('<h1>로그인 성공</h1>');
				res.write('<div><p>사용자 아이디 : ' + paramId + '</p></div>');
				res.write('<div><p>사용자 이름 : ' + username + '</p></div>');
				res.write("<br><br><a href='/public/login2.html'>다시 로그인하기</a>");
				res.end();
			
			} else {  // 조회된 레코드가 없는 경우 실패 응답 전송
				res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
				res.write('<h1>로그인  실패</h1>');
				res.write('<div><p>아이디와 패스워드를 다시 확인하십시오.</p></div>');
				res.write("<br><br><a href='/public/login2.html'>다시 로그인하기</a>");
				res.end();
			}
		});
	} else {  // 데이터베이스 객체가 초기화되지 않은 경우 실패 응답 전송
		res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
		res.write('<h2>데이터베이스 연결 실패</h2>');
		res.write('<div><p>데이터베이스에 연결하지 못했습니다.</p></div>');
		res.end();
	}


    // res.writeHead('200',{'Content-Type':'text/html;charset=utf8'});
    // res.write('<h1>express에서 응답한 결과</h1>');
    // res.write('<h1>express에서 응답 '+paramId+' </h1>');
    // res.write('<h1>express에서 응답 '+paramPassword+' </h1>');
    // res.write("<br><br><a href='/process/product'>상품 페이지로 돌아가기</a>");
    // res.end();
    
});


router.route('/process/logout').get(function(req,res){
    console.log('/process/logout 호출됨');

    if(req.session.user){
        req.session.destroy(function(err){
            if(err) {throw err;}
            console.log("logout 완료");
            res.redirect('/public/login2.html');
        });
    }
    else{
        console.log("아직 로그인 안된 상태");
        res.redirect('/public/login2.html');
    }
});

router.route('/process/adduser').post(function(req, res) {
	console.log('/process/adduser 호출됨.');

    var paramId = req.body.id || req.query.id;
    var paramPassword = req.body.password || req.query.password;
    var paramName = req.body.name || req.query.name;
	
    console.log('요청 파라미터 : ' + paramId + ', ' + paramPassword + ', ' + paramName);
    
    // 데이터베이스 객체가 초기화된 경우, addUser 함수 호출하여 사용자 추가
	if (database) {
		addUser(database, paramId, paramPassword, paramName, function(err, result) {
			if (err) {throw err;}
			
            // 결과 객체 확인하여 추가된 데이터 있으면 성공 응답 전송
            if (result) {
				console.dir(result);
 
				res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
				res.write('<h2>사용자 추가 성공</h2>');
				res.end();
			} else {  // 결과 객체가 없으면 실패 응답 전송
				res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
				res.write('<h2>사용자 추가  실패</h2>');
				res.end();
			}
		});
	} else {  // 데이터베이스 객체가 초기화되지 않은 경우 실패 응답 전송
		res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
		res.write('<h2>데이터베이스 연결 실패</h2>');
		res.end();
	}
	
});


// router.route('/process/users/:id').get(function(req,res){
//     console.log('/porcess/users/:id 처리함')

//     var paramId = req.params.id;

//     res.writeHead('200',{'Content-Type':'text/html;charset=utf8'});
//     res.write('<h1>express에서 응답한 결과</h1>');
//     res.write('<h1>paramId : '+paramId+' </h1>');
//     res.end();
// });

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
        res.redirect('/public/product.html');
    }else{
        res.redirect('/public/login2.html');
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

    connectDB();
});



