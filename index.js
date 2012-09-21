/*jslint node: true, stupid: true */
/**
 *	Module autoloader, chargement automatiques de composants avec cache.
 *	Chaque appel génère un nouvel autoloader.
 *
 *	@returns autoloader ou Error
 */
module.exports = function (options) {
	'use strict';

	/**
	 *	Valeures par défaut.
	 */
	options.imports			=	options.imports			|| {};
	options.composants_path	=	options.composants_path	|| '';

	var
		/**
		 *	@property cache Cache pour les composants déjà chargés.
		 */
		cache	= {},

		/**
		 *	@property path Chemin des fichiers des composants.
		 */
		path	= '',

		/**
		 *	@property logger Instance du logger.
		 */
		logger = options.logger,

		/**
		 *	Options à importer pour chaque composants (passé en paramètre aux composants).
		 */
		imports = options.imports,

		/**
		 *	Définit le chemin de stockage des composants.
		 *
		 *	@param composants_path Chemin du dossier des composants
		 *	@returns Error si échec, null sinon
		 */
		setPath = function (composants_path) {
			var fs = require('fs'),
				stat = null,
				error = false;

			try {
				stat = fs.statSync(composants_path);
			} catch (err) {
				error = true;
			}

			if (error === true || !stat.isDirectory()) {
				logger.fatal("Impossible d'ouvrir le dossier des composants (%s) ", composants_path);
				return new Error({code: 'COMPOSANT_PATH_NOT_FOUND'});
			}

			if (composants_path.lastIndexOf('/') !== composants_path.length - 1) {
				composants_path = composants_path + '/';
			}

			path = composants_path;
			return null;
		},


		/**
		 *	Charge un composant depuis le disque et le retourne.
		 *
		 *	@param file Fichier du composant a charger
		 *	@returns Le composant
		 */
		fetch = function (file) {
			var composant = {};

			logger.debug('Chargement du composant %s', file);

			try {
				composant = require(path + file)(imports);
			} catch (err) {
				if (err.code === 'MODULE_NOT_FOUND') {
					logger.warn('Composant %s non trouvé (%s)', file, path + file);
				} else {
					logger.error({err: err}, 'Erreur inconnue au chargement du composant %s (%s)', file, path + file);
				}

				return new Error({code: 'COMPOSANT_NOT_FOUND'});
			}

			return composant;
		},

		/**
		 *	Renvoie un objet modèle en fonction de son nom.
		 *
		 *	@param name Nom du modèle à retourner
		 *	@returns Le modèle
		 */
		get = function (name) {
			if (cache[name] === undefined) {
				cache[name] = fetch(name);
			}

			return cache[name];
		},

		/**
		 *	Précharge tous les composants trouvés.
		 *
		 *	@param callback Callback de fin de chargement
		 */
		loadFiles = function (callback) {
			var walker = require('walk').walk(path);

			walker.on('file', function (root, fileStats, next) {
				root = root.replace(path, '');

				if (root !== '') {
					root = root + '/';
				}

				if (fileStats.name.match(/\.js$/)) {
					get(root + fileStats.name);
				}

				next();
			});

			walker.on('end', callback);
		},

		/**
		 *	Définition du chemin d'accès aux fichiers des composants.
		 */
		result = setPath(options.composants_path);

	/**
	 *	Exposition de la partie publique.
	 *	Ou retour de l'erreur si il y a.
	 */
	return result || {
		get:		get,
		loadFiles:	loadFiles
	};
};
