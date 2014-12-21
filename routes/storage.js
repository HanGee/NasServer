var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
var Busboy = require("busboy");
var inspect = require('util').inspect;
var filewalker = require('filewalker');
var mkdirps = require('mkdirps');
var async  = require('async');
var fse = require('fs-extra')
//var mongoose = require('mongoose');

/*
  originalUrl: '/storage/public/fred/123456.jpg',
  _parsedUrl:
   { protocol: null,
     slashes: null,
     auth: null,
     host: null,
     port: null,
     hostname: null,
     hash: null,
     search: null,
     query: null,
     pathname: '/public/fred/123456.jpg',
     path: '/public/fred/123456.jpg',
     href: '/public/fred/123456.jpg' },
  params: { '0': 'public/fred', '1': '123456.jpg', dir: undefined },
  originalUrl: '/storage/public/fred',
  _parsedUrl:
   { protocol: null,
     slashes: null,
     auth: null,
     host: null,
     port: null,
     hostname: null,
     hash: null,
     search: null,
     query: null,
     pathname: '/public/fred',
     path: '/public/fred',
     href: '/public/fred' },
  params: { '0': 'public', '1': 'fred', dir: undefined },
    originalUrl: '/storage/public',
  _parsedUrl:
   { protocol: null,
     slashes: null,
     auth: null,
     host: null,
     port: null,
     hostname: null,
     hash: null,
     search: null,
     query: null,
     pathname: '/public',
     path: '/public',
     href: '/public' },
  params: { '0': undefined, '1': undefined, dir: 'public' },
*/

function filewalkerFunc(Directory, callback) {
	var DirList =  {};
	var DirListIndex = 0;
	console.log('Directory: ' + Directory);

	filewalker(Directory)
		.on('dir', function(Dir) {
			DirList[DirListIndex] = {
				"type": 'Directory',
				"path": Dir
			};
			DirListIndex += 1;
		})
		.on('file', function(File, info) {
			DirList[DirListIndex] = {
				"type": 'File',
				"path": File,
				"size": info.size
			};
			DirListIndex += 1;
		})
		.on('error', function(err) {
			if (callback)
				return callback(err);
			console.error(err);
		})
		.on('done', function() {
			// 完成遍歷，印出統計訊息
			//console.log('%d dirs, %d files, %d bytes', this.dirs, this.files, this.bytes);
			//console.log(DirList);
			if (callback) {
				return callback(null, DirList);
			}
		})
		.walk();
}

function DirlistFunc(Directory, callback) {
	var DirList =  [];
	var DirListIndex = 0;
	//console.log('Directory: ' + Directory);
	
	fs.readdir(Directory, function(err, files) {
		if (err) {
			if (callback)
				return callback(err);
			console.log(err);
		}

		async.eachSeries( files, function( index, walker ) {
				fs.stat(path.join(Directory, index), function (err, stats) {
					if (err) {
						if (callback)
							return callback(err);
						console.log(err);
					}
					else {
						if(stats.isDirectory()) {
							//console.log('Directory: ' + index);
							DirList[DirListIndex] = {
								"type": 'Directory',
								"path": index
							};
							DirListIndex += 1;	
							walker(); 							
						} else {
							//console.log('File: ' + index);
							DirList[DirListIndex] = {
								"type": 'File',
								"path": index,
								"size": stats.size
							};
							DirListIndex += 1;
							walker(); 
						}
					}
				});
			}, 
			function(err) {
				if( err ) {
					console.log(err);
				}
				if (callback) {
					//console.log(DirList);
					return callback(null, DirList);
				};					
			}
		);	
	});
}

router.get(['/:dir', '/*/:dir'], function(req, res) {
	//console.log(req);
	if(req.params[0]) {
		dir = req.params[0];
		fd = req.params[1];
		//console.log('[params]Get');
		//console.log('[params]dir: ' + dir);
		//console.log('[params]req.params[0]: ' + req.params[0]);
		//console.log('[params]req.params[1]: ' + req.params[1]);
		fs.stat(path.join(dir, fd), function (err, stats) {
			if (err) {
				console.log(err);
				res.send(err);
			}
			else {
				if(stats.isDirectory()) {
					//console.log('stats: ' + JSON.stringify(stats));
					//console.log('[Dir]Path: ' + path.join(dir, fd));
					DirlistFunc(path.join(dir, fd), function(err, DirList){
						if (err) {
							console.log(err);
							
							res.json({
								state: 'Fail',
								DirList: DirList
							});
						}
						res.json({
							state: 'Success',
							DirList: DirList
						});
					});
					
				} else {
					//console.log('stats: ' + JSON.stringify(stats));
					//console.log('[File]Path: ' + path.join(dir, fd));
					res.sendfile(path.join(dir, fd))
					//res.send('[File]Path: ' + path.join(dir, fd));
				}
			}				
			
		});	
	}
	else {
		//console.log('Get');
		dir = req.params.dir;
		fs.stat(dir, function (err, stats) {
			if (err) {
				console.log(err);
				res.send(err);
			}
			else {
				if(stats.isDirectory()) {
					//console.log('stats: ' + JSON.stringify(stats));
					//console.log('Path: ' + dir );
					DirlistFunc(dir, function(err, DirList){
						if (err) {
							console.log(err);
							
							res.json({
								state: 'Fail',
								DirList: DirList
							});
						}
						res.json({
							state: 'Success',
							DirList: DirList
						});
					});
				} else {
					res.send('No Permission.');
				}
			}
		});			
	}
	
});

router.get('/', function(req, res) {
	//console.log(req);
	res.send('FolderSize');
});


router.post(['/:dir', '/*/:dir'], function(req, res) {
	
	function _savefileFunc(Directory, filename, callback) {
		var busboy = new Busboy({	
			headers: req.headers,
			limits: {
				'fileSize': 1024 * 1024 * 50, // 50MB
				'files': 10 // MAX FILES
			}
		});
		
		busboy.on("file", function(fieldname, file, filename, encoding, mimetype) {
			if ( filename == ''){
				//console.log('No upload file.');
			}
			else{		
				var saveTo = path.join(Directory, filename);
				file.pipe(fs.createWriteStream(saveTo));
			}
		});

		busboy.on("finish", function() {
			if (callback) {
				return callback(null, 'Done');
			}
		});

		req.pipe(busboy);	
	};

	if(req.params[0]) {
		dir = req.params[0];
		file = req.params[1];

		if (req.headers['content-length'] > 1000){ // 判斷使用者是否有夾帶圖檔
			mkdirps(dir, function (err) {
				if (err) {
					return console.error(err);
				}
				_savefileFunc(dir, file, function (err) {
					if (err) {
						console.log(err);
						
						res.json({
							state: 'Fail'
						});
					}
					res.json({
						state: 'Success'
					});
				});
			});
		}
		else{ // 沒有夾帶檔案直接回首頁
			mkdirps(path.join(dir, file), function (err) {
				if (err) {
					return console.error(err);
				}
				console.log(path.join(dir, file) + ' is created!');
			});
		}	
	}
	else {
		//console.log('Post');
		dir = req.params.dir;
		mkdirps(dir, function (err) {
			if (err) {
				return console.error(err);
			}
			console.log(dir + ' is created!');
		});
	}
});

router.post('/', function(req, res) {
	res.send('No Permission.');
});

router.put(['/:dir', '/*/:dir'], function(req, res) {
	res.send('put');
});

router.put('/', function(req, res) {
	res.send('No Permission.');
});

router.delete(['/:dir', '/*/:dir'], function(req, res) {
	if(req.params[0]) {
		dir = req.params[0];
		fd = req.params[1];
		fs.stat(path.join(dir, fd), function (err, stats) {
			if (err) {
				console.log(err);
				res.send(err);
			}
			else {
				if(stats.isDirectory()) {
					res.json({
						state: 'Fail',
						Result: 'Can not delete whole directory.'
					});
					
				} else {
					fse.remove(path.join(dir, fd), function(err) {
						if (err) {
							res.json({
								state: 'Fail',
								Result: 'Can not delete the file.'
							});
						}
						res.json({
							state: 'Success'
						});
					});
				}
			}
		});	
	}
	else {
		//console.log('delete');
		dir = req.params.dir;
		fs.stat(dir, function (err, stats) {
			if (err) {
				console.log(err);
				res.send(err);
			}
			else {
				if(stats.isDirectory()) {
					res.json({
						state: 'Fail',
						Result: 'Can not delete whole directory.'
					});
				} else {
					res.json({
						state: 'Fail',
						Result: 'No Permission.'
					});
				}
			}
		});			
	}
});

router.delete('/', function(req, res) {
	res.send('No Permission.');
});

router.all('/*', function(req, res) {
	res.send('No matching.');
});

router.get('/folder', function(req, res) {
	var DirList =  {};
	var DirListIndex = 0;

	// 是否該移到Server初始化的時候建立?
	fs.exists('public/upload/', function(exists) {
		if(!exists) {
			mkdirps('public/upload/', function (err) {
				if (err) {
					return console.error(err);
				}
				console.log('upload created!');
			});
		}
	});	

	filewalker('public/upload/')
		.on('dir', function(Dir) {
			DirList[DirListIndex] = {
				"type": 'Directory',
				"path": Dir
			};
			DirListIndex += 1;
		})
		.on('file', function(File, info) {
			DirList[DirListIndex] = {
				"type": 'File',
				"path": File,
				"size": info.size
			};
			DirListIndex += 1;
		})
		.on('error', function(err) {
			console.error(err);
		})
		.on('done', function() {
			res.send(DirList);
			// 完成遍歷，印出統計訊息
			//console.log('%d dirs, %d files, %d bytes', this.dirs, this.files, this.bytes);
		})
		.walk();
});


router.post('/upload/', function(req, res) {
	var ImagePath = '/upload/';
	var Imagename = '';
	var ImageCreateDate = Date.now();
	
	if (req.headers['content-length'] > 1000){ // 判斷使用者是否有夾帶圖檔
		var busboy = new Busboy({	
			headers: req.headers,
			limits: {
				'fileSize': 1024 * 1024 * 50, // 50MB
				'files': 10 // MAX FILES
			}
		});
		busboy.on("file", function(fieldname, file, filename, encoding, mimetype) {
			if ( filename == ''){
				//console.log('No upload file.');
			}
			else{		
				var saveTo = path.join(__dirname + '/../public/upload/', filename);
				Imagename = filename;
				file.pipe(fs.createWriteStream(saveTo));
			}
			
		});

		busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated) {
			if( fieldname == 'textfield' && inspect(val) != '送出'){
				ImageCreateDate = Date.now();
			}
		});	

		busboy.on("finish", function() {
			setTimeout(function() {
				res.redirect('/');	
			}, 1000);
		});

		req.pipe(busboy);	
	}
	else{ // 沒有夾帶檔案直接回首頁
		res.redirect('/');
	}
});

module.exports = router;