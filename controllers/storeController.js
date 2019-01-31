const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOption = {
	storage: multer.memoryStorage(),
	fileFilter: function(req, file, next){
		const isPhoto = file.mimetype.startsWith('image/');
		if(isPhoto){
			next(null, true);
		}else {
			next({message: `That file type isn't allowed.`}, false);
		}
	}
}

// middleware to handle the actual upload of the photo
exports.upload = multer(multerOption).single('photo');
exports.resize = async (req, res, next) => {
	// if there is no new file to resize
	if(!req.file){
		next(); // skip to the next middleware
	}else {
		const extension = req.file.mimetype.split('/')[1];
		req.body.photo = `${uuid.v4()}.${extension}`;

		// now we resize the photo
		const photo = await jimp.read(req.file.buffer);
		await photo.resize(800, jimp.AUTO);
		await photo.write(`./public/uploads/${req.body.photo}`);

		// once we have written the photo to our filesystem, keep going
		next();
	}
}

exports.homePage = (req, res) => {
    res.send('Welcome to the homepage!');
}

exports.addStore = (req, res) => {
    res.render('editStore', {title: 'Add Store'});
}

exports.createStore = async (req, res) => {
    const store = await (new Store(req.body)).save();
    req.flash('success', `Successfully created ${store.name}. Care to leave a review?`);
    res.redirect(`/store/${store.slug}`);
}

exports.getStores = async (req, res) => {
	// query the database to get all the stores
	const stores = await Store.find();
	console.log(stores);
	res.render('stores', {title: 'Stores', stores: stores});
}

exports.editStore = async (req, res) => {
	// find the store given the id
	const store = await Store.findOne({_id: req.params.id});
	//confirm the logged on user is the owner of the store
	//render form to user so they can update their store
	res.render('editStore', {title: "Edit Store", store});
}

exports.updateStore = async (req, res) => {
	// set location data to be point
	req.body.location.type = 'Point';

	// find and update store
	const store = await Store.findOneAndUpdate({_id: req.params.id}, req.body, {
		new: true, // return the new (updated) store instead of the old store
		runValidators: true
	}).exec();

	req.flash('success', `Successfully updated <strong>${store.name}</strong>. <a href='/store/${store.slug}'>View store</a>`);
	// redirect them to the store and tell them it was successful
	res.redirect(`/stores/${store._id}/edit`);
}

exports.getStoreBySlug = async (req, res, next) => {
	const store = await Store.findOne({ slug: req.params.slug });
	
	if(!store) return next();
	res.render('store', {title: store.name, store})
}

exports.getStoresByTag = async (req, res) => {
	const tag = req.params.tag
	const tagQuery = tag || {$exists: true};
	const tagsPromise = Store.getTagsList();
	const storesPromise = Store.find({tags: tagQuery});
	const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
	res.render('tags', {title: 'Tags', tags, stores, tag});
}