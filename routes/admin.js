var express = require('express');
var router = express.Router();
var fs = require('fs');
//var watch = require('watch'); 
//var mongoose = require('mongoose');

/* GET home page. */
router.get('/manager', function(req, res) {
	res.render('admin/list', { title: 'List system'});
});

module.exports = router;
