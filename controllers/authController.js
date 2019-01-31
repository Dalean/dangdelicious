const passport = require('passport');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const crypto = require('crypto');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

exports.login = passport.authenticate('local', {
	failureRedirect: '/login',
	failureFlash: 'Faled login!',
	successRedirect: '/',
	successFlash: 'You are now logged in'
});

exports.logout = (req, res) => {
	req.logout();
	req.flash('success', 'You are now logged out');
	res.redirect('/');
}

exports.isLoggedIn = (req, res, next) => {
	// first check if there is a logged in user
	if(req.isAuthenticated()) {
		next(); 
		return;
	}

	req.flash('error', 'Oooops! You must be logged in first');
	res.redirect('/login');
}

exports.forgot =  async (req, res) => {
	// 1. see if the user with the email exists in the database
	const user = await User.findOne({email: req.body.email});
	if(!user){
		req.flash('error', 'No user with that email address was found!');
		return res.redirect('/login');
	}

	// 2. set the reset token and expiry on their account
	user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
	user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
	await user.save();

	// Send them an email with the token
	const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
	await mail.send({
		user,
		subject: 'Password Reset',
		resetURL,
		filename: 'password-reset'
	});
	req.flash('success', `You have been emailed a password reset link`);

	// 4. redirect to the login page
	res.redirect('/login');
}

exports.reset = async (req, res) => {
	const user = await User.findOne({
		resetPasswordToken: req.params.token,
		resetPasswordExpires: { $gt: Date.now() }
	});
	if(!user){
		req.flash('error', 'Password reset is invalid or has expired');
		return res.redirect('/login');
	}
	// if there is a user, show the reset password form
	res.render('reset', {title: 'Reset your password'});
}

exports.confirmedPasswords = (req, res, next) => {
	if(req.body.password === req.body['password-confirm']){
		return next();
	}
	req.flash('error', 'Passwords do not match');
	res.redirect('back');
}

exports.update = async (req, res) => {
	const user = await User.findOne({
		resetPasswordToken: req.params.token,
		resetPasswordExpires: { $gt: Date.now() }
	});
	if(!user){
		req.flash('error', 'Password reset is invalid or has expired');
		return res.redirect('/login');
	}

	const setPassword = promisify(user.setPassword, user);
	await setPassword(req.body.password);
	user.resetPasswordToken = undefined;
	user.resetPasswordExpires = undefined;

	const updatedUser = await user.save();
	await req.login(updatedUser);
	req.flash('success', 'Your password has been reset');
	res.redirect('/');
}