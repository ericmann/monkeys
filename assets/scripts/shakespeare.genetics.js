( function( window, undefined ) {
	var Genome = window.Shakespeare.Genome,
		_validChars = [];

	// Define valid characters
	_validChars[0] = String.fromCharCode( 10 );
	_validChars[1] = String.fromCharCode( 13 );
	for ( var i = 2, pos = 32; i < 97; i++, pos++ ) {
		_validChars[ i ] = String.fromCharCode( pos );
	}

	/**
	 *
	 * @param {string}           targetText
	 * @param {object|undefined} settings
	 * @constructor
	 */
	function Genetics ( targetText, settings ) {
		var SELF = this,
			_currentPopulation = null;

		// Set default settings
		settings = settings || {};
		settings.useWorkers = !! settings.useWorkers;
		settings.targetText = settings.targetText || targetText;
		settings.populationSize = settings.populationSize || 1000;
		settings.mutationProbability = settings.mutationProbability || 0.01;
		settings.crossoverProbability = settings.crossoverProbability || 0.87;

		/**
		 * Create the next generation of monkeys based on the fitness of the current generation.
		 *
		 * @param {Function} callback
		 */
		function createNextGeneration( callback ) {
			var i, l = _currentPopulation.length,
				maxFitness = 0,
				sumOfMaxMinusFitness = 0;

			for ( i = 0; i < l; i++ ) {
				maxFitness = Math.max( maxFitness, _currentPopulation[i].fitness );
			}
			maxFitness += 1;

			for ( i = 0; i < l; i++ ) {
				sumOfMaxMinusFitness += ( maxFitness - _currentPopulation[i].fitness );
			}

			// Create children
			var children = [];

			if ( settings.useWorkers ) {
				window.workerpool.setCommonData( {
					settings: settings,
					sum: sumOfMaxMinusFitness,
					maxFitness: maxFitness,
					population: _currentPopulation
				} );

				for ( i = 0, l = settings.populationSize / 2; i < l; i++ ) {
					window.workerpool.do( { job: 'createChildren' } );
				}

				window.workerpool.runQueue( function( twins ) {
					children = children.concat( twins );
				} );

				window.jQuery( window.document ).off( 'menehune.complete' );
				window.jQuery( window.document ).on( 'menehune.complete', function() {
					callback.apply( this, [ children ] );
					children = [];
				} );
			} else {
				for ( i = 0, l = settings.populationSize / 2; i < l; i++ ) {
					var twins = Genetics.createChildren(
						Genetics.findRandomHighQualityParent( sumOfMaxMinusFitness, maxFitness, _currentPopulation ),
						Genetics.findRandomHighQualityParent( sumOfMaxMinusFitness, maxFitness, _currentPopulation ),
						settings
					);

					children.push( twins[0] );
					children.push( twins[1] );
				}

				callback.apply( this, [ children ] )
			}
		}

		/**
		 * Actually move to the next generation
		 *
		 * @param {Function} callback
		 *
		 * @returns {*}
		 */
		SELF.moveNext = function( callback ) {
			// If this is the first iteration, create a random population
			if ( null === _currentPopulation ) {
				_currentPopulation = SELF.createRandomPopulation( settings );
				return callback();
			} else {
				createNextGeneration( function( children ) {
					_currentPopulation = children;
					return callback();
				} );
			}
		};

		SELF.__defineGetter__( 'currentBest', function() {
			return _currentPopulation[0];
		} );
	}

	Genetics.prototype = Genetics;

	Genetics.prototype.__defineGetter__( 'validChars', function() {
		return _validChars;
	} );

	/**
	 * Create a new population at random.
	 *
	 * @param {Object} settings
	 *
	 * @return {Array}
	 */
	Genetics.prototype.createRandomPopulation = function ( settings ) {
		var population = [];

		for ( var i = 0; i < settings.populationSize; i++ ) {
			var member = Genetics.createRandomGenome( settings.targetText );
			population.push( member );
		}

		return population;
	};

	/**
	 * Create a random genome so we can keep processing.
	 *
	 * @param {String} targetText
	 *
	 * @return {Genome}
	 */
	Genetics.prototype.createRandomGenome = function ( targetText ) {
		var genome = '';

		for( var i = 0, l = targetText.length; i < l; i++ ) {
			genome += Genetics.validChars[ Math.floor( Math.random() * Genetics.validChars.length ) ];
		}

		return new Genome( genome, targetText );
	};

	/**
	 * Produce a mutation
	 *
	 * @param {Genome} child
	 * @return {Genome}
	 */
	Genetics.prototype.mutate = function ( child ) {
		var text = child.text;

		text[ Math.floor( Math.random() * text.length ) ] = Genetics.validChars[ Math.floor( Math.random() * Genetics.validChars.length ) ];
		child.text = text;

		return child;
	};

	/**
	 * Create a mutation by crossing over genes at a random point.
	 *
	 * @param {Genome} mother
	 * @param {Genome} father
	 * @param {String} targetText
	 *
	 * @returns {Array}
	 */
	Genetics.prototype.crossover = function ( mother, father, targetText ) {
		var crossoverPoint = Math.floor( Math.random() * mother.text.length ) + 1,
			child1 = new Genome( mother.text.substring( 0, crossoverPoint ) + father.text.substring( crossoverPoint ), targetText ),
			child2 = new Genome( father.text.substring( 0, crossoverPoint ) + mother.text.substring( crossoverPoint ), targetText );

		return [ child1, child2 ];
	};

	/**
	 * Find a high-fitness parent somewhere in the population.
	 *
	 * @param {Number} sumOfMaxMinusFitness
	 * @param {Number} max
	 * @param {Array} population
	 *
	 * @returns {Genome}
	 */
	Genetics.prototype.findRandomHighQualityParent = function ( sumOfMaxMinusFitness, max, population ) {
		var val = Math.random() * sumOfMaxMinusFitness;
		for( var i = 0, l = population.length; i < l; i++ ) {
			var maxMinusFitness = max - population[i].fitness;
			if ( val < maxMinusFitness ) return population[i];
			val -= maxMinusFitness;
		}

		throw 'Not to be, apparently.';
	};

	/**
	 * Create a pair of children based on a given mother and father genome.
	 *
	 * @param {Genome} mother
	 * @param {Genome} father
	 * @param {Object} settings
	 *
	 * @returns {Array}
	 */
	Genetics.prototype.createChildren = function ( mother, father, settings ) {
		var child1, child2;

		if ( Math.random() < settings.crossoverProbability ) {
			var crossed = Genetics.crossover( mother, father, settings.targetText );
			child1 = crossed[0];
			child2 = crossed[1];
		} else {
			child1 = mother;
			child2 = father;
		}

		// Potentially mutate one or both children
		if ( Math.random() < settings.mutationProbability ) child1 = Genetics.mutate( child1 );
		if ( Math.random() < settings.mutationProbability ) child2 = Genetics.mutate( child2 );

		return [ child1, child2 ];
	};

	window.Shakespeare = window.Shakespeare || {};
	window.Shakespeare.Genetics = Genetics;
} )( this );