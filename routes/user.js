var database;
var UserSchema;
var UserModel;

var init = function(db, schema, model){
    console.log('init 호출됨');

    database = db;
    UserSchema = schema;
    UserModel = model;
}


var login = function(req,res){
    console.log('/process/login 호출됨');

    var paramId = req.body.id||req.query.id;
    var paramPassword = req.body.password||req.query.password;

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
};

var adduser = function(req, res) {
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
	
};

var logout = function(req,res){
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
};

var listuser = function(req,res){
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
};

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
            var authenticated = user.authenticate(password, results[0]._doc.salt, results[0]._doc.hashed_password);

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

module.exports.init = init;
module.exports.listuser = listuser;
module.exports.logout = logout;
module.exports.adduser = adduser;
module.exports.login = login;