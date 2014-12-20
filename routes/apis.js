var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
var Busboy = require("busboy");
var inspect = require('util').inspect;
var filewalker = require('filewalker');
var mkdirps = require('mkdirps');
//var DirReader = require('dirreader');
//var async  = require('async');
//var mongoose = require('mongoose');

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