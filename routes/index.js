var express = require('express');
var router = express.Router();
//var mongoose = require('mongoose');

/* GET home page. */
router.get('/', function(req, res) {
	res.render( 'index', {title : 'NAS system'});
});

module.exports = router;
